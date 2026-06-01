import type { BusinessHours, ClosedDays } from '@linq-beauty/db';

export class UpdateLocationDto {
  name?: string;
  slug?: string;
  address?: string;
  phone?: string;
  businessHours?: BusinessHours;
  closedDays?: ClosedDays;
  themeColor?: string;
  isActive?: boolean;
}
