// js/app.js — Robust Solo with schema normalization + diagnostics + safe fallbacks

(function () {
  const $ = (s) => document.querySelector(s);

  // Lazy getters to avoid null crashes
  const elName = () => $("#nameSolo");
  const elCount = () => $("#countSolo");
  const elStart = () => $("#btnStartSolo");
  const quizCard = () => $("#quizCard");
  const resultCard = () => $("#resultCard");
  const qBox = () => $("#questionBox");
  const btnNext = () => $("#btnNext");
  const summary = () => $("#resultSummary");
  const quizMeta = () => $("#quizMeta");
  const lbDiv = () => $("#leaderboard");

  const state = {
    started: false,
    finished: false,
    qIdx: -1,
    order: [],
    correct: 0,
    startMs: 0,
    name: "Player",
  };

  const EMBEDDED_FALLBACK = [
    { id: "f1", text: "In what city is Dunder Mifflin Scranton?", choices: ["Scranton","Akron","Utica","Buffalo"], answerIndex: 0 },
    { id: "f2", text: "Who is Regional Manager for most early seasons?", choices: ["Jim","Michael","Ryan","Creed"], answerIndex: 1 },
    { id: "f3", text: "Dwight’s farm grows…", choices: ["Beets","Corn","Oranges","Potatoes"], answerIndex: 0 },
  ];

  const LETTERS = ["A", "B", "C", "D", "E", "F", "G"];
  const log = (...a) => console.log("[SOLO]", ...a);
  const warn = (...a) => console.warn("[SOLO]", ...a);

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function show(el) { if (el) el.classList.remove("hidden"); }
  function hide(el) { if (el) el.classList.add("hidden"); }

  // --- Normalization helpers ------------------------------------------------

  // Map array<obj> choices -> strings, find boolean-correct
  function objectsToChoices(arr) {
    if (!Array.isArray(arr)) return { list: [], correctIndex: undefined, idMap: null };
    const list = [];
    let correctIndex = undefined;
    const idMap = []; // remember original ids for correctChoiceId patterns
    arr.forEach((o, i) => {
      const text = (o && (o.text ?? o.label ?? o.value ?? o.choice ?? o.name));
      if (typeof text === "string" && text.trim()) {
        list.push(text.trim());
        idMap.push(o.id ?? o.choiceId ?? o.key ?? i);
        if (correctIndex === undefined && (o.correct === true || o.isCorrect === true)) {
          correctIndex = list.length - 1;
        }
      }
    });
    return { list, correctIndex, idMap };
  }

  function coerceIndex(n, len) {
    if (!Number.isFinite(n)) return undefined;
    // Accept 0-based or 1-based
    if (n >= 0 && n < len) return n;
    if (n >= 1 && n <= len) return n - 1;
    return undefined;
  }

  function indexFromLetter(str, len) {
    if (typeof str !== "string") return undefined;
    const i = LETTERS.indexOf(str.trim().toUpperCase());
    return i >= 0 && i < len ? i : undefined;
  }

  function indexFromStringMatch(ans, choices) {
    if (typeof ans !== "string" || !choices?.length) return undefined;
    const t = ans.trim().toLowerCase();
    const i = choices.findIndex((c) => String(c).trim().toLowerCase() === t);
    return i >= 0 ? i : undefined;
  }

  // Accept MANY shapes and return {id,text,choices[],answerIndex}
  function normalizeQuestion(raw, idx) {
    if (!raw || typeof raw !== "object") return null;

    const text =
      raw.text ??
      raw.question ??
      raw.prompt ??
      raw.q ??
      (typeof raw.title === "string" ? raw.title : null);
    if (!text || typeof text !== "string") return null;

    let choices = [];
    let answerIndex;

    // 1) choices as array of strings
    if (Array.isArray(raw.choices) && raw.choices.every((x) => typeof x === "string")) {
      choices = raw.choices.slice();
    }

    // 2) options / answers as array of strings
    if (!choices.length && Array.isArray(raw.options) && raw.options.every((x) => typeof x === "string")) {
      choices = raw.options.slice();
    }
    if (!choices.length && Array.isArray(raw.answers) && raw.answers.every((x) => typeof x === "string")) {
      choices = raw.answers.slice();
    }

    // 3) choices/options/answers as array of objects
    if (!choices.length && Array.isArray(raw.choices) && raw.choices.length && typeof raw.choices[0] === "object") {
      const m = objectsToChoices(raw.choices);
      choices = m.list;
      if (m.correctIndex !== undefined) answerIndex = m.correctIndex;
      // Allow ID-based correctness: correctChoiceId matches choice.id
      if (answerIndex === undefined && (raw.correctChoiceId ?? raw.answerChoiceId) != null) {
        const needle = raw.correctChoiceId ?? raw.answerChoiceId;
        const pos = m.idMap?.indexOf(needle);
        if (pos >= 0) answerIndex = pos;
      }
    }
    if (!choices.length && Array.isArray(raw.options) && raw.options.length && typeof raw.options[0] === "object") {
      const m = objectsToChoices(raw.options);
      choices = m.list;
      if (m.correctIndex !== undefined) answerIndex = m.correctIndex;
    }
    if (!choices.length && Array.isArray(raw.answers) && raw.answers.length && typeof raw.answers[0] === "object") {
      const m = objectsToChoices(raw.answers);
      choices = m.list;
      if (m.correctIndex !== undefined) answerIndex = m.correctIndex;
    }

    // 4) A/B/C/D keys, or choice1..N / option1..N
    if (!choices.length) {
      const letterVals = LETTERS.map((L) => raw[L] ?? raw[L?.toLowerCase()]);
      const numbered = [];
      for (let i = 1; i <= 10; i++) {
        const v =
          raw["choice" + i] ??
          raw["Choice" + i] ??
          raw["option" + i] ??
          raw["Option" + i] ??
          raw["answer" + i] ??
          raw["Answer" + i];
        if (typeof v === "string") numbered.push(v);
      }
      const merged = []
        .concat(letterVals)
        .concat(numbered)
        .filter((v) => typeof v === "string" && v.trim().length);
      if (merged.length) choices = merged;
    }

    // Clean choices
    choices = (choices || []).map((c) => String(c).trim()).filter(Boolean);

    // 5) Find the answer index by many hints
    // numeric fields (0-based or 1-based)
    const numericCandidates = [
      raw.answerIndex, raw.correctIndex, raw.correctOption, raw.correctChoice, raw.correct,
      raw.answer,
    ].filter((x) => typeof x === "number");
    for (const n of numericCandidates) {
      const idxCoerced = coerceIndex(n, choices.length);
      if (idxCoerced !== undefined) { answerIndex = idxCoerced; break; }
    }

    // letter fields
    if (answerIndex === undefined) {
      const letterCandidates = [raw.correct, raw.answer, raw.correctLetter, raw.key];
      for (const s of letterCandidates) {
        const idxLetter = indexFromLetter(s, choices.length);
        if (idxLetter !== undefined) { answerIndex = idxLetter; break; }
      }
    }

    // string matching
    if (answerIndex === undefined) {
      const strCandidates = [raw.correctAnswer, raw.answerText, raw.answerString, raw.answer];
      for (const s of strCandidates) {
        const idxStr = indexFromStringMatch(s, choices);
        if (idxStr !== undefined) { answerIndex = idxStr; break; }
      }
    }

    // boolean answer → T/F
    if ((!choices.length || choices.length < 2) && typeof raw.answer === "boolean") {
      choices = ["True", "False"];
      answerIndex = raw.answer ? 0 : 1;
    }

    // Final guards
    if (!choices.length) return null;
    if (answerIndex === undefined || answerIndex < 0 || answerIndex >= choices.length) {
      // Default to first if unknown (prevents dead UI)
      answerIndex = 0;
    }

    return {
      id: raw.id ?? `norm-${idx}`,
      text,
      choices,
      answerIndex,
    };
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const n = normalizeQuestion(list[i], i);
      if (n) out.push(n);
    }
    return out;
  }

  async function fetc
