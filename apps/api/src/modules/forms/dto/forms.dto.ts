import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import type { FormField } from '@linq-beauty/db';

export class CreateFormDto {
  @IsString()
  name!: string;
  @IsString()
  slug!: string;
  @IsOptional()
  @IsString()
  category?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  locationId?: string;
  @IsOptional()
  @IsArray()
  fields?: FormField[];
  @IsOptional()
  @IsArray()
  autoTagIds?: string[];
  @IsOptional()
  @IsString()
  thankYouMessage?: string;
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateFormDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  slug?: string;
  @IsOptional()
  @IsString()
  category?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  locationId?: string | null;
  @IsOptional()
  @IsArray()
  fields?: FormField[];
  @IsOptional()
  @IsArray()
  autoTagIds?: string[];
  @IsOptional()
  @IsString()
  thankYouMessage?: string;
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class SubmitResponseDto {
  @IsOptional()
  @IsString()
  customerId?: string;
  @IsOptional()
  @IsString()
  lineUserId?: string;
  @IsObject()
  answers!: Record<string, string | string[]>;
}
