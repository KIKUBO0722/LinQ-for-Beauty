import {
  BadRequestException,
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
import { FormsService } from './forms.service';
import { CreateFormDto, SubmitResponseDto, UpdateFormDto } from './dto/forms.dto';

@Controller('api/v1/forms')
export class FormsController {
  constructor(private readonly service: FormsService) {}

  @Get()
  list(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.service.findByTenant(tenantId, locationId);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string } | undefined) {
    if (!file) throw new BadRequestException('No image file');
    const url = await this.service.uploadImage(file.buffer, file.mimetype, file.originalname);
    return { url };
  }

  @Get('public/:slug')
  publicGet(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Post('public/:slug/submit')
  submitPublic(@Param('slug') slug: string, @Body() body: SubmitResponseDto) {
    return this.service.submitResponse(slug, body);
  }

  @Get(':id')
  findOne(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Get(':id/responses')
  listResponses(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.listResponses(tenantId, id);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() body: CreateFormDto) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateFormDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  remove(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
