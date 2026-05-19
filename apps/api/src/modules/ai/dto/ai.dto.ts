export class UpdateAiConfigDto {
  systemPrompt?: string | null;
  model?: string;
  temperature?: number; // 0-10 (= 0.0-1.0、内部で 10 倍格納)
  maxTokens?: number;
  welcomeMessage?: string | null;
  autoReplyEnabled?: boolean;
  handoffKeywords?: string[];
  keywordRules?: Array<{ keyword: string; response: string; matchType?: 'contains' | 'exact' | 'startsWith' }>;
}

export class CreateKnowledgeDto {
  category!: string;
  title!: string;
  content!: string;
  tags?: string[];
  isActive?: boolean;
}

export class UpdateKnowledgeDto {
  category?: string;
  title?: string;
  content?: string;
  tags?: string[];
  isActive?: boolean;
}

export class GenerateDto {
  purpose!: 'broadcast' | 'coupon' | 'seasonal' | 'counseling';
  tone!: 'formal' | 'friendly' | 'short';
  extraContext?: string;
}

export class TestReplyDto {
  customerId!: string;
  userText!: string;
}
