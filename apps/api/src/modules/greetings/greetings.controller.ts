import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { GreetingsService } from './greetings.service';
import { CreateGreetingDto, UpdateGreetingDto } from './dto/greetings.dto';

@Controller('api/v1/greetings')
export class GreetingsController {
  constructor(private readonly greetingsService: GreetingsService) {}

  @Get()
  list(@Query('tenantId') tenantId: string, @Query('locationId') locationId?: string) {
    return this.greetingsService.list(tenantId, locationId);
  }

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body() body: CreateGreetingDto,
    @Query('locationId') locationId?: string,
  ) {
    return this.greetingsService.create(tenantId, body, locationId);
  }

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateGreetingDto,
  ) {
    return this.greetingsService.update(id, tenantId, body);
  }

  @Delete(':id')
  async delete(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    await this.greetingsService.delete(id, tenantId);
    return { success: true };
  }
}
