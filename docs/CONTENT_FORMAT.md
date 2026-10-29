# Question bank format

Practice content can be written as one JSON file and loaded through **Admin → Import**, or from the command line:

```bash
npm run content:import -- path/to/bank.json --dry-run          # validate only
npm run content:import -- path/to/bank.json --status REVIEW    # load for review
```

Imports never publish directly. New content lands as `DRAFT` or `REVIEW`, and you publish it from **Admin → Content** after checking it. That's where the publish rules run: exactly one correct answer, an explanation, and the passage published before its questions.

The shipped example is [`content/samples/sample-bank.json`](../content/samples/sample-bank.json).

## Shape

```jsonc
{
  "version": 1,
  "topics": [
    { "slug": "cp-acid-base", "name": "Acids, bases and buffers", "section": "CP" }
  ],
  "exams": [
    {
      "slug": "cp-set-2",                // URL: /practice/cp-set-2
      "title": "Chem/Phys set 2",
      "description": "One line shown on the practice page.",
      "section": "CP",                   // CP | BB | PS | CARS
      "timeLimitMinutes": 13,            // used in timed mode (~1.6 min per question matches MCAT pace)
      "isSample": false,
      "items": [
        {
          "type": "passage",
          "id": "cp-p-electrochem-1",    // stable id: re-importing updates this passage in place
          "title": "Galvanic cells",
          "body": "First paragraph.\n\nSecond paragraph.",  // a blank line separates paragraphs
          "source": "Optional citation for adapted material",
          "questions": [ /* questions, same shape as below without "type" */ ]
        },
        {
          "type": "discrete",
          "id": "cp-q-ohms-law-2",
          "stem": "Question text.",
          "choices": [
            { "label": "A", "text": "…", "rationale": "Why A is wrong" },
            { "label": "B", "text": "…", "correct": true, "rationale": "Why B is right" },
            { "label": "C", "text": "…", "rationale": "…" },
            { "label": "D", "text": "…", "rationale": "…" }
          ],
          "explanation": "Full worked explanation shown after submission.",
          "topics": ["cp-circuits"],     // must be listed in "topics"
          "difficulty": 2                // optional, 1-5
        }
      ]
    }
  ]
}
```

## Rules the validator enforces

- `id` and `slug` values: lowercase letters, digits and dashes.
- Each question has exactly four choices, labeled A–D in order, with exactly one `"correct": true`.
- Question ids are unique across the whole file.
- Every topic a question uses is declared in `topics`.

## Re-importing

The importer matches on `id` and `slug`, so you can fix a typo and import the same file again:

- Questions and passages are updated in place.
- Choices are updated by label, so answers students already gave still point to the right choice.
- Exam item order is rebuilt from the file. Attempts already in progress keep the order they started with.

Editing a passage `body` after students have highlighted it shifts their stored highlights. Do that before publishing where you can.

Diagrams aren't part of the JSON. Upload them on the question or passage edit page after importing.
