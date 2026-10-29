import { z } from "zod";

const id = z.string().min(1).max(64);

export const responseInput = z.object({
  questionId: id,
  selectedChoiceId: id.nullable(),
  eliminatedChoiceIds: z.array(id).max(10),
  flagged: z.boolean(),
  timeSpentMs: z.number().int().min(0).max(24 * 3600 * 1000),
});

export const highlightInput = z.object({
  passageId: id,
  ranges: z
    .array(z.object({ p: z.number().int().min(0), s: z.number().int().min(0), e: z.number().int().min(1) }))
    .max(400),
});

export const syncPayload = z.object({
  responses: z.array(responseInput).max(200).default([]),
  highlights: z.array(highlightInput).max(50).default([]),
  lastPosition: z.number().int().min(0).max(1000).optional(),
});

export type ResponseInput = z.infer<typeof responseInput>;
export type HighlightInput = z.infer<typeof highlightInput>;
export type SyncPayload = z.infer<typeof syncPayload>;

export const startInput = z.object({
  examSlug: z.string().min(1).max(100),
  mode: z.enum(["TIMED", "UNTIMED"]),
});
