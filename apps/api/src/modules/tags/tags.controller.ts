import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './dto/tags.dto';

@Controller('api/v1/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.tagsService.list(tenantId, category);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() body: CreateTagDto) {
    return this.tagsService.create(tenantId, body);
  }

  @Patch(':id')
  async update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateTagDto,
  ) {
    await this.tagsService.update(id, body, tenantId);
    return { ok: true };
  }

  @Delete(':id')
  async delete(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    await this.tagsService.delete(id, tenantId);
    return { ok: true };
  }

  @Post(':tagId/assign/:customerId')
  async assign(
    @Query('tenantId') tenantId: string,
    @Param('tagId') tagId: string,
    @Param('customerId') customerId: string,
  ) {
    await this.tagsService.verifyOwnership(tagId, tenantId);
    await this.tagsService.assignToCustomer(customerId, tagId);
    return { ok: true };
  }

  @Delete(':tagId/assign/:customerId')
  async unassign(
    @Query('tenantId') tenantId: string,
    @Param('tagId') tagId: string,
    @Param('customerId') customerId: string,
  ) {
    await this.tagsService.verifyOwnership(tagId, tenantId);
    await this.tagsService.removeFromCustomer(customerId, tagId);
    return { ok: true };
  }
}
