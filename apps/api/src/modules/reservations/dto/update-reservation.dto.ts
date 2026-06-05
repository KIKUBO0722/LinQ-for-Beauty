import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

  @IsOptional()
  @IsString()
  note?: string;
}
