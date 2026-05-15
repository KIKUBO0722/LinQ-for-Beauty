export class CreateBroadcastDto {
  type!: 'all' | 'segment' | 'scheduled';
  title?: string;
  text!: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'flex';
  segmentId?: string;
  scheduledAt?: string;
  autoTagOnResponse?: string;
}

export class UpdateBroadcastDto {
  title?: string;
  text?: string;
  scheduledAt?: string;
  status?: 'scheduled' | 'cancelled';
}
