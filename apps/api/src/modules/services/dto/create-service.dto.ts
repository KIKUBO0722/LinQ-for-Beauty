import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceDto {
  @IsOptional()
  @IsString()
  locationId?: string | null;
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsInt()
  @Min(1)
  durationMin: number;
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMin?: number;
  @IsOptional()
  @IsNumber()
  price?: number | null;
  @IsOptional()
  @IsInt()
  displayOrder?: number;
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
