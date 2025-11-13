import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthDto } from 'src/dtos/auth.dto';
import { Permission } from 'src/enum';
import { Authenticated, Auth } from 'src/middleware/auth.guard';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { OrganizeService } from 'src/services/organize.service';

@ApiTags('Organize')
@Controller('organize')
export class OrganizeController {
  constructor(private service: OrganizeService, private logger: LoggingRepository) {
    this.logger.setContext(OrganizeController.name);
  }

  @Get('unassigned-assets')
  @Authenticated({ permission: Permission.AssetRead })
  getUnassignedAssets(@Auth() auth: AuthDto) {
    return this.service.getUnassignedAssets(auth);
  }
}

