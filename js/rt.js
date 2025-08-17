// js/rt.js — guarded Firebase helpers (won’t redeclare on double load)
(function () {
  // Prevent double init on pages that accidentally include rt.js twice
  if (window.__RT_INITED) {
    console.warn("[RT] rt.js already initialized; skipping re-init");
    return;
  }
  window.__RT_INITED = true;

  // Safe, idempotent global namespace
  window.FB = window.FB || {
    paths: {
      // adjust if your repo used different paths
      soloScores: "leaderboards/solo/entries",
      lobbies: "lobbies",
      matches: "matches",
    },
  };

  // fbReady: true only if Firestore db is present
  window.fbReady = window.fbReady || function fbReady() {
    try {
      return !!(window.fb && window.fb.firestore && window.fb.db);
    } catch {
      return false;
    }
  };

  // Add a solo score (no-op if Firebase not configured)
  window.addSoloScore = window.addSoloScore || async function addSoloScore(doc) {
    if (!window.fbReady()) return;
    const { firestore } = window.fb;
    const col = firestore.collection(window.fb.db, window.FB.paths.soloScores);
    await firestore.addDoc(col, { ...doc, createdAt: firestore.serverTimestamp() });
  };

  // Get top solo scores (falls back to [])
  window.getSoloTop = window.getSoloTop || async function getSoloTop(limit = 10) {
    if (!window.fbReady()) return [];
    const { firestore } = window.fb;
    const col = firestore.collection(window.fb.db, window.FB.paths.soloScores);
    const q = firestore.query(col, firestore.orderBy("score", "desc"), firestore.limit(limit));
    const snap = await firestore.getDocs(q);
    const rows = [];
    snap.forEach((d) => rows.push(d.data()));
    return rows;
  };

  // Clear solo scores (useful for Admin)
  window.clearSoloScores = window.clearSoloScores || async function clearSoloScores() {
    if (!window.fbReady()) return;
    const { firestore } = window.fb;
    const col = firestore.collection(window.fb.db, window.FB.paths.soloScores);
    const snap = await firestore.getDocs(col);
    const batch = firestore.writeBatch(window.fb.db);
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  };
})();
