# Break Room Blitz – Office Trivia Game

Break Room Blitz is a rebranded fork of the Creed Thoughts trivia game. It retains the charm and hidden surprises of the original while presenting a general office‑themed quiz suitable for multiple communities. Play solo, host live matches, run tournaments and explore the office – all from your browser.

## Features

- **Solo Play** – Randomised questions drawn from all enabled packs. Local and Firebase leaderboards track your best scores.
- **Live Match & Tournament** – Host games with your friends. Players join using a match code and stay in sync as the host opens and closes questions.
- **Admin Panel** – Passcode‑protected page to adjust scoring rules, enable/disable packs, toggle easter eggs, clear leaderboards and view diagnostics.
- **Explore Dunder Mifflin** – A fun interactive map of the Scranton branch accessible from the navigation bar.
- **Easter Eggs** – Canonical quotes and a secret phrase (“Wonder Woman’s favorite winter salad recipes”) that triggers a hidden message. Eggs can be disabled via the Admin panel.

## Quick Start

1. **Install dependencies (optional)**

   The game is a static HTML/JS app. A local web server is required to run ES modules. If you wish to lint the code you can install dev dependencies:

   ```bash
   npm install
   ```

2. **Copy the environment file**

   ```bash
   cp .env.sample .env
   ```

   Then edit `.env` and set your `ADMIN_PASSCODE`, optional Firebase keys and the URLs of your Facebook groups.

3. **Run a local server**

   The repository includes a simple Python server:

   ```bash
   cd OfficeTrivia-deploy
   python3 serve.py
   # browse to http://localhost:8000
   ```

   Alternatively use Python’s built‑in server:

   ```bash
   python3 -m http.server 8000
   ```

## Firebase Configuration (optional)

To enable remote leaderboards and live matches that persist across devices, create a Firebase project and populate the keys in your `.env` file. Then set `enabled: true` in `js/config.js`. A minimal Firestore rules file is provided in `firebase.rules.sample`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /soloScores/{scoreId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /matches/{matchId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Deploy these rules from the Firebase console or via the CLI.

## Build & Deploy

A GitHub Actions workflow is included (`.github/workflows/deploy.yml`) that lints the code, copies the site into a `dist` folder and publishes it to GitHub Pages on every push to `main`. To deploy manually:

```bash
npm run lint  # optional, requires eslint installed
# copy files into a docs or dist folder and push the branch to GitHub
```

GitHub Pages will then serve the contents of the `dist` folder.

## Admin Passcode

The Admin panel is protected by a passcode. Set `ADMIN_PASSCODE` in your `.env` file. When you visit `/admin.html` you will be prompted for this passcode. Once entered correctly your session will remain authenticated until you click **Admin Logout** in the navigation.

## Testing Checklist

Use this checklist to verify major features before deploying:

- [ ] Solo game starts and displays the first question within 300 ms; answers are scored correctly.
- [ ] Completing a solo game writes the score to the leaderboard (Firebase when enabled, otherwise local).
- [ ] Leaderboard shows the top entries sorted by score (ties resolved by fastest time).
- [ ] Two browsers can join a Live Match: the host creates a game, players join with the code, questions open and close in sync (≤ 250 ms skew).
- [ ] Tournament mode (multiple rounds) runs at least two rounds and produces final standings.
- [ ] Admin panel prompts for the passcode; wrong codes are rejected; correct codes reveal settings, pack management, diagnostics and easter‑egg toggle.
- [ ] Clicking **Clear Solo Leaderboard** wipes remote scores; **Clear Local Leaderboard** wipes local scores.
- [ ] Toggle “Enable Easter Eggs” in Admin updates the behaviour of secret quotes and the hidden Wonder Woman phrase.
- [ ] Footer links to the Creed Thoughts and Office Addicts Facebook groups appear on every page and open in new tabs.
- [ ] Explore page is always accessible via the navigation bar.
- [ ] Lint passes without errors: `npx eslint .`

Enjoy your time in the break room and let us know what other features you’d like to see!