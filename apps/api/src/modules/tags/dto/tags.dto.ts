import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MaxLength(100)
  name: string;
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  category?: string;
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  category?: string;
}
