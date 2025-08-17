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

  const LETTERS = ["A","B","C","D","E","F","G"];
  const log = (...a) => console.log("[SOLO]", ...a);
  const warn = (...a) => console.warn("[SOLO]", ...a);

  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function show(el){ if (el) el.classList.remove("hidden"); }
  function hide(el){ if (el) el.classList.add("hidden"); }

  // ---------- Normalization helpers ----------

  function objectsToChoices(arr){
    if (!Array.isArray(arr)) return { list: [], correctIndex: undefined, idMap: null };
    const list = []; let correctIndex; const idMap = [];
    arr.forEach((o,i)=>{
      const text = o && (o.text ?? o.label ?? o.value ?? o.choice ?? o.name);
      if (typeof text === "string" && text.trim()){
        list.push(text.trim());
        idMap.push(o.id ?? o.choiceId ?? o.key ?? i);
        if (correctIndex === undefined && (o.correct === true || o.isCorrect === true)){
          correctIndex = list.length - 1;
        }
      }
    });
    return { list, correctIndex, idMap };
  }

  function coerceIndex(n,len){
    if (!Number.isFinite(n)) return undefined;
    if (n >= 0 && n < len) return n;     // 0-based
    if (n >= 1 && n <= len) return n-1;  // 1-based
    return undefined;
  }

  function indexFromLetter(str,len){
    if (typeof str !== "string") return undefined;
    const i = LETTERS.indexOf(str.trim().toUpperCase());
    return i >= 0 && i < len ? i : undefined;
  }

  function indexFromStringMatch(ans,choices){
    if (typeof ans !== "string" || !choices?.length) return undefined;
    const t = ans.trim().toLowerCase();
    const i = choices.findIndex(c => String(c).trim().toLowerCase() === t);
    return i >= 0 ? i : undefined;
  }

  function normalizeQuestion(raw, idx){
    if (!raw || typeof raw !== "object") return null;

    const text = raw.text ?? raw.question ?? raw.prompt ?? raw.q ?? (typeof raw.title === "string" ? raw.title : null);
    if (!text || typeof text !== "string") return null;

    let choices = []; let answerIndex;

    // arrays of strings
    if (Array.isArray(raw.choices) && raw.choices.every(x=>typeof x==="string")) choices = raw.choices.slice();
    if (!choices.length && Array.isArray(raw.options) && raw.options.every(x=>typeof x==="string")) choices = raw.options.slice();
    if (!choices.length && Array.isArray(raw.answers) && raw.answers.every(x=>typeof x==="string")) choices = raw.answers.slice();

    // arrays of objects
    if (!choices.length && Array.isArray(raw.choices) && raw.choices.length && typeof raw.choices[0]==="object"){
      const m = objectsToChoices(raw.choices); choices = m.list; if (m.correctIndex!==undefined) answerIndex = m.correctIndex;
      if (answerIndex===undefined && (raw.correctChoiceId ?? raw.answerChoiceId) != null){ const pos = m.idMap?.indexOf(raw.correctChoiceId ?? raw.answerChoiceId); if (pos>=0) answerIndex = pos; }
    }
    if (!choices.length && Array.isArray(raw.options) && raw.options.length && typeof raw.options[0]==="object"){
      const m = objectsToChoices(raw.options); choices = m.list; if (m.correctIndex!==undefined) answerIndex = m.correctIndex;
    }
    if (!choices.length && Array.isArray(raw.answers) && raw.answers.length && typeof raw.answers[0]==="object"){
      const m = objectsToChoices(raw.answers); choices = m.list; if (m.correctIndex!==undefined) answerIndex = m.correctIndex;
    }

    // A/B/C/D or choice1..N / option1..N
    if (!choices.length){
      const letterVals = LETTERS.map(L => raw[L] ?? raw[L?.toLowerCase()]);
      const numbered = [];
      for (let i=1;i<=10;i++){
        const v = raw["choice"+i] ?? raw["Choice"+i] ?? raw["option"+i] ?? raw["Option"+i] ?? raw["answer"+i] ?? raw["Answer"+i];
        if (typeof v === "string") numbered.push(v);
      }
      const merged = [].concat(letterVals, numbered).filter(v => typeof v==="string" && v.trim().length);
      if (merged.length) choices = merged;
    }

    choices = (choices || []).map(c => String(c).trim()).filter(Boolean);

    // answer index candidates (numeric / letter / string)
    const nums = [raw.answerIndex, raw.correctIndex, raw.correctOption, raw.correctChoice, raw.correct, raw.answer].filter(x=>typeof x==="number");
    for (const n of nums){ const ci = coerceIndex(n, choices.length); if (ci!==undefined){ answerIndex = ci; break; } }
    if (answerIndex===undefined){
      const lets = [raw.correct, raw.answer, raw.correctLetter, raw.key];
      for (const s of lets){ const li = indexFromLetter(s, choices.length); if (li!==undefined){ answerIndex = li; break; } }
    }
    if (answerIndex===undefined){
      const strs = [raw.correctAnswer, raw.answerText, raw.answerString, raw.answer];
      for (const s of strs){ const si = indexFromStringMatch(s, choices); if (si!==undefined){ answerIndex = si; break; } }
    }

    // boolean → T/F
    if ((!choices.length || choices.length < 2) && typeof raw.answer === "boolean"){
      choices = ["True","False"]; answerIndex = raw.answer ? 0 : 1;
    }

    if (!choices.length) return null;
    if (answerIndex===undefined || answerIndex<0 || answerIndex>=choices.length) answerIndex = 0;

    return { id: raw.id ?? `norm-${idx}`, text, choices, answerIndex };
  }

  function normalizeList(list){
    if (!Array.isArray(list)) return [];
    const out = [];
    for (let i=0;i<list.length;i++){ const n = normalizeQuestion(list[i], i); if (n) out.push(n); }
    return out;
  }

  async function fetchJSON(path){
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  async function loadRawAndNormalized(){
    const PACKS = Array.isArray(window.PACKS) ? window.PACKS : [];
    const disabled = JSON.parse(localStorage.getItem("ct_disabled_packs") || "[]");
    const enabled = PACKS.filter(p => !disabled.includes(p.packId));
    log("PACKS declared:", PACKS.length, "enabled:", enabled.length);

    const rawAll = []; const normalizedAll = [];
    for (const p of enabled){
      try {
        log("Fetching pack:", p.path);
        const data = await fetchJSON(p.path);
        const rawQs = Array.isArray(data?.questions) ? data.questions : data;
        const norm = normalizeList(rawQs);
        log(`Pack ${p.packId}: raw ${Array.isArray(rawQs)?rawQs.length:0}, normalized ${norm.length}`);
        if (Array.isArray(rawQs)) rawAll.push(...rawQs);
        normalizedAll.push(...norm);
      } catch(e){
        warn("Pack load failed:", p.path, e);
      }
    }
    return { rawAll, normalizedAll };
  }

  // ---------- Render ----------
  function renderQuestion(){
    const q = state.order[state.qIdx];
    if (!q){ warn("No question at idx", state.qIdx); return; }

    if (quizMeta()) quizMeta().textContent = `Q ${state.qIdx+1} / ${state.order.length}`;

    if (qBox()){
      qBox().innerHTML = "";
      const h = document.createElement("h3"); h.textContent = q.text; qBox().appendChild(h);
