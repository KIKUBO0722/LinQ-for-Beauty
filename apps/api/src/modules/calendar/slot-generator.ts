import type { BusinessHours } from '@linq-beauty/db';

export interface TimeSlot {
  startsAt: Date;
  endsAt: Date;
}

interface Block {
  startsAt: Date;
  endsAt: Date;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function parseTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const result = new Date(date);
  result.setHours(h, m, 0, 0);
  return result;
}

function doesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function generateAvailableSlots(
  date: Date,
  slotDurationMin: number,
  businessHours: BusinessHours | null | undefined,
  existingBlocks: Block[],
): TimeSlot[] {
  const dayKey = DAY_KEYS[date.getDay()];
  const dayHours = businessHours?.[dayKey];
  if (!dayHours) return [];

  const open = parseTime(date, dayHours.open);
  const close = parseTime(date, dayHours.close);
  const stepMs = slotDurationMin * 60 * 1000;

  const slots: TimeSlot[] = [];
  let cursor = open.getTime();

  while (cursor + stepMs <= close.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + stepMs);

    const blocked = existingBlocks.some((b) =>
      doesOverlap(slotStart, slotEnd, b.startsAt, b.endsAt),
    );
    if (!blocked) slots.push({ startsAt: slotStart, endsAt: slotEnd });

    cursor += stepMs;
  }

  return slots;
}
