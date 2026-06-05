import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateScenarioDto {
  @IsString()
  name!: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  locationId?: string | null;
  @IsIn(['manual', 'tag', 'form', 'friend-add', 'reservation-completed'])
  triggerType!: 'manual' | 'tag' | 'form' | 'friend-add' | 'reservation-completed';
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateScenarioDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  locationId?: string | null;
  @IsOptional()
  @IsIn(['manual', 'tag', 'form', 'friend-add', 'reservation-completed'])
  triggerType?: 'manual' | 'tag' | 'form' | 'friend-add' | 'reservation-completed';
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StepMessageDto {
  @IsOptional()
  @IsString()
  id?: string;
  @IsInt()
  @Min(0)
  delayMinutes!: number;
  @IsInt()
  @Min(0)
  sortOrder!: number;
  @IsObject()
  messageContent!: { type: 'text'; text: string } | { type: 'image'; originalContentUrl: string } | Record<string, unknown>;
}

export class ReplaceMessagesDto {
  @IsArray()
  messages!: StepMessageDto[];
}

export class EnrollDto {
  @IsUUID()
  customerId!: string;
}
