// app.js
// Solo play logic for the enhanced Creed Thoughts trivia game. This module
// handles question selection, timing, scoring and integrates audio feedback.

// When running without module support, use globals assigned by config.js,
// rt.js and sound.js.
const APP = window.APP;
const fbReady = window.fbReady;
const addSoloScore = window.addSoloScore;
const getSoloTop = window.getSoloTop;
const playSound = window.playSound;

// Easter egg: a selection of canonical quotes that may appear after a
// correct answer.  A random quote from this list will surface on rare
// occasions to delight the player.
const QUOTES = [
  "Bears. Beets. Battlestar Galactica.",
  "I am Beyoncé, always.",
  "That's what she said!",
  "I'm not superstitious, but I am a little stitious.",
  "Sometimes I'll start a sentence and I don't even know where it's going."
];

const el = s => document.querySelector(s);
const nameSolo = el('#nameSolo');
// Reference to the (now hidden) question set selector.  Solo mode will
// randomise questions across all enabled packs rather than restricting to
// a single category.
const setSolo  = el('#setSolo');
const countSolo= el('#countSolo');
const btnStart = el('#btnStartSolo');
const lbDiv    = el('#leaderboard');

const quizCard = el('#quizCard');
const resultCard = el('#resultCard');
const qBox = el('#questionBox');
const btnNext = el('#btnNext');
const resultSummary = el('#resultSummary');
const quizMeta = el('#quizMeta');
const btnShare = el('#btnShare');

// Load settings from localStorage with defaults from config
let settings = loadSettings();
function loadSettings(){
  try {
    const override = JSON.parse(localStorage.getItem('ct_settings')||'{}');
    return { ...APP.DEFAULTS, ...override };
  } catch { return APP.DEFAULTS; }
}

// Initialize select list and leaderboard
// Initialise the select list and leaderboard. The question set dropdown
// is still populated for backwards compatibility, but solo mode will
// ignore the selection and draw from all packs. The start button is
// disabled until Firebase has initialised (if enabled) to avoid
// undefined calls into the real‑time database.
(function init(){
  // Populate the hidden select in case legacy code or admin views rely on it.
  APP.QUESTION_SETS.forEach(s=>{
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.title;
    setSolo.appendChild(o);
  });
  // Disable start until Firebase is ready or until we determine it isn't being used.
  if (btnStart) btnStart.disabled = true;
  // Wait briefly for Firebase to initialise; then enable start. If Firebase
  // isn’t enabled, fbReady() returns false but we still allow local play.
  const checkReady = setInterval(() => {
    try {
      // When FB.enabled is false, fbReady() returns false but there is no need
      // to wait. When FB.enabled is true, fbReady() will become true when
      // initialise finishes.
      const fbEnabled = window.FB && window.FB.enabled;
      if (!fbEnabled || fbReady()) {
        btnStart.disabled = false;
        clearInterval(checkReady);
      }
    } catch {
      // In case fbReady throws before assignment; still enable start
      btnStart.disabled = false;
      clearInterval(checkReady);
    }
  }, 200);
  refreshLB();
})();

async function refreshLB(){
  // Indicate loading status depending on Firebase configuration
  const localOnly = !(window.FB && window.FB.enabled);
  lbDiv.innerHTML = localOnly ? 'Local‑only (enable Firebase in config.js)' : 'Loading…';
  let rows;
  if (fbReady()) {
    // Use remote leaderboard when available
    rows = await getSoloTop(20);
  } else {
    // Fallback to local storage when Firebase is disabled or not initialised
    try {
      const arr = JSON.parse(localStorage.getItem('ct_solo_scores') || '[]');
      arr.sort((a,b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.durationMs - b.durationMs;
      });
      rows = arr.slice(0, 20);
    } catch {
      rows = [];
    }
  }
  if (!rows || rows.length === 0) {
    lbDiv.textContent = 'No scores yet.';
    return;
  }
  const ol = document.createElement('ol');
  rows.forEach(r=>{
    const li = document.createElement('li');
    li.textContent = `${r.name}: ${r.score} pts (${Math.round(r.durationMs/1000)}s)`;
    ol.appendChild(li);
  });
  lbDiv.innerHTML = '';
  lbDiv.appendChild(ol);
}

// Start quiz on button click.  Solo mode now pulls a random mix of
// questions from all enabled packs instead of a single pack.  The
// question count is bounded by the user input.  The start button is
// disabled while the quiz is prepared to prevent accidental double clicks.
btnStart.addEventListener('click', async ()=>{
  playSound('click');
  const name = (nameSolo.value||'Player').trim().slice(0,20);
  const count = Math.max(5, Math.min(50, parseInt(countSolo.value||'12',10)));
  // Fetch and merge questions from all enabled packs
  const sets = APP.QUESTION_SETS;
  let allQs = [];
  await Promise.all(sets.map(async (s) => {
    try {
      const res = await fetch(s.path);
      const data = await res.json();
      const qs = Array.isArray(data.questions) ? data.questions.slice() : Array.isArray(data) ? data.slice() : [];
      qs.forEach(q => allQs.push(q));
    } catch (e) {
      console.error('Failed to load pack', s.path, e);
    }
  }));
  // Normalise question fields (prompt, answers, correctIndex, timeLimit)
  allQs = allQs.map(q => {
    const n = { ...q };
    if (!n.prompt) n.prompt = q.text || q.question || '';
    if (!n.answers) n.answers = q.choices || q.options || [];
    if (n.correctIndex === undefined && q.answerIndex !== undefined) n.correctIndex = q.answerIndex;
    if (!n.timeLimitSec && n.timeLimitSeconds) n.timeLimitSec = n.timeLimitSeconds;
    return n;
  });
  // Shuffle and pick the requested number of questions
  if (settings.SHUFFLE_Q) shuffle(allQs);
  const qs = allQs.slice(0, count);
  qs.forEach(q => {
    if (settings.SHUFFLE_A && Array.isArray(q.answers)) {
      q._answerMap = q.answers.map((a,i)=>({a,i}));
      shuffle(q._answerMap);
      q._correctIndexShuffled = q._answerMap.findIndex(x=>x.i===q.correctIndex);
    } else {
      q._answerMap = Array.isArray(q.answers) ? q.answers.map((a,i)=>({a,i})) : [];
      q._correctIndexShuffled = q.correctIndex;
    }
  });
  startQuiz({ name, qs });
});

let state = null;
function startQuiz({ name, qs }){
  state = {
    name, qs, idx:0, score:0, startAt: performance.now(), perQ: []
  };
  quizCard.classList.remove('hidden');
  resultCard.classList.add('hidden');
  renderQ();
}

let timerId=null, timeLeft=0;
function renderQ(){
  const q = state.qs[state.idx];
  quizMeta.innerHTML = `${state.name} • Q ${state.idx+1}/${state.qs.length}`;
  qBox.innerHTML = `${q.prompt}`;
  if (q.image) qBox.insertAdjacentHTML('beforeend', `<img src="${q.image}" alt="" style="max-width:100%;margin-top:8px;">`);
  if (q.audio) qBox.insertAdjacentHTML('beforeend', `<audio controls src="${q.audio}"></audio>`);
  q._selected = null;
  q._start = performance.now();
  const answersDiv = document.createElement('div');
  q._answerMap.forEach((row, idx)=>{
    const d = document.createElement('div');
    d.className = 'answer';
    d.textContent = row.a;
    d.addEventListener('click', ()=>selectAns(idx));
    answersDiv.appendChild(d);
  });
  qBox.appendChild(answersDiv);
  btnNext.disabled = true;
  btnNext.onclick = nextQ;
  timeLeft = q.timeLimitSec || settings.TIME_PER_Q;
  updateTimer();
  clearInterval(timerId);
  timerId = setInterval(updateTimer, 1000);
}

function updateTimer(){
  const t = document.getElementById('timer');
  if (!t) return;
  t.textContent = `${timeLeft}s`;
  if (timeLeft <= 0) {
    clearInterval(timerId);
    lockQuestion();
  }
  timeLeft--;
}

function selectAns(shuffledIdx){
  const q = state.qs[state.idx];
  if (q._locked) return;
  q._selected = shuffledIdx;
  [...qBox.querySelectorAll('.answer')].forEach((d,i)=>{
    d.classList.toggle('selected', i===shuffledIdx);
  });
  lockQuestion();
}

function lockQuestion(){
  const q = state.qs[state.idx];
  if (q._locked) return;
  q._locked = true;
  clearInterval(timerId);
  const ms = Math.max(0, performance.now() - q._start);
  const correct = q._selected === q._correctIndexShuffled;
  if (correct) playSound('correct'); else playSound('wrong');
  const base = correct ? settings.BASE_CORRECT : 0;
  let speed = 0;
  if (correct) {
    const maxMs = 5000;
    const ratio = Math.max(0, Math.min(1, (maxMs - Math.min(ms,maxMs)) / maxMs));
    speed = Math.round(settings.SPEED_MAX * ratio);
  }
  const qScore = base + speed;
  state.score += qScore;
  state.perQ.push({ correct, ms, qScore });
  const nodes = qBox.querySelectorAll('.answer');
  nodes.forEach((d,i)=>{
    if (i===q._correctIndexShuffled) d.classList.add('correct');
    if (i===q._selected && i!==q._correctIndexShuffled) d.classList.add('wrong');
  });
  btnNext.disabled = false;

  // Easter egg: occasionally display a canonical quote when the answer is
  // correct.  This happens roughly 1 in 8 times.
  if (correct && Math.random() < 0.125) {
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    // Show quote in a non‑blocking alert.  In production this could be
    // replaced with an animated overlay.
    setTimeout(() => {
      alert(quote);
    }, 10);
  }
}

function nextQ(){
  if (state.idx < state.qs.length-1) {
    state.idx++;
    renderQ();
  } else {
    finishQuiz();
  }
}

async function finishQuiz(){
  quizCard.classList.add('hidden');
  resultCard.classList.remove('hidden');
  const durationMs = Math.max(0, performance.now() - state.startAt);
  resultSummary.innerHTML = `${state.name} scored ${state.score} in ${Math.round(durationMs/1000)}s.`;
  if (fbReady()) {
    await addSoloScore({ name: state.name, score: state.score, durationMs });
  }
  // Persist the score locally. This allows leaderboards to work even when
  // Firebase is disabled. Append to the ct_solo_scores array in localStorage.
  try {
    const arr = JSON.parse(localStorage.getItem('ct_solo_scores') || '[]');
    arr.push({ name: state.name, score: state.score, durationMs, createdAt: Date.now() });
    localStorage.setItem('ct_solo_scores', JSON.stringify(arr));
  } catch (e) {
    console.warn('Failed to persist local score', e);
  }
  refreshLB();

  // Unlock the Explore bonus if the player achieves a high enough score.  The
  // threshold can be adjusted here.  Once unlocked, a flag is saved in
  // localStorage and the link will appear on the index and solo pages.  Only
  // set this once so players aren't repeatedly alerted.
  const threshold = 1800;
  try {
    if (state.score >= threshold && localStorage.getItem('ct_unlocked_explore') !== 'true') {
      localStorage.setItem('ct_unlocked_explore', 'true');
      alert('Congratulations! You unlocked the Explore Dunder Mifflin bonus. Check the navigation to access it.');
    }
  } catch (e) {}
}

btnShare.addEventListener('click', async ()=>{
  playSound('click');
  const txt = resultSummary.textContent.trim() + ' #CreedThoughtsTrivia';
  try {
    await navigator.clipboard.writeText(txt);
    alert('Copied to clipboard!');
  } catch { alert('Could not copy.'); }
});

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }