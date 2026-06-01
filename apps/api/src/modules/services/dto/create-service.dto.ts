export class CreateServiceDto {
  locationId?: string | null;
  name: string;
  durationMin: number;
  bufferMin?: number;
  price?: number | null;
  displayOrder?: number;
  isActive?: boolean;
}
