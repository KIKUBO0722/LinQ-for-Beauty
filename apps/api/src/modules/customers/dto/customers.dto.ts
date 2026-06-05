import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  birthday?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  preferredLocationId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsString()
  chatStatus?: string;

  @IsOptional()
  @IsString()
  engagementTier?: string;

  @IsOptional()
  @IsString()
  acquisitionSource?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}
