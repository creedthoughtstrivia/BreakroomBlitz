# Content Guidelines for The Office Trivia Questions

To maintain a high‑quality trivia experience, all questions included in the **Creed Thoughts Trivia** game must adhere to the following standards:

## 1. Accuracy and verifiability

- Each question must be factually correct and derived from either in‑universe events (episodes, characters, plot points and quotes) or well‑documented production history (casting, auditions, behind‑the‑scenes anecdotes).
- Avoid opinion‑based or ambiguous prompts.  Answers should be objectively verifiable from the series or reputable sources.
- Provide a `source` field for each question.  For story questions, reference the season and episode (e.g. `S5E14`).  For production questions, note the context (e.g. `Casting`, `Development` or the article title).

## 2. Unique identifiers

- Every question ID must follow the `OFF‑XXXX` format where `XXXX` is a zero‑padded sequence.  IDs should never be re‑used once published to avoid collisions with saved games or analytics.

## 3. Structure

Each question entry in a pack JSON file must include the following fields:

| Field        | Type       | Description                                                            |
|--------------|-----------|------------------------------------------------------------------------|
| `id`         | string     | Stable unique identifier (e.g., `OFF‑0123`).                           |
| `text`       | string     | The trivia prompt posed to the player.                                |
| `choices`    | string[]   | An array containing 3–5 answer options.                                |
| `answerIndex`| integer    | The zero‑based index of the correct choice in the `choices` array.    |
| `category`   | string     | High‑level grouping such as `Episodes`, `Characters`, `Quotes`, `Production`. |
| `source`     | string     | Episode code or production reference for traceability.                |

## 4. Balance and diversity

- Packs should strive for a roughly 70 % / 30 % split between in‑universe story questions and behind‑the‑scenes production questions.
- Within story questions, cover a range of categories: characters, episodes, plot arcs and memorable quotes.
- Production questions may touch on casting decisions, writing, filming, music, marketing and cultural impact.  Examples include facts about auditions (e.g. B.J. Novak being the first person cast【514104706711681†L144-L150】), casting what‑ifs (e.g. Adam Scott auditioning for Jim and Seth Rogen for Dwight【514104706711681†L155-L162】) or notable filming anecdotes (e.g. John Krasinski shooting Scranton footage used in the opening credits【514104706711681†L178-L190】).

## 5. Drop‑in pack format

- Packs must be valid JSON files following the schema shown in the main README.  A pack object contains a `packId`, `title`, `version` and an array of `questions`.
- A lightweight validator (implemented in code) ensures each question has all required fields and that `answerIndex` points to a valid position within `choices`.
- To add a new pack, place the JSON file under the `packs/` directory and register it in `packs/index.js` or rely on auto‑discovery.  Administrators can enable/disable packs through the admin panel.

## 6. Fact‑check checklist

Before committing questions, run through this checklist:

- [ ] Confirm the prompt and answer are correct by re‑watching the episode or consulting a reliable source.
- [ ] Ensure distractor choices are plausible but clearly incorrect.
- [ ] Verify the question doesn’t duplicate or closely replicate an existing one.
- [ ] Provide a proper source reference for future auditing.
- [ ] Run the pack through the validator to catch structural errors.

Adhering to these guidelines keeps the trivia fair, engaging and respectful to the creators and fans of *The Office*.