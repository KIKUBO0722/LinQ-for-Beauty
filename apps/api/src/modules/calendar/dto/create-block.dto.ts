import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateBlockDto {
  @IsOptional()
  @IsString()
  locationId?: string;
  @IsISO8601()
  startsAt: string;
  @IsISO8601()
  endsAt: string;
  @IsString()
  title: string;
}
