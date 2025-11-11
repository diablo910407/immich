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
    const userIds = await getMyPartnerIds({
      userId: auth.user.id,
      repository: this.partnerRepository,
      timelineEnabled: true,
    });
    const maxResults = Math.max(1, dto.maxResults ?? 20);

    // 将上传图片写入用户 Upload 目录的临时文件，避免硬编码路径
    const uploadDir = StorageCore.getFolderLocation(StorageFolder.Upload, auth.user.id);
    const tempPath = StorageCore.getTempPathInDir(uploadDir);
    await fsp.mkdir(dirname(tempPath), { recursive: true });
    await fsp.writeFile(tempPath, fileBuffer);
    this.logger.log(
      `[ImageSearchService] 请求开始: user=${auth.user.id}, mode=${dto.mode}, name=${originalName}, maxResults=${maxResults}, temp=${tempPath}`,
    );

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
    // 进行人脸检测
    this.logger.log(`开始人脸检测: ${imagePath}`);
    const { minScore, modelName, maxDistance } = machineLearning.facialRecognition;
    const detection = await this.machineLearningRepository.detectFaces(imagePath, { modelName, minScore });
    this.logger.log(
      `检测到人脸数量: ${detection.faces.length}，尺寸=${detection.imageWidth}x${detection.imageHeight}`,
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
      const items: FaceSearchResult[] = await this.searchRepository.searchFaces({
        userIds,
        embedding: face.embedding,
        numResults: maxResults,
        maxDistance,
        hasPerson: undefined,
        minBirthDate: undefined,
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
      }

      // 补充文件名信息（批量查询）
      const assetIds = assets.map((a) => a.id);
      if (assetIds.length > 0) {
        const fullAssets = await this.assetRepository.getByIds(assetIds);
        const nameMap = new Map(fullAssets.map((a) => [a.id, a.originalFileName] as const));
        for (const a of assets) {
          a.fileName = nameMap.get(a.id) || undefined;
        }
      }

      // 评分：人脸相似度用 1 - distance 的近似（整体评分等同人脸评分）
      const faceScores = items.map((i: FaceSearchResult) => Math.max(0, 1 - i.distance));
      const overall = faceScores[0] ?? undefined;

      results.push({
        personName,
        scores: { overall, face: overall },
        assets,
      });
      this.logger.log(`[人脸] 结果项生成：assets=${assets.length}, person=${personName ?? '-'}，score=${overall ?? '-'}`);
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
    this.logger.log(`开始 CLIP 编码: model=${modelName}`);
    // 传入完整的 CLIPConfig（包含 enabled 与 modelName）
    const embedding = await this.machineLearningRepository.encodeImage(imagePath, machineLearning.clip);
    this.logger.log(`[CLIP] 编码结果: ${this.getEmbeddingInfo(embedding)}`);

    // 复用现有 smart search（按向量相似排序）。不返回距离值，分数以 '--' 展示
    const { items } = await this.searchRepository.searchSmartWithDistance(
      { page: 1, size: maxResults },
      { userIds, embedding },
    );
    this.logger.log(`[ImageSearchService] 相似内容检索返回数量: ${items.length}`);
    if (items.length > 0) {
      const distances = (items as any).map((i: any) => i.distance).slice(0, Math.min(5, items.length));
      const ids = items.slice(0, Math.min(5, items.length)).map((i) => i.id);
      this.logger.log(`[CLIP] 距离样本: ${distances.map((d: number) => d?.toFixed?.(4) ?? d).join(', ')}; assetIds=${ids.join(', ')}`);
    }

    const assets: ImageSearchAssetDto[] = items.map((a) => ({ id: a.id, fileName: a.originalFileName || undefined }));

    // 内容相似搜索不涉及人名，评分字段留空（前端以 '--' 展示）
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
}