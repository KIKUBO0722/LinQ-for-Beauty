import { IsOptional, IsString } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  locationId: string;
  @IsString()
  serviceId: string;
  @IsOptional()
  @IsString()
  customerId?: string;
  @IsOptional()
  @IsString()
  guestName?: string;
  @IsOptional()
  @IsString()
  guestPhone?: string;
  @IsString()
  startsAt: string;
  @IsOptional()
  @IsString()
  note?: string;
}
