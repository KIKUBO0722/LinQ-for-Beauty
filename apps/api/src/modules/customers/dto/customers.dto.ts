export class UpdateCustomerDto {
  name?: string;
  phone?: string;
  email?: string;
  birthday?: string | null;
  notes?: string;
  preferredLocationId?: string | null;
  score?: number;
  chatStatus?: string;
  engagementTier?: string;
  acquisitionSource?: string;
  customFields?: Record<string, unknown>;
}
