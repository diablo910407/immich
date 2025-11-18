import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Authenticated } from 'src/middleware/auth.guard';
import { Permission } from 'src/enum';
import { MyOwnTagService } from 'src/services/myowntag.service';
import { MyOwnTagLabelsDto } from 'src/dtos/myowntag.dto';

@Controller('myowntag')
export class MyOwnTagController {
  constructor(private service: MyOwnTagService) {}

  @Get('labels')
  @Authenticated({ permission: Permission.PersonRead })
  getLabels() {
    return this.service.getLabels();
  }

  @Post('labels')
  @Authenticated({ permission: Permission.PersonUpdate })
  saveLabels(@Body() dto: MyOwnTagLabelsDto) {
    this.service.saveLabels(dto);
    return { ok: true };
  }

  @Get('person/:id/labels')
  @Authenticated({ permission: Permission.PersonRead })
  getPersonLabels(@Param('id') id: string) {
    return this.service.getPersonLabels(id);
  }

  @Post('person/:id/labels')
  @Authenticated({ permission: Permission.PersonUpdate })
  savePersonLabels(@Param('id') id: string, @Body() body: { labels: { typeId: string; skillId?: string }[] }) {
    this.service.savePersonLabels(id, body.labels || []);
    return { ok: true };
  }
}