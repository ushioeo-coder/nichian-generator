import { z } from "zod";

export const scheduleItemSchema = z.object({
  title: z.string().min(1),
  detail: z.string(),
});

export const staffPlanItemSchema = z.object({
  staffLabel: z.string().min(1),
  assignment: z.string().min(1),
  notes: z.string(),
});

export const dailyPlanAiResponseSchema = z.object({
  purposeAim: z.string().min(1),
  schedule: z.array(scheduleItemSchema).min(1),
  staffPlan: z.array(staffPlanItemSchema).min(1),
  preparations: z.array(z.string().min(1)).min(1),
});

export type DailyPlanAiResponseParsed = z.infer<typeof dailyPlanAiResponseSchema>;
