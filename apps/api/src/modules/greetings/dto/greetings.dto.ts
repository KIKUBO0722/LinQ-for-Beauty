import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateGreetingDto {
  @IsString()
  type: string;
  @IsString()
  name: string;
  @IsArray()
  messages: Record<string, unknown>[];
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateGreetingDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsArray()
  messages?: Record<string, unknown>[];
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
