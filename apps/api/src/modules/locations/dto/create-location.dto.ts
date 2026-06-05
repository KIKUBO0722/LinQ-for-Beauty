import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import type { BusinessHours, ClosedDays } from '@linq-beauty/db';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsNotEmpty()
  slug: string;
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
}
