import { IsBoolean, IsIn, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  name: string;
  @IsString()
  code: string;
  @IsIn(['percent', 'fixed'])
  discountType: string;
  @IsNumber()
  @Min(0)
  discountValue: number;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  code?: string;
  @IsOptional()
  @IsIn(['percent', 'fixed'])
  discountType?: string;
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null;
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number | null;
}

export class ToggleCouponDto {
  @IsBoolean()
  isActive: boolean;
}
