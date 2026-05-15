export class SendTextDto {
  customerId!: string;
  text!: string;
}

export class MessagePayload {
  type!: 'text' | 'image' | 'video' | 'audio' | 'flex';
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  duration?: number;
  altText?: string;
  contents?: Record<string, unknown>;
  quickReply?: {
    items: Array<{
      type: 'action';
      action: { type: string; label: string; text?: string; uri?: string; data?: string };
    }>;
  };
}

export class SendMessageDto {
  customerId!: string;
  message!: MessagePayload;
}

export class TestSendDto {
  customerIds!: string[];
  message!: string;
}
