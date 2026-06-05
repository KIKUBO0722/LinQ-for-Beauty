import { IsArray, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class RichMenuSize {
  @IsNumber()
  @Min(0)
  width!: number;
  @IsNumber()
  @Min(0)
  height!: number;
}

export class RichMenuTab {
  @IsString()
  name!: string;
  @IsOptional()
  @IsString()
  chatBarText?: string;
  @IsArray()
  areas!: Record<string, unknown>[];
  @IsOptional()
  @IsObject()
  size?: RichMenuSize;
}

export class CreateRichMenuGroupDto {
  @IsString()
  lineAccountId!: string;
  @IsString()
  name!: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsArray()
  tabs!: RichMenuTab[];
}

export class AssignMenuDto {
  @IsString()
  customerId!: string;
  @IsString()
  richMenuId!: string;
}

export class CreateRichMenuDto {
  @IsString()
  lineAccountId!: string;
  @IsString()
  name!: string;
  @IsOptional()
  @IsString()
  chatBarText?: string;
  @IsOptional()
  @IsArray()
  areas?: Record<string, unknown>[];
  @IsOptional()
  @IsObject()
  size?: RichMenuSize;
  @IsOptional()
  @IsString()
  locationId?: string;
}

export class UpdateRichMenuDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  chatBarText?: string;
  @IsOptional()
  @IsArray()
  areas?: Record<string, unknown>[];
  @IsOptional()
  @IsObject()
  size?: RichMenuSize;
}
