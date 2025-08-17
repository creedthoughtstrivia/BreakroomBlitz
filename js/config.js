// Configuration file for Creed Thoughts trivia game.
// Adjust these values before deploying to production. The OWNER_PASSCODE should
// be randomized and kept secret. QUESTION_SETS can be extended with
// additional JSON files placed under a `questions/` directory.
// In a traditional ES module environment the constants below would be exported.
// However, when loading this file directly via `file://` without a web server
// module imports are disallowed. We instead define the objects and then
// assign them to the global `window` so other scripts can access them.
// Build the APP configuration.  Question sets are now derived from
// window.PACKS, which is populated in packs/index.js.  Each enabled
// pack contributes an entry with `id`, `title` and `path`.  This makes
// adding or removing packs as simple as editing packs/index.js.  A
// fallback passcode is provided for demo purposes; administrators
// should override this via the ADMIN_PASSCODE environment variable in
// production.
const APP = {
  // Replace with your randomized value before deploy.  When running
  // locally you can specify ADMIN_PASSCODE in the environment to
  // override this default.
  OWNER_PASSCODE: window.ADMIN_PASSCODE || "dwight-rules-1982",
  DEFAULTS: {
    BASE_CORRECT: 100,
    SPEED_MAX: 50,
    FIRST_CORRECT: 100,
    TIME_PER_Q: 25,
    SHUFFLE_Q: true,
    SHUFFLE_A: true,
    DAILY_SEED: false,
    SOLO_RETENTION_DAYS: 7
  },
  // Derived list of question sets from packs.  If PACKS is undefined
  // (e.g. when scripts load in an unexpected order) fall back to an empty
  // array.  Each pack descriptor becomes a set with the same id and
  // title and points to its JSON path.  Only enabled packs are
  // included.
  get QUESTION_SETS() {
    const packs = window.PACKS || [];
    // respect disabled packs stored in localStorage.  Admin can toggle
    // packs on and off; the disabled IDs are stored under ct_disabled_packs
    let disabled = [];
    try {
      disabled = JSON.parse(localStorage.getItem('ct_disabled_packs') || '[]');
    } catch { disabled = []; }
    return packs.filter(p => {
      // Update the enabled flag based on stored disabled list
      const isDisabled = disabled.includes(p.packId);
      p.enabled = !isDisabled;
      return p.enabled;
    }).map(p => ({
      id: p.packId,
      title: p.title,
      path: p.path
    }));
  }
};

// Firebase configuration. Paste values from your Firebase console here. Set
// `enabled` to false to run the game locally without persistence.
const FB = {
  // Disable Firebase by default in the offline edition. When enabled is
  // true the game will attempt to load the Firebase SDK via dynamic import,
  // which is only supported in module contexts.
  enabled: false,
  config: {
    apiKey: "PASTE_HERE",
    authDomain: "PASTE_HERE.firebaseapp.com",
    projectId: "PASTE_HERE",
    storageBucket: "PASTE_HERE.appspot.com",
    messagingSenderId: "PASTE_HERE",
    appId: "PASTE_HERE",
    databaseURL: ""
  },
  paths: {
    soloScores: "soloScores",
    matches: "matches"
  }
};

// Expose configuration objects globally. Doing this allows the game to run
// without ES module imports when loaded from a local file.
window.APP = APP;
window.FB = FB;