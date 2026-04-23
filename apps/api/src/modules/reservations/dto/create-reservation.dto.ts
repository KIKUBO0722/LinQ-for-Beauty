export class CreateReservationDto {
  locationId: string;
  serviceId: string;
  customerId?: string;
  guestName?: string;
  guestPhone?: string;
  startsAt: string;
  note?: string;
}
