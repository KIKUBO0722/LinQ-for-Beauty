export class CreateGreetingDto {
  type: string;
  name: string;
  messages: Record<string, unknown>[];
  isActive?: boolean;
}

export class UpdateGreetingDto {
  name?: string;
  messages?: Record<string, unknown>[];
  isActive?: boolean;
}
