"use server";

import { checkAnswer, type AnswerResult } from "./dopamine-page";

/** One answer to the free dopamine lesson: whether it was right, and the explanation. Nothing is stored. */
export async function checkDopamineAnswer(id: string, choice: number): Promise<AnswerResult> {
  return checkAnswer(id, choice);
}
