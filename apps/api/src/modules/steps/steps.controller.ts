import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { StepsService } from './steps.service';
import { CreateScenarioDto, EnrollDto, ReplaceMessagesDto, UpdateScenarioDto } from './dto/steps.dto';

@Controller('api/v1/steps')
export class StepsController {
  constructor(private readonly steps: StepsService) {}

  // シナリオ
  @Get()
  async list(@Query('tenantId') tenantId: string) {
    return this.steps.listScenarios(tenantId);
  }

  @Get(':id')
  async get(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.steps.getScenario(tenantId, id);
  }

  @Post()
  async create(@Query('tenantId') tenantId: string, @Body() body: CreateScenarioDto) {
    return this.steps.createScenario(tenantId, body);
  }

  @Patch(':id')
  async update(@Query('tenantId') tenantId: string, @Param('id') id: string, @Body() body: UpdateScenarioDto) {
    return this.steps.updateScenario(tenantId, id, body);
  }

  @Delete(':id')
  async remove(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    await this.steps.removeScenario(tenantId, id);
    return { ok: true };
  }

  // ステップメッセージ (replace 方式)
  @Put(':id/messages')
  async replaceMessages(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: ReplaceMessagesDto,
  ) {
    return this.steps.replaceMessages(tenantId, id, body.messages);
  }

  // 進行状況
  @Post(':id/enroll')
  async enroll(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: EnrollDto,
  ) {
    return this.steps.enroll(tenantId, id, body.customerId);
  }

  @Delete('enrollments/:enrollmentId')
  async cancelEnrollment(
    @Query('tenantId') tenantId: string,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    await this.steps.cancelEnrollment(tenantId, enrollmentId);
    return { ok: true };
  }

  @Get(':id/enrollments')
  async listEnrollments(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.steps.listEnrollments(tenantId, id);
  }
}
