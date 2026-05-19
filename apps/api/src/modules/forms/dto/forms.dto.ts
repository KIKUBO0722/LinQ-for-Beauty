import type { FormField } from '@linq-beauty/db';

export class CreateFormDto {
  name!: string;
  slug!: string;
  category?: string;
  description?: string;
  locationId?: string;
  fields?: FormField[];
  autoTagIds?: string[];
  thankYouMessage?: string;
  isPublished?: boolean;
}

export class UpdateFormDto {
  name?: string;
  slug?: string;
  category?: string;
  description?: string;
  locationId?: string | null;
  fields?: FormField[];
  autoTagIds?: string[];
  thankYouMessage?: string;
  isPublished?: boolean;
}

export class SubmitResponseDto {
  customerId?: string;
  lineUserId?: string;
  answers!: Record<string, string | string[]>;
}
