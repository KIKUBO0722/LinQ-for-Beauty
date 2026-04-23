export class UpdateReservationDto {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  note?: string;
}
