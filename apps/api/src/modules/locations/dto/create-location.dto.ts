import type { BusinessHours, ClosedDays } from '@linq-beauty/db';

export class CreateLocationDto {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  businessHours?: BusinessHours;
  closedDays?: ClosedDays;
  themeColor?: string;
}
