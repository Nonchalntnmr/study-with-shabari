// Converts a full-length's question files into one content bank, choices shuffled per question id.
//   npx tsx scripts/convert-fl.ts fl1 content/questions/fl1-cp.json content/questions/fl1-bb.json content/questions/fl1-ps.json
// Writes content/exams/<name>.json and prints the answer-letter distribution before and after.
// Import it with: npm run content:import -- content/exams/fl1.json --status REVIEW
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { convertFullLength, type SourceQuestion } from "../src/lib/content/fl-convert";

const [name, ...files] = process.argv.slice(2);
if (!name || !files.length) throw new Error("usage: npx tsx scripts/convert-fl.ts <name> <section.json>…");

const questions: SourceQuestion[] = files.flatMap((f) => JSON.parse(readFileSync(f, "utf8")));
const unreviewed = questions.filter((q) => !q.reviewed).length;
const { bank, before, after } = convertFullLength(name, questions);

mkdirSync("content/exams", { recursive: true });
const out = `content/exams/${name}.json`;
writeFileSync(out, `${JSON.stringify(bank, null, 2)}\n`);

console.log(`${out}: ${bank.exams.length} sections, ${questions.length} questions, ${bank.topics.length} topics; ${unreviewed} not yet reviewed`);
for (const s of Object.keys(before)) console.log(`  ${s}  before ${JSON.stringify(before[s])}  after ${JSON.stringify(after[s])}`);
