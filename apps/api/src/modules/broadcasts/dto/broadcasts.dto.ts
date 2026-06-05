import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateBroadcastDto {
  @IsIn(['all', 'segment', 'scheduled'])
  type!: 'all' | 'segment' | 'scheduled';
  @IsOptional()
  @IsString()
  title?: string;
  @IsString()
  text!: string;
  @IsOptional()
  @IsIn(['text', 'image', 'video', 'audio', 'flex'])
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'flex';
  @IsOptional()
  @IsString()
  segmentId?: string;
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
  @IsOptional()
  @IsString()
  autoTagOnResponse?: string;
}

export class UpdateBroadcastDto {
  @IsOptional()
  @IsString()
  title?: string;
  @IsOptional()
  @IsString()
  text?: string;
  @IsOptional()
  @IsString()
  scheduledAt?: string;
  @IsOptional()
  @IsIn(['scheduled', 'cancelled'])
  status?: 'scheduled' | 'cancelled';
}
