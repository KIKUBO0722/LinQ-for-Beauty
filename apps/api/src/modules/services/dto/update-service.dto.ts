import { IsOptional, IsString, IsInt, IsBoolean, Min } from 'class-validator';

// PUT /api/v1/services/:id の入力点検。update は部分更新のため全フィールド optional。
// グローバル ValidationPipe は transform:false / whitelist:false (main.ts)。
// = 型変換も未知フィールド除去もしない。デコレータを付けたフィールドだけを「来た値そのまま」点検する。
// Web 送信値 (apps/web settings/page.tsx ServiceEditor L626-632) を 1 つも弾かないことを確認済み。
export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  // displayOrder の入力欄 (settings/page.tsx L716-723) は min 属性が無く、
  // 現状 parseInt(value,10)||0 で負値もそのまま送られ DB(integer) に保存できる。
  // @Min(0) を付けると現行で通る保存を 400 で壊すため、@IsInt() のみに留める。
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
