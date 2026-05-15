export class CreateTemplateDto {
  name: string;
  content: string;
  category?: string;
  messageType?: string;
  messageData?: Record<string, unknown>;
}

export class UpdateTemplateDto {
  name?: string;
  content?: string;
  category?: string;
  messageType?: string;
  messageData?: Record<string, unknown>;
}
