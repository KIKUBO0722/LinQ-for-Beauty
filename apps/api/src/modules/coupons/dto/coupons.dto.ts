export class CreateCouponDto {
  name: string;
  code: string;
  discountType: string;
  discountValue: number;
  description?: string;
  expiresAt?: string;
  maxUses?: number;
}

export class UpdateCouponDto {
  name?: string;
  code?: string;
  discountType?: string;
  discountValue?: number;
  description?: string;
  expiresAt?: string | null;
  maxUses?: number | null;
}

export class ToggleCouponDto {
  isActive: boolean;
}
