# Architecture Notes – Creed Thoughts Trivia (MVP Overhaul)

This document gives a high‑level overview of how the existing Creed Thoughts Trivia codebase is organised.  It is intended as a starting point for the MVP overhaul effort.  The notes here describe the current modules, data flow and game modes so that you can understand where to plug in new features or refactor existing ones.

## Top‑level structure

```
OfficeTrivia-main/
├── README.md           – project description and usage instructions
├── admin.html          – Admin panel for viewing/managing question sets and scores
├── index.html          – Landing page that links to the Solo, Live and Leaderboard screens
├── leaderboard.html    – Standalone page showing solo high scores
├── live.html           – Host lobby and controls for real‑time tournaments
├── room.html           – Player client for live tournaments
├── solo.html           – Solo play quiz interface
├── serve.py            – Simple Python HTTP server for local development
├── css/                – Tailwind‑based stylesheet
├── assets/             – Images and (placeholder) audio
├── js/                 – Client‑side logic
└── questions/          – JSON question packs
```

The game is delivered as a static web app.  Each HTML page loads the necessary scripts directly via `<script>` tags instead of using a module bundler.  The JavaScript files attach their APIs to the global `window` object so they can be consumed in the browser without ES module support.

## JavaScript modules

### `js/config.js`

This file defines global configuration objects:

* **`APP`** – Contains default scoring/timing values, a hard‑coded owner passcode, and a list of question set descriptors.  Each descriptor has an `id`, a human‑readable `title` and a relative `path` to a JSON file under `questions/`.
* **`FB`** – Holds Firebase configuration and database paths.  When `FB.enabled` is set to `true`, the game will load Firebase modules on demand and persist scores/matches.

These objects are assigned to `window.APP` and `window.FB` so that other scripts can access them without imports.

### `js/rt.js` – Real‑time backend wrapper

This module wraps all interaction with Firebase.  It exposes functions such as:

* **`fbInit()`** – Lazy‑loads Firebase libraries from the CDN and initialises Firestore and Realtime Database clients.  Called at script load.
* **`addSoloScore(doc)`**, **`getSoloTop(limit)`**, **`clearSoloScores()`** – CRUD operations for the solo leaderboard stored under `FB.paths.soloScores`.
* **`createMatch({ code, hostPin, config, questions })`** – Creates a new match document with an arbitrary code, host PIN, scoring config and a pre‑shuffled list of questions.  Returns the document ID.
* **`findMatchByCode(code)`** – Returns the match document by its display code.
* **`joinMatch(matchId, playerId, name)`** – Adds a player to the `players` map in the match document.
* **`subscribeMatch(matchId, handler)`** – Subscribes to Firestore snapshot updates and invokes a handler whenever the match state changes.
* **`hostAction(matchId, hostPin, patch)`** – Applies host‑authorised state transitions such as opening/closing questions, awarding points or advancing rounds.
* **`submitAnswer({ matchId, playerId, idx, correct, ms })`** – Records a player’s answer in a transactional update and updates `firstCorrect` when appropriate.
* **`endMatch(matchId)`** – Marks the match as ended.

All of these functions are attached to `window.*` so they can be called from pages that cannot import modules.

### `js/sound.js`

Responsible for synthesising short audio tones using the Web Audio API.  Defines a single function `playSound(type)` that plays different sweeps for `click`, `correct` or `wrong` events.  The function ensures only one `AudioContext` is created and resumes it on user interaction.  This file assigns `playSound` to `window.playSound`.

### `js/app.js` – Solo play logic

Loaded by **`solo.html`**, this script implements the entire single‑player quiz flow:

1. **Initialisation** – On load, it populates the question set dropdown from `APP.QUESTION_SETS` and loads any saved settings from `localStorage`.
2. **Leaderboard** – Calls `fbReady()` and `getSoloTop()` to populate the high‑score list.  If Firebase is disabled, the UI indicates that scores are local only.
3. **Start quiz** – When the player presses “Start”, the script fetches the selected question set JSON via `fetch(set.path)`.  It shuffles questions and answer choices if configured, slices to the requested count and initialises game state.
4. **Render questions** – Displays the prompt, optional image/audio, multiple choice answers and a countdown timer.  Upon answer selection or timer expiry, the question is locked.  Points are awarded based on correctness and response speed.
5. **Finish quiz** – Shows a summary with total score and duration.  If Firebase is enabled, the score is submitted via `addSoloScore()`.  Leaderboard is refreshed.

The script uses helper functions for shuffling arrays and calculating speed bonuses.  All UI state is manipulated via DOM queries.

### `js/live.js` – Host UI for live matches

Loaded by **`live.html`**, this script provides the interface for creating and controlling tournaments:

* Populates a dropdown with available question sets.
* On “Create”, the host specifies a match code, host PIN, question set, question count and per‑question time limit.  The script fetches the question set, shuffles questions/answers, truncates to the specified length and calls `createMatch()` with a scoring config.
* Once a match is created, the host is subscribed to updates via `subscribeMatch()`.  The UI displays the number of players, current question index and match state.
* Host controls allow opening a question (`state` transitions from `lobby`/`closed` to `open`), closing a question (awarding points based on correctness and speed), moving to the next question and ending the match.
* The live leaderboard is rendered on each update by sorting the `players` map by score and listing names, scores and first‑correct counts.

### `js/room.js` – Player client for live matches

Loaded by **`room.html`**, this script reads query parameters `mid` (match ID) and `pid` (player ID) from the URL.  It subscribes to the match document and updates the UI in real time:

* Displays the current match code and state.
* Renders a multiple choice question when `d.state === 'open'` and a new `qIndex` is seen.
* Provides buttons for each answer and calls `submitAnswer()` when the player selects one.  The client does not wait for host confirmation; it highlights the selected answer immediately and prevents multiple submissions.
* Shows a countdown timer for the current question.
* Updates the local leaderboard as the host awards points.

## HTML pages

### `index.html` (Landing page)

Provides a simple welcome screen with links to Solo Play (`solo.html`), Live Match (`live.html`), Leaderboard (`leaderboard.html`) and Admin (`admin.html`).  The bar background image is set via CSS.

### `solo.html`

Contains the form for entering player name, selecting a question set and number of questions, and starting the quiz.  During play it shows the question prompt, answer buttons, a timer, and at the end a summary card with share button.

### `live.html`

Split into two sections: host and join.  Hosts can create a match by entering a match code, host PIN and selecting question set/length.  Joining players supply their name and match code.  Host controls (open/close/next/end) are shown after a match is created.

### `room.html`

Used by players joining a live match.  It shows match information, renders questions and a timer, and displays the live leaderboard.  It obtains the match ID and player ID from query parameters and therefore can be opened in multiple tabs/devices concurrently.

### `admin.html`

A minimal page intended for administrators.  It currently loads the leaderboard and a button to clear scores.  The owner passcode from `APP.OWNER_PASSCODE` is required for destructive operations.  In the MVP overhaul this page will be expanded to validate and manage question packs, enable/disable packs, view basic analytics and export the current question set.

## Data models

### Question objects (JSON)

Each file under `questions/` is a JSON document with the following structure:

```json
{
  "id": "creed-basics-001",
  "title": "Creed Basics Vol. 1",
  "version": "1.0.0",
  "questions": [
    {
      "id": "CB1-001",
      "prompt": "What is Creed’s job title at Dunder Mifflin?",
      "answers": ["Quality Assurance", "Human Resources", "Sales", "Reception"],
      "correctIndex": 0,
      "category": "Characters",
      "source": "S2E3"
    },
    …
  ]
}
```

While the current game does not enforce strict schemas, each question object typically contains:

| Field         | Type    | Description                                                       |
|-------------- |-------  |-------------------------------------------------------------------|
| `id`          | string  | Unique question identifier                                        |
| `prompt`      | string  | Question text (HTML allowed)                                      |
| `answers`     | string[]| 3–5 multiple choice options                                        |
| `correctIndex`| number  | Index into the `answers` array for the correct option             |
| `category`    | string  | Optional category such as “Characters”, “Episodes”, “Production” |
| `source`      | string  | Optional reference (episode code, season, production note)         |
| `timeLimitSec`| number  | Optional override for per‑question time limit (defaults apply)    |

### Match documents (Firestore)

Live tournaments are stored in Firestore documents under `FB.paths.matches`.  The document schema looks like:

```json
{
  "code": "ABCDE",             // display code used by players to join
  "hostPin": "123456",         // secret PIN for host actions
  "state": "lobby",            // one of "lobby", "open", "closed", "ended"
  "qIndex": -1,                 // current question index
  "config": {
    "base": 100,
    "speedMax": 50,
    "first": 100
  },
  "createdAt": <Timestamp>,
  "players": {
    "p_abcd1234": { "name": "Dwight", "score": 200, "answered": true, "avgMs": 3500, "firsts": 1 },
    …
  },
  "firstCorrect": { "qIdx": 3, "playerId": "p_abcd1234" },
  "questionStartAt": <Timestamp>,
  "answers": {
    "3": {
      "p_abcd1234": { "idx": 2, "correct": true, "ms": 1500, "at": <Timestamp> },
      …
    },
    …
  },
  "questions": [
    {
      "id": "CB1-001",
      "prompt": "What is Creed’s job title at Dunder Mifflin?",
      "answers": ["Quality Assurance", "Human Resources", "Sales", "Reception"],
      "correctIndex": 0,
      "timeLimitSec": 25
    },
    …
  ]
}
```

### Solo leaderboard documents

Solo high scores are stored under the collection path defined by `FB.paths.soloScores`.  Each document has:

```json
{
  "name": "Pam",
  "score": 450,
  "durationMs": 34000,
  "createdAt": <Timestamp>
}
```

## Game flow summary

### Solo mode

1. Player selects a question set and number of questions.
2. `solo.html` loads `js/app.js`, which reads the JSON file for the set and shuffles questions/answers as configured.
3. Each question is displayed with a countdown.  Player taps an answer; the script immediately marks correct/incorrect, awards points and moves on.
4. After the last question, the script shows a summary and optionally records the result via Firebase.

### Live tournament mode

1. Host creates a match with a display code and host PIN.  Questions are pre‑shuffled and trimmed on creation.
2. Players join using the code; each is assigned a unique ID stored in `localStorage`.
3. Host opens question 0.  All connected players receive the question via snapshot updates and can answer within the time limit.
4. Host closes the question; the script awards points to players based on correctness, speed and a first‑correct bonus.  The live leaderboard is updated.
5. Host can proceed to the next question or end the match.  When all questions are complete, the match state is set to `ended` and no further updates occur.

## Areas for improvement (for the MVP overhaul)

* **Type safety** – The current codebase is plain JavaScript.  Introducing TypeScript or JSDoc typings would catch many errors at build time.
* **Code structure** – The reliance on global variables and in‑place DOM manipulation makes the code harder to test.  Modularising logic and separating concerns will make future features easier to add.
* **Question pack architecture** – Question sets are referenced via `APP.QUESTION_SETS`.  A more flexible mechanism to auto‑discover JSON files from a `/packs/` directory and validate them on load is needed.
* **Testing** – There are currently no automated tests.  Unit tests for pack validation, scoring and randomisation, plus end‑to‑end tests for solo and live flows, should be introduced along with a GitHub Actions workflow.
* **Admin tools** – The admin page should be expanded to allow pack management (enable/disable, validate), analytics (most missed questions) and exporting the current merged question set.  Access should be secured with a passcode.

These notes should serve as a map when planning the MVP work described in the project brief.