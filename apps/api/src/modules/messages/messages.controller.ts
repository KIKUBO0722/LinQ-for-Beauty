import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendTextDto, SendMessageDto, TestSendDto } from './dto/messages.dto';

@Controller('api/v1/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('unread-summary')
  unreadSummary(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.messagesService.getUnreadSummary(tenantId, locationId);
  }

  @Get('conversation/:customerId')
  conversation(
    @Query('tenantId') tenantId: string,
    @Param('customerId') customerId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.messagesService.getConversation(tenantId, customerId, locationId);
  }

  @Post('read/:customerId')
  async markAsRead(
    @Query('tenantId') tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    await this.messagesService.markAsRead(tenantId, customerId);
    return { ok: true };
  }

  @Post('send')
  send(@Query('tenantId') tenantId: string, @Body() body: SendTextDto) {
    return this.messagesService.sendToCustomer(tenantId, body.customerId, body.text);
  }

  @Post('send-message')
  sendMessage(@Query('tenantId') tenantId: string, @Body() body: SendMessageDto) {
    return this.messagesService.sendMessageToCustomer(tenantId, body.customerId, body.message);
  }

  @Post('test-send')
  testSend(@Query('tenantId') tenantId: string, @Body() body: TestSendDto) {
    return this.messagesService.testSend(tenantId, body.customerIds, body.message);
  }
}
