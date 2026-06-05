import { IsArray, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SendTextDto {
  @IsUUID()
  customerId!: string;
  @IsString()
  @IsNotEmpty()
  text!: string;
}

export class MessagePayload {
  @IsIn(['text', 'image', 'video', 'audio', 'flex'])
  type!: 'text' | 'image' | 'video' | 'audio' | 'flex';
  @IsOptional()
  @IsString()
  text?: string;
  @IsOptional()
  @IsString()
  originalContentUrl?: string;
  @IsOptional()
  @IsString()
  previewImageUrl?: string;
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
  @IsOptional()
  @IsString()
  altText?: string;
  @IsOptional()
  @IsObject()
  contents?: Record<string, unknown>;
  @IsOptional()
  @IsObject()
  quickReply?: {
    items: Array<{
      type: 'action';
      action: { type: string; label: string; text?: string; uri?: string; data?: string };
    }>;
  };
}

export class SendMessageDto {
  @IsUUID()
  customerId!: string;
  @IsObject()
  message!: MessagePayload;
}

export class TestSendDto {
  @IsArray()
  @IsString({ each: true })
  customerIds!: string[];
  @IsString()
  message!: string;
}
