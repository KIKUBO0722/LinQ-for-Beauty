import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateAiConfigDto {
  // 画面は systemPrompt を空文字 "" で送りうる (state 初期値 config.systemPrompt ?? '')。
  // null も許容 (型が string | null)。IsOptional で undefined/null を素通り、"" は IsString が通す。
  @IsOptional()
  @IsString()
  systemPrompt?: string | null;

  // 現 UI は送らないが将来送りうる。文字列のみ緩く許可。
  @IsOptional()
  @IsString()
  model?: string;

  // 画面はスライダー Number(0-10) を送る。整数・0..10 に制限 (DB は integer、10 倍格納)。
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  temperature?: number;

  // 現 UI は送らないが DTO に存在。整数・マイナス禁止のみ (上限は未確認のため設けない)。
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTokens?: number;

  // 画面は welcomeMessage を空文字 "" で送りうる (state 初期値 config.welcomeMessage ?? '')。
  // null も許容。IsNotEmpty は付けない ("" を弾かないため)。
  @IsOptional()
  @IsString()
  welcomeMessage?: string | null;

  // 画面はトグルの boolean を送る。
  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  // 画面は string[] を送る。transform:false のため配列の中身までは検証しない (IsArray 止まり)。
  @IsOptional()
  @IsArray()
  handoffKeywords?: string[];

  // 画面はオブジェクト配列を送る。ネスト検証は transform:false で @Type が効かないため IsArray 止まり。
  @IsOptional()
  @IsArray()
  keywordRules?: Array<{ keyword: string; response: string; matchType?: 'contains' | 'exact' | 'startsWith' }>;

  // v0.1a: AI 日次上限。0 は使わない (無効化は autoReplyEnabled で)。
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  dailyLimit?: number;
}

export class CreateKnowledgeDto {
  // 画面は select 値 (faq 等、空にならない) を必ず送る。required。
  @IsString()
  category!: string;

  // 画面は trim 済み・空チェック後の非空文字を送る。"" 送信は UI 側でブロック済みだが、
  // 念のため IsNotEmpty は付けず IsString 止まり (緩めに既存を壊さない)。
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  // 現 UI は送らないが DTO に存在。配列のみ緩く許可。
  @IsOptional()
  @IsArray()
  tags?: string[];

  // 画面はチェックボックスの boolean を送る。
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateKnowledgeDto {
  // PATCH 部分更新。画面は category/title/content/isActive を trim 済みで送る。全 optional。
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GenerateDto {
  // 画面は select 値を送る。4 値の union。
  @IsIn(['broadcast', 'coupon', 'seasonal', 'counseling'])
  purpose!: 'broadcast' | 'coupon' | 'seasonal' | 'counseling';

  // 画面は select 値を送る。3 値の union。
  @IsIn(['formal', 'friendly', 'short'])
  tone!: 'formal' | 'friendly' | 'short';

  // 画面は trim 後 "" を undefined に変換して送る (空文字は来ない)。文字列のみ。
  @IsOptional()
  @IsString()
  extraContext?: string;
}

export class TestReplyDto {
  // customers.id (UUID) を送る想定だが、現状 UI 呼び出し元が未確認のため UUID 断定はせず
  // 文字列のみで緩く許可 (UUID 以外の id 送信や "" で 400 になるのを避ける)。
  @IsString()
  customerId!: string;

  @IsString()
  userText!: string;
}
