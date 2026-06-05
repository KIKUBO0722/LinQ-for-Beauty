import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateSegmentDto {
  @IsString()
  name!: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  locationId?: string | null;
  @IsArray()
  tagIds!: string[];
  @IsOptional()
  @IsIn(['any', 'all'])
  matchType?: string;
  @IsOptional()
  @IsArray()
  excludeTagIds?: string[];
}

export class UpdateSegmentDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  locationId?: string | null;
  @IsOptional()
  @IsArray()
  tagIds?: string[];
  @IsOptional()
  @IsIn(['any', 'all'])
  matchType?: string;
  @IsOptional()
  @IsArray()
  excludeTagIds?: string[];
}
