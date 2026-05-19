export class CreateSegmentDto {
  name!: string;
  description?: string;
  locationId?: string | null;
  tagIds!: string[];
  matchType?: string;
  excludeTagIds?: string[];
}

export class UpdateSegmentDto {
  name?: string;
  description?: string;
  locationId?: string | null;
  tagIds?: string[];
  matchType?: string;
  excludeTagIds?: string[];
}
