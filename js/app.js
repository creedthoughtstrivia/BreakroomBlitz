// js/app.js — Solo init with schema normalizer + embedded fallback + verbose logs

(function () {
  const $ = (s) => document.querySelector(s);

  // Lazy element getters (avoid null crashes)
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

  // If packs can't be read, we still play
  const EMBEDDED_FALLBACK = [
    {
      id: "f1",
      text: "In what city is Dunder Mifflin Scranton?",
      choices: ["Scranton", "Akron", "Utica", "Buffalo"],
      answerIndex: 0,
    },
    {
      id: "f2",
      text: "Who is Regional Manager for most early seasons?",
      choices: ["Jim", "Michael", "Ryan", "Creed"],
      answerIndex: 1,
    },
    {
      id: "f3",
      text: "Dwight’s farm grows…",
      choices: ["Beets", "Corn", "Oranges", "Potatoes"],
      answerIndex: 0,
    },
  ];

  const log = (...a) => console.log("[SOLO]", ...a);
  const warn = (...a) => console.warn("[SOLO]", ...a);

  const LETTERS = ["A", "B", "C", "D", "E", "F]()
