import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ValidateString, ValidateUUID } from 'src/validation';

// 以图搜图 - 请求 DTO
export class ImageSearchRequestDto {
  @IsString()
  @IsNotEmpty()
  @ValidateString({ trim: true })
  @ApiProperty({ enum: ['face', 'similar'] })
  mode!: 'face' | 'similar';

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  @ApiProperty({ required: false, type: 'integer', default: 20 })
  maxResults?: number;

  @ValidateUUID({ optional: true })
  @IsOptional()
  @ApiProperty({ required: false })
  libraryId?: string | null;
}

// 以图搜图 - 结果中单个资源信息
export class ImageSearchAssetDto {
  @IsString()
  @ApiProperty()
  id!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  fileName?: string;
}

// 以图搜图 - 评分信息（可选）
export class ImageSearchScoresDto {
  @IsOptional()
  @ApiProperty({ required: false })
  overall?: number;

  @IsOptional()
  @ApiProperty({ required: false })
  face?: number;

  @IsOptional()
  @ApiProperty({ required: false })
  color?: number;

  @IsOptional()
  @ApiProperty({ required: false })
  content?: number;
}

// 以图搜图 - 单条结果
export class ImageSearchResultDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  personName?: string;

  @IsOptional()
  @ApiProperty({ required: false, type: ImageSearchScoresDto })
  scores?: ImageSearchScoresDto;

  @ApiProperty({ type: [ImageSearchAssetDto] })
  assets!: ImageSearchAssetDto[];
}

// 以图搜图 - 响应 DTO
export class ImageSearchResponseDto {
  @ApiProperty({ type: [ImageSearchResultDto] })
  results!: ImageSearchResultDto[];
}