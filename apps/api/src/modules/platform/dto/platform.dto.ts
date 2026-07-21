import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class PlatformLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

// 店の開設 (08 設計判断 6): name / email 必須、担当者情報は任意。
// LINE 接続・拠点 (locations) は店側の設定画面に任せる (Shopify 型の引き渡し)
export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  ownerRole?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class IssueUserDto {
  @IsEmail()
  email!: string;
}
