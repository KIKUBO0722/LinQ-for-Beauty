export class CreateScenarioDto {
  name!: string;
  description?: string;
  locationId?: string | null;
  triggerType!: 'manual' | 'tag' | 'form' | 'friend-add' | 'reservation-completed';
  triggerConfig?: Record<string, unknown>;
  isActive?: boolean;
}

export class UpdateScenarioDto {
  name?: string;
  description?: string;
  locationId?: string | null;
  triggerType?: 'manual' | 'tag' | 'form' | 'friend-add' | 'reservation-completed';
  triggerConfig?: Record<string, unknown>;
  isActive?: boolean;
}

export class StepMessageDto {
  id?: string;
  delayMinutes!: number;
  sortOrder!: number;
  messageContent!: { type: 'text'; text: string } | { type: 'image'; originalContentUrl: string } | Record<string, unknown>;
}

export class ReplaceMessagesDto {
  messages!: StepMessageDto[];
}

export class EnrollDto {
  customerId!: string;
}
