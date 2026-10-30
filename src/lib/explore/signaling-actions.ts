"use server";

import { type AnswerResult, checkSignaling } from "./signaling-questions";

/** One answer to the neural signaling explorer's knowledge check: whether it was right, and the explanation. Nothing is stored. */
export async function checkSignalingAnswer(id: string, choice: number): Promise<AnswerResult> {
  return checkSignaling(id, choice);
}
