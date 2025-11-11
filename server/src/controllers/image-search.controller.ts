import { Body, Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthDto } from 'src/dtos/auth.dto';
import { ImageSearchRequestDto, ImageSearchResponseDto } from 'src/dtos/image-search.dto';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { ImageSearchService } from 'src/services/image-search.service';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { promises as fsp } from 'node:fs';

@ApiTags('Image Search')
@Controller('image-search')
export class ImageSearchController {
  constructor(
    private service: ImageSearchService,
    private logger: LoggingRepository,
  ) {}

  @Post()
  @Authenticated()
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { mode: { type: 'string', enum: ['face', 'similar'] }, maxResults: { type: 'integer', default: 20 }, libraryId: { type: 'string', nullable: true }, file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async searchImage(@Auth() auth: AuthDto, @Body() dto: ImageSearchRequestDto, @UploadedFile() file: Express.Multer.File): Promise<ImageSearchResponseDto> {
    // 关键日志：请求进入
    this.logger.log(
      `[ImageSearchController] 收到请求: user=${auth?.user?.id}, mode=${dto?.mode}, name=${file?.originalname}, type=${file?.mimetype}, size=${file?.size}`,
    );

    if (!file || file.size === 0) {
      this.logger.warn('[ImageSearchController] 上传文件为空');
      throw new Error('文件不能为空');
    }

    // 兼容内存与磁盘存储：优先使用内存缓冲区，否则回退读取磁盘路径
    let fileBuffer: Buffer | undefined = file.buffer;
    if (!fileBuffer) {
      const diskPath = (file as any)?.path as string | undefined;
      if (diskPath) {
        try {
          this.logger.log(`[ImageSearchController] 内存无缓冲区，回退读取磁盘文件: ${diskPath}`);
          fileBuffer = await fsp.readFile(diskPath);
        } catch (err) {
          this.logger.error('[ImageSearchController] 读取磁盘文件失败', err);
          throw new Error('读取上传文件失败');
        }
      }
    }

    if (!fileBuffer) {
      this.logger.warn('[ImageSearchController] 无法获取文件内容');
      throw new Error('文件内容不可用');
    }

    try {
      const resp = await this.service.searchByImage(auth, dto, fileBuffer, file.originalname || 'upload');
      this.logger.log(`[ImageSearchController] 搜索完成，返回结果数: ${resp?.results?.length ?? 0}`);
      return resp;
    } catch (err) {
      this.logger.error('[ImageSearchController] 搜索执行失败', err);
      throw err;
    }
  }
}