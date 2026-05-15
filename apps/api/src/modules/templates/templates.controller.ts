import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/templates.dto';

@Controller('api/v1/templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list(@Query('tenantId') tenantId: string, @Query('locationId') locationId?: string) {
    return this.templatesService.list(tenantId, locationId);
  }

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body() body: CreateTemplateDto,
    @Query('locationId') locationId?: string,
  ) {
    return this.templatesService.create(tenantId, body, locationId);
  }

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateTemplateDto,
  ) {
    return this.templatesService.update(tenantId, id, body);
  }

  @Delete(':id')
  async delete(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    await this.templatesService.delete(tenantId, id);
    return { ok: true };
  }
}
