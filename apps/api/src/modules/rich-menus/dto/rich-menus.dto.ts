export class RichMenuSize {
  width!: number;
  height!: number;
}

export class RichMenuTab {
  name!: string;
  chatBarText?: string;
  areas!: Record<string, unknown>[];
  size?: RichMenuSize;
}

export class CreateRichMenuGroupDto {
  lineAccountId!: string;
  name!: string;
  description?: string;
  tabs!: RichMenuTab[];
}

export class AssignMenuDto {
  customerId!: string;
  richMenuId!: string;
}

export class CreateRichMenuDto {
  lineAccountId!: string;
  name!: string;
  chatBarText?: string;
  areas?: Record<string, unknown>[];
  size?: RichMenuSize;
  locationId?: string;
}

export class UpdateRichMenuDto {
  name?: string;
  chatBarText?: string;
  areas?: Record<string, unknown>[];
  size?: RichMenuSize;
}
