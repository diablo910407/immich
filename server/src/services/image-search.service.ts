import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as fsp } from 'node:fs';
import { dirname } from 'node:path';
import { SystemConfig } from 'src/config';
import { AuthDto } from 'src/dtos/auth.dto';
import { ImageSearchAssetDto, ImageSearchRequestDto, ImageSearchResponseDto, ImageSearchResultDto } from 'src/dtos/image-search.dto';
import { StorageFolder } from 'src/enum';
import { BaseService } from 'src/services/base.service';
import { StorageCore } from 'src/cores/storage.core';
import { getMyPartnerIds } from 'src/utils/asset.util';
import type { MapAsset } from 'src/dtos/asset-response.dto';
import type { FaceSearchResult } from 'src/repositories/search.repository';

@Injectable()
export class ImageSearchService extends BaseService {
  // 继承 BaseService 注入所有仓库，无需自定义构造函数

  /**
   * 以图搜图入口
   * - face：做人脸检测并用每个脸的 embedding 搜索相似人脸
   * - similar：用整图 CLIP embedding 搜索相似内容
   */
  async searchByImage(auth: AuthDto, dto: ImageSearchRequestDto, fileBuffer: Buffer, originalName: string): Promise<ImageSearchResponseDto> {
    const { machineLearning } = await this.getConfig({ withCache: false });
    const partnerIds = await getMyPartnerIds({
      userId: auth.user.id,
      repository: this.partnerRepository,
      timelineEnabled: true,
    });
    const userIds = [auth.user.id, ...partnerIds];
    const maxResults = Math.max(1, dto.maxResults ?? 20);

    // 将上传图片写入用户 Upload 目录的临时文件，避免硬编码路径
    const uploadDir = StorageCore.getFolderLocation(StorageFolder.Upload, auth.user.id);
    const tempPath = StorageCore.getTempPathInDir(uploadDir);
    await fsp.mkdir(dirname(tempPath), { recursive: true });
    await fsp.writeFile(tempPath, fileBuffer);
    this.logger.log(
      `[ImageSearchService] 请求开始: user=${auth.user.id}, mode=${dto.mode}, name=${originalName}, maxResults=${maxResults}, temp=${tempPath}`,
    );
    // 关键配置与搜索范围日志
    try {
      this.logger.log(
        `[ImageSearchService] ML配置: enabled=${machineLearning.enabled}, clip.enabled=${machineLearning.clip.enabled}, face.enabled=${machineLearning.facialRecognition.enabled ?? true}, clip.model=${machineLearning.clip.modelName}`,
      );
      const uidSample = userIds.slice(0, 3).join(', ');
      this.logger.log(
        `[ImageSearchService] 参与检索的用户ID数量=${userIds.length}, sample=[${uidSample}${userIds.length > 3 ? ', ...' : ''}]`,
      );
    } catch (e) {
      this.logger.warn('[ImageSearchService] 打印配置/用户范围失败', e as any);
    }

    try {
      if (dto.mode === 'face') {
        this.logger.log('[ImageSearchService] 进入人脸模式');
        const resp = await this.searchByFace(auth, tempPath, machineLearning, userIds, maxResults);
        this.logger.log(`[ImageSearchService] 人脸模式完成，结果数: ${resp.results.length}`);
        return resp;
      } else if (dto.mode === 'similar') {
        this.logger.log('[ImageSearchService] 进入相似内容模式');
        const resp = await this.searchByClip(auth, tempPath, machineLearning, userIds, maxResults);
        this.logger.log(`[ImageSearchService] 相似模式完成，结果数: ${resp.results.length}`);
        return resp;
      } else {
        throw new BadRequestException('Invalid search mode');
      }
    } finally {
      // 清理临时文件
      fsp
        .unlink(tempPath)
        .then(() => this.logger.debug(`[ImageSearchService] 已清理临时文件: ${tempPath}`))
        .catch((err) => this.logger.warn(`清理临时文件失败: ${tempPath}`, err));
    }
  }

  private async searchByFace(
    auth: AuthDto,
    imagePath: string,
    machineLearning: SystemConfig['machineLearning'],
    userIds: string[],
    maxResults: number,
  ): Promise<ImageSearchResponseDto> {
    // 进行人脸检测（带阈值回退）
    this.logger.log(`开始人脸检测: ${imagePath}`);
    this.logger.log(
      `[Face] 配置: model=${machineLearning.facialRecognition.modelName}, minScore=${machineLearning.facialRecognition.minScore}, maxDistance=${machineLearning.facialRecognition.maxDistance}, userIds=${userIds.length}, maxResults=${maxResults}`,
    );
    const { modelName, minScore, maxDistance } = machineLearning.facialRecognition;
    const detection = await this.detectFacesWithFallback(imagePath, modelName, minScore);
    this.logger.log(
      `检测到人脸数量: ${detection.faces.length}（使用minScore=${detection.usedMinScore}），尺寸=${detection.imageWidth}x${detection.imageHeight}`,
    );

    // 打印前最多 5 个检测结果的 bbox/score 与嵌入信息
    for (let i = 0; i < Math.min(5, detection.faces.length); i++) {
      const f = detection.faces[i];
      this.logger.log(
        `[人脸] 检测#${i}: bbox=(${f.boundingBox.x1},${f.boundingBox.y1})-(${f.boundingBox.x2},${f.boundingBox.y2}), score=${f.score.toFixed(
          3,
        )}, embed=${this.getEmbeddingInfo(f.embedding)}`,
      );
    }

    const results: ImageSearchResultDto[] = [];

    for (const face of detection.faces) {
      // 用每个脸的向量搜索相似人脸
      this.logger.log(
        `[人脸] 开始相似检索: embed=${this.getEmbeddingInfo(face.embedding)}, maxDistance=${maxDistance}, numResults=${maxResults}, userIds=${userIds.length}`,
      );
      const items: FaceSearchResult[] = await this.searchFacesWithFallback({
        userIds,
        embedding: face.embedding,
        numResults: maxResults,
        baseMaxDistance: maxDistance,
      });
      this.logger.log(`[人脸] 相似检索返回数量: ${items.length}`);
      if (items.length > 0) {
        const distances = items.map((i) => i.distance).slice(0, Math.min(5, items.length));
        this.logger.log(`[人脸] 距离样本: ${distances.map((d) => d.toFixed(4)).join(', ')}`);
      }

      // 取回 assetId / person 信息（searchFaces 返回 faceId/personId，需要再查一次）
      const faceIds = items.map((i: FaceSearchResult) => i.id);
      const assets: ImageSearchAssetDto[] = [];
      let personName: string | undefined;

      for (const id of faceIds) {
        const af = await this.personRepository.getFaceById(id);
        assets.push({ id: af.assetId, fileName: undefined });
        if (!personName && af.person?.name) {
          personName = af.person.name;
        }
        if (assets.length <= 5) {
          this.logger.log(`[人脸] 映射faceId=${id} -> assetId=${af.assetId}, person=${af.person?.name ?? '-'}`);
        }
      }

      // 补充文件名信息（批量查询）
      const assetIds = assets.map((a) => a.id);
      if (assetIds.length > 0) {
        const fullAssets = await this.assetRepository.getByIds(assetIds);
        const nameMap = new Map(fullAssets.map((a) => [a.id, a.originalFileName] as const));
        for (const a of assets) {
          a.fileName = nameMap.get(a.id) || undefined;
        }
        this.logger.log(`[人脸] 批量补充文件名: 查询数量=${fullAssets.length}`);
      }

      // 评分：人脸相似度用 1 - distance 的近似（整体评分等同人脸评分）
      const faceScores = items.map((i: FaceSearchResult) => Math.max(0, 1 - i.distance));
      const overall = faceScores[0] ?? undefined;

      if (assets.length > 0) {
        results.push({
          personName,
          scores: { overall, face: overall },
          assets,
        });
        this.logger.log(`[人脸] 结果项生成：assets=${assets.length}, person=${personName ?? '-'}，score=${overall ?? '-'}`);
      } else {
        this.logger.warn('[人脸] 无匹配资产，本次检测结果将被忽略');
      }
    }
    this.logger.log(`[ImageSearchService] 人脸模式总结果: ${results.length}`);
    return { results };
  }

  private async searchByClip(
    auth: AuthDto,
    imagePath: string,
    machineLearning: SystemConfig['machineLearning'],
    userIds: string[],
    maxResults: number,
  ): Promise<ImageSearchResponseDto> {
    // 计算整图 CLIP 向量
    const modelName = machineLearning.clip.modelName;
    this.logger.log(`开始 CLIP 编码: model=${modelName}, clip.enabled=${machineLearning.clip.enabled}`);
    try {
      const dbDim = await this.databaseRepository.getDimensionSize('smart_search');
      this.logger.log(`[CLIP] 数据库向量维度: smart_search.dim=${dbDim}`);
    } catch (e) {
      this.logger.warn('[CLIP] 获取数据库维度失败', e as any);
    }
    // 传入完整的 CLIPConfig（包含 enabled 与 modelName）
    const embedding = await this.machineLearningRepository.encodeImage(imagePath, machineLearning.clip);
    this.logger.log(`[CLIP] 编码结果: ${this.getEmbeddingInfo(embedding)}; stats=${this.getEmbeddingStats(embedding)}`);
    this.logger.log(`[CLIP] 检索范围: userIds=${userIds.length}, maxResults=${maxResults}`);

    // 复用现有 smart search（按向量相似排序）。不返回距离值，分数以 '--' 展示
    const { items } = await this.searchRepository.searchSmartWithDistance(
      { page: 1, size: maxResults },
      { userIds, embedding },
    );
    // searchSmartWithDistance 的返回项为 asset 选取并额外选择了 distance 字段，
    // 由于构建器的类型较为复杂，TS 推断为 object[]，这里做显式类型收敛到我们需要的字段，避免 TS2339。
    type ClipSearchItem = Pick<MapAsset, 'id' | 'originalFileName'> & { distance?: number };
    const typedItems = items as ClipSearchItem[];
    this.logger.log(`[ImageSearchService] 相似内容检索返回数量: ${typedItems.length}`);
    if (typedItems.length > 0) {
      const sampleCount = Math.min(5, typedItems.length);
      const distances = typedItems.map((i) => i.distance).slice(0, sampleCount);
      const ids = typedItems.slice(0, sampleCount).map((i) => i.id);
      this.logger.log(
        `[CLIP] 距离样本: ${distances
          .map((d) => (typeof d === 'number' ? d.toFixed(4) : String(d)))
          .join(', ')}; assetIds=${ids.join(', ')}`,
      );
    }

    const assets: ImageSearchAssetDto[] = typedItems.map((a) => ({ id: a.id, fileName: a.originalFileName || undefined }));

    // 内容相似搜索不涉及人名，评分字段留空（前端以 '--' 展示）
    if (assets.length === 0) {
      this.logger.warn('[ImageSearchService] 相似模式无任何匹配资产，返回空结果数组以避免前端展示混淆');
      return { results: [] };
    }
    const results: ImageSearchResultDto[] = [
      {
        personName: undefined,
        scores: { overall: undefined, content: undefined },
        assets,
      },
    ];
    this.logger.log(`[ImageSearchService] 相似模式总结果: ${results[0].assets.length}`);
    return { results };
  }

  /**
   * 将嵌入向量字符串做基础信息提取，便于日志排查：
   * - 如果是 JSON 数组，输出维度与前 5 个值；否则输出字符串长度。
   */
  private getEmbeddingInfo(embedding: string): string {
    try {
      const trimmed = embedding?.trim?.() ?? '';
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          const head = arr.slice(0, 5).map((v: any) => Number(v).toFixed(4));
          return `dim=${arr.length}, head=[${head.join(', ')}]`;
        }
      }
    } catch {
      // 忽略解析错误，降级输出字符串长度
    }
    return `len=${embedding?.length ?? 0}`;
  }

  /**
   * 人脸检测：按 minScore 逐级回退，提升弱姿态（如侧脸、偏光照）下的检测召回。
   * 回退序列：config.minScore -> 0.5 -> 0.35。
   * 仅用于临时上传的以图搜图，不影响系统的资产检测与聚类任务。
   */
  private async detectFacesWithFallback(
    imagePath: string,
    modelName: string,
    minScore: number,
  ): Promise<{ faces: { boundingBox: any; embedding: string; score: number }[]; imageHeight: number; imageWidth: number; usedMinScore: number }> {
    const candidates = [minScore, 0.5, 0.35];
    for (let i = 0; i < candidates.length; i++) {
      const score = candidates[i];
      const resp = await this.machineLearningRepository.detectFaces(imagePath, { modelName, minScore: score });
      this.logger.log(`[Face] 检测尝试#${i + 1}: minScore=${score} -> faces=${resp.faces.length}`);
      if (resp.faces.length > 0) {
        return { ...resp, usedMinScore: score } as any;
      }
    }
    // 若所有阈值都无检测结果，返回最后一次响应，并记录使用的阈值
    const finalResp = await this.machineLearningRepository.detectFaces(imagePath, { modelName, minScore: candidates[candidates.length - 1] });
    this.logger.warn(`[Face] 所有阈值均未检测到人脸，返回最后一次结果 faces=${finalResp.faces.length}`);
    return { ...finalResp, usedMinScore: candidates[candidates.length - 1] } as any;
  }

  /**
   * 人脸相似搜索：若在默认距离阈值下无结果，尝试小幅放宽（例如 0.6）。
   * 目的：对齐 Immich 聚类的召回体验，避免侧脸/弱特征图像完全查不到。
   */
  private async searchFacesWithFallback(args: {
    userIds: string[];
    embedding: string;
    numResults: number;
    baseMaxDistance: number;
  }): Promise<FaceSearchResult[]> {
    const { userIds, embedding, numResults, baseMaxDistance } = args;
    const distances = [baseMaxDistance, Math.max(baseMaxDistance, 0.6)];
    for (let i = 0; i < distances.length; i++) {
      const md = distances[i];
      const items = await this.searchRepository.searchFaces({
        userIds,
        embedding,
        numResults,
        maxDistance: md,
        hasPerson: undefined,
        minBirthDate: undefined,
      });
      this.logger.log(`[人脸] 检索尝试#${i + 1}: maxDistance=${md} -> items=${items.length}`);
      if (items.length > 0) {
        return items;
      }
    }
    // 均无结果时返回最后一次尝试结果（通常为空），便于前端显示为空状态
    const lastMd = distances[distances.length - 1];
    const lastItems = await this.searchRepository.searchFaces({
      userIds,
      embedding,
      numResults,
      maxDistance: lastMd,
      hasPerson: undefined,
      minBirthDate: undefined,
    });
    this.logger.warn(`[人脸] 所有距离阈值均无匹配，返回最后一次尝试结果=${lastItems.length}`);
    return lastItems;
  }

  /**
   * （仅日志使用）计算嵌入向量的基础统计信息，帮助排查异常值。
   */
  private getEmbeddingStats(embedding: string): string {
    try {
      const trimmed = embedding?.trim?.() ?? '';
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr.length > 0) {
          let sum = 0;
          let min = Number.POSITIVE_INFINITY;
          let max = Number.NEGATIVE_INFINITY;
          for (const v of arr) {
            const n = Number(v);
            sum += n;
            if (n < min) min = n;
            if (n > max) max = n;
          }
          const mean = sum / arr.length;
          return `dim=${arr.length}, min=${min.toFixed(4)}, max=${max.toFixed(4)}, mean=${mean.toFixed(4)}`;
        }
      }
    } catch {}
    return 'stats=n/a';
  }

}