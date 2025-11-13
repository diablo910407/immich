import { Injectable } from '@nestjs/common';
import { AssetVisibility, Permission } from 'src/enum';
import { AuthDto } from 'src/dtos/auth.dto';
import { BaseService } from 'src/services/base.service';

@Injectable()
export class OrganizeService extends BaseService {
  async getUnassignedAssets(auth: AuthDto) {
    const assets = await this.assetRepository.getUnassignedAssets(auth.user.id);
    this.logger.debug(`Organize: found ${assets.length} unassigned assets`);

    const ids = assets.map((a) => a.id);
    const rows = await this.searchRepository.getEmbeddingsByAssetIds(ids);
    const embeddingMap = new Map<string, number[]>();
    for (const row of rows) {
      const str = String((row as any).embedding ?? '');
      if (!str) continue;
      const cleaned = str.replace(/[\[\]\{\}]/g, '');
      const parts = cleaned.split(',').map((x) => parseFloat(x));
      if (parts.length > 0 && parts.every((v) => Number.isFinite(v))) {
        embeddingMap.set((row as any).assetId, parts);
      }
    }

    const withVec: typeof assets = [];
    const withoutVec: typeof assets = [];
    for (const a of assets) {
      if (embeddingMap.has(a.id)) withVec.push(a);
      else withoutVec.push(a);
    }

    if (withVec.length <= 1) {
      return assets.map((a) => ({ id: a.id, type: a.type, originalFileName: a.originalFileName, originalPath: a.originalPath }));
    }

    const vecs = withVec.map((a) => embeddingMap.get(a.id)!);
    const dim = vecs[0].length;
    const centroid = new Array(dim).fill(0);
    for (const v of vecs) {
      for (let i = 0; i < dim; i++) centroid[i] += v[i];
    }
    for (let i = 0; i < dim; i++) centroid[i] /= vecs.length;

    const dist2 = (a: number[], b: number[]) => {
      let s = 0;
      for (let i = 0; i < dim; i++) {
        const d = a[i] - b[i];
        s += d * d;
      }
      return s;
    };

    const thresholdN = 1500;
    let ordered: typeof withVec = [];
    if (withVec.length > thresholdN) {
      const projections = withVec.map((a) => {
        const v = embeddingMap.get(a.id)!;
        let dot = 0;
        for (let i = 0; i < dim; i++) dot += v[i] * centroid[i];
        return { a, dot };
      });
      projections.sort((x, y) => y.dot - x.dot);
      ordered = projections.map((p) => p.a);
      this.logger.debug(`Organize: ordered ${withVec.length} assets by centroid projection`);
    } else {
      let startIdx = 0;
      let best = Number.POSITIVE_INFINITY;
      for (let i = 0; i < withVec.length; i++) {
        const v = embeddingMap.get(withVec[i].id)!;
        const d = dist2(v, centroid);
        if (d < best) {
          best = d;
          startIdx = i;
        }
      }
      const visited = new Array(withVec.length).fill(false);
      visited[startIdx] = true;
      ordered.push(withVec[startIdx]);
      let last = embeddingMap.get(withVec[startIdx].id)!;
      for (let step = 1; step < withVec.length; step++) {
        let nextIdx = -1;
        let nextBest = Number.POSITIVE_INFINITY;
        for (let i = 0; i < withVec.length; i++) {
          if (visited[i]) continue;
          const v = embeddingMap.get(withVec[i].id)!;
          const d = dist2(v, last);
          if (d < nextBest) {
            nextBest = d;
            nextIdx = i;
          }
        }
        if (nextIdx === -1) break;
        visited[nextIdx] = true;
        ordered.push(withVec[nextIdx]);
        last = embeddingMap.get(withVec[nextIdx].id)!;
      }
      this.logger.debug(`Organize: ordered ${withVec.length} assets by nearest-neighbor chaining`);
    }

    const final = [...ordered, ...withoutVec].map((a) => ({ id: a.id, type: a.type, originalFileName: a.originalFileName, originalPath: a.originalPath }));
    return final;
  }
}
