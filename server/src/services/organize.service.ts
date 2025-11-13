import { Injectable } from '@nestjs/common';
import { AssetVisibility, Permission } from 'src/enum';
import { AuthDto } from 'src/dtos/auth.dto';
import { BaseService } from 'src/services/base.service';

@Injectable()
export class OrganizeService extends BaseService {
  async getUnassignedAssets(auth: AuthDto) {
    const assets = await this.assetRepository.getUnassignedAssets(auth.user.id);
    this.logger.debug(`Organize: found ${assets.length} unassigned assets`);
    return assets.map((a) => ({ id: a.id, type: a.type, originalFileName: a.originalFileName, originalPath: a.originalPath }));
  }
}
