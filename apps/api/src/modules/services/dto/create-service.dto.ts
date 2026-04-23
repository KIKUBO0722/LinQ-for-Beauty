export class CreateServiceDto {
  locationId?: string;
  name: string;
  durationMin: number;
  bufferMin?: number;
  price?: number;
  displayOrder?: number;
}
