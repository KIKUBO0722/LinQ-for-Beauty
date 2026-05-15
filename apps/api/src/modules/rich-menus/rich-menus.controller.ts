import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RichMenusService } from './rich-menus.service';
import {
  AssignMenuDto,
  CreateRichMenuDto,
  CreateRichMenuGroupDto,
  UpdateRichMenuDto,
} from './dto/rich-menus.dto';

@Controller('api/v1/rich-menus')
export class RichMenusController {
  constructor(private readonly richMenusService: RichMenusService) {}

  @Get()
  list(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.richMenusService.findByTenant(tenantId, locationId);
  }

  @Get('groups')
  listGroups(@Query('tenantId') tenantId: string) {
    return this.richMenusService.listGroups(tenantId);
  }

  @Post('groups')
  createGroup(
    @Query('tenantId') tenantId: string,
    @Body() body: CreateRichMenuGroupDto,
  ) {
    return this.richMenusService.createGroup(tenantId, body);
  }

  @Delete('groups/:groupId')
  deleteGroup(
    @Query('tenantId') tenantId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.richMenusService.deleteGroup(tenantId, groupId);
  }

  @Post('groups/:groupId/default')
  setGroupDefault(
    @Query('tenantId') tenantId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.richMenusService.setGroupDefault(tenantId, groupId);
  }

  @Post('assign')
  assignMenuToUser(
    @Query('tenantId') tenantId: string,
    @Body() body: AssignMenuDto,
  ) {
    return this.richMenusService.assignMenuToUser(tenantId, body);
  }

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body() body: CreateRichMenuDto,
  ) {
    return this.richMenusService.create(tenantId, body);
  }

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateRichMenuDto,
  ) {
    return this.richMenusService.update(tenantId, id, body);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 1024 * 1024 } }))
  uploadImage(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
  ) {
    if (!file) throw new Error('No image file provided');
    return this.richMenusService.uploadImage(tenantId, id, file.buffer, file.mimetype);
  }

  @Delete(':id')
  delete(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.richMenusService.delete(tenantId, id);
  }

  @Post(':id/default')
  setDefault(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.richMenusService.setDefault(tenantId, id);
  }
}
