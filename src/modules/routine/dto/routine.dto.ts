import { z } from 'zod';

const daySlots = z.array(z.boolean()).length(14);

export const upsertRoutineSchema = z.object({
  slots: z.object({
    mon: daySlots,
    tue: daySlots,
    wed: daySlots,
    thu: daySlots,
    fri: daySlots,
    sat: daySlots,
    sun: daySlots,
  }),
});

export type UpsertRoutineDto = z.infer<typeof upsertRoutineSchema>;

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface SlotRow {
  day: number;
  hour: number;
}

export interface SummaryUserEntry {
  id: string;
  name: string;
  role: string;
  sector: string;
}

export type SlotsGrid = Record<DayKey, boolean[]>;

export interface SummaryResponse {
  availability: Partial<Record<DayKey, Record<string, SummaryUserEntry[]>>>;
  unconfigured: SummaryUserEntry[];
}
