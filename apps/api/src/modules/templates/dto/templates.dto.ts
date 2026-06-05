import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsIn(['text', 'buttons', 'confirm', 'carousel', 'image', 'flex'])
  messageType?: string;

  @IsOptional()
  @IsObject()
  messageData?: Record<string, unknown>;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsIn(['text', 'buttons', 'confirm', 'carousel', 'image', 'flex'])
  messageType?: string;

  @IsOptional()
  @IsObject()
  messageData?: Record<string, unknown>;
}
