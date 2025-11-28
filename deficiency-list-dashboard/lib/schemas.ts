import { z } from "zod";

export const PunchListItemRow = z.object({
  id: z.string(),
  number: z.string(), // Item number/position
  subject: z.string(),
  status: z.string(),
  assigned_to: z.string(), // Ball in court / assigned to
  company_name: z.string(), // Company name from vendor assignments
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD (optional)
  days_late: z.number(),
  days_in_court: z.number(),
  link: z.string().url(),
  mailto_reminder: z.string().url().optional(),
});

export const PunchListItemsResponse = z.object({
  rows: z.array(PunchListItemRow),
  lastUpdated: z.string().optional(),
});

export type TPunchListItemRow = z.infer<typeof PunchListItemRow>;

export const NoteResponse = z.object({
  item_id: z.string(),
  text: z.string(),
});

export const NotePutResponse = z.object({
  ok: z.boolean(),
  item_id: z.string(),
  updated_at: z.string().optional(),
});

export const RefreshResponse = z.object({
  ok: z.boolean(),
  refreshedAt: z.string().optional(),
});


