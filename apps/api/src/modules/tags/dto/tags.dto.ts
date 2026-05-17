export class CreateTagDto {
  name: string;
  color?: string;
  category?: string;
}

export class UpdateTagDto {
  name?: string;
  color?: string;
  category?: string;
}
