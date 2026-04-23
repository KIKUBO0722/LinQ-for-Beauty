import type { BusinessHours } from '@linq-beauty/db';

export class UpdateLocationDto {
  name?: string;
  slug?: string;
  address?: string;
  businessHours?: BusinessHours;
  isActive?: boolean;
}
