import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PeopleAuditService } from 'src/services/people-audit.service';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { Authenticated, Auth } from 'src/middleware/auth.guard';
import { Permission } from 'src/enum';
import { AuthDto } from 'src/dtos/auth.dto';

@ApiTags('PeopleAudit')
@Controller('people-audit')
export class PeopleAuditController {
  constructor(private service: PeopleAuditService, private logger: LoggingRepository) {
    this.logger.setContext(PeopleAuditController.name);
  }

  @Get('paths')
  @Authenticated({ permission: Permission.PersonRead })
  getPeoplePaths(@Auth() auth: AuthDto) {
    return this.service.getPeopleMultiPath(auth);
  }
}

