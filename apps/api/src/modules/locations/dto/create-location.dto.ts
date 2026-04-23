import type { BusinessHours } from '@linq-beauty/db';

export class CreateLocationDto {
  name: string;
  slug: string;
  address?: string;
  businessHours?: BusinessHours;
}
