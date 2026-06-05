import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import type { BusinessHours, ClosedDays } from '@linq-beauty/db';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  businessHours?: BusinessHours;

  @IsOptional()
  @IsArray()
  closedDays?: ClosedDays;

  @IsOptional()
  @IsString()
  themeColor?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
