// js/app.js — safe Solo init w/ multi-pack merge + embedded fallback + logs

(function(){
  const $ = s => document.querySelector(s);

  // Elements (lazy getters so we never crash on null)
  const elName    = () => $('#nameSolo');
  const elCount   = () => $('#countSolo');
  const elStart   = () => $('#btnStartSolo');
  const quizCard  = () => $('#quizCard');
  const resultCard= () => $('#resultCard');
  const qBox      = () => $('#questionBox');
  const btnNext   = () => $('#btnNext');
  const summary   = () => $('#resultSummary');
  const quizMeta  = () => $('#quizMeta');
  const lbDiv     = () => $('#leaderboard');

  const state = {
    started: false,
    finished: false,
    qIdx: -1,
    order: [],
    correct: 0,
    startMs: 0,
    name: 'Player'
  };

  const EMBEDDED_FALLBACK = [
    { id:'f1', text:'In what city is Dunder Mifflin Scranton?', choices:['Scranton','Akron','Utica','Buffalo'], answerIndex:0 },
    { id:'f2', text:'Who is Regional Manager for most early seasons?', choices:['Jim','Michael','Ryan','Creed'], answerIndex:1 },
    { id:'f3', text:'Dwight’s farm grows…', choices:['Beets','Corn','Oranges','Potatoes'], answerIndex:0 }
  ];

  function log(...args){ console.log('[SOLO]', ...args); }
  function warn(...args){ console.warn('[SOLO]', ...args); }

  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function show(el){ if (el) el.classList.remove('hidden'); }
  function hide(el){ if (el) el.classList.add('hidden'); }

  async function loadPacksMerged(){
    const list = Array.isArray(window.PACKS) ? window.PACKS : [];
    const disabled = JSON.parse(localStorage.getItem('ct_disabled_packs')||'[]');
    const enabled = list.filter(p => !disabled.includes(p.packId));
    log('PACKS declared:', list.length, 'enabled:', enabled.length);

    let merged = [];
    for (const p of enabled){
      try{
        log('Fetching pack:', p.path);
        const res = await fetch(p.path, {cache:'no-store'});
        if (!res.ok){ warn('HTTP not OK for', p.path, res.status); continue; }
        const data = await res.json();
        const qs = Array.isArray(data?.questions) ? data.questions : [];
        log('Loaded questions from pack', p.packId, qs.length);
        merged = merged.concat(qs);
      }catch(e){
        warn('Pack load failed:', p.path, e);
      }
    }
    return merged;
  }

  function renderQuestion(){
    const q = state.order[state.qIdx];
    if (!q){ warn('No question at idx', state.qIdx); return; }

    if (quizMeta()) quizMeta().textContent = `Q ${state.qIdx+1} / ${state.order.length}`;

    if (qBox()){
      qBox().innerHTML = '';
      const h = document.createElement('h3');
      h.textContent = q.text;
      qBox().appendChild(h);
      (q.choices || []).forEach((c,i)=>{
        const b = document.createElement('button');
        b.textContent = c;
        b.style.display = 'block';
        b.style.margin = '6px 0';
        b.onclick = ()=>{
          Array.from(qBox().querySelectorAll('button')).forEach(x=>x.disabled = true);
          if (i === q.answerIndex){ b.style.borderColor = '#3c6'; state.correct++; }
          else { b.style.borderColor = '#c33'; }
          if (btnNext()) btnNext().classList.remove('hidden');
        };
        qBox().appendChild(b);
      });
    }
    if (btnNext()) btnNext().classList.add('hidden');
  }

  function next(){
    state.qIdx++;
    if (state.qIdx >= state.order.length) return finish();
    renderQuestion();
  }

  async function finish(){
    state.finished = true;
    hide(quizCard()); show(resultCard());
    const secs = Math.round((Date.now() - state.startMs)/1000);
    if (summary()) summary().textContent = `${state.name}, you scored ${state.correct}/${state.order.length} in ${secs}s.`;

    // Write to Firebase if configured; otherwise localStorage
    try{
      if (window.fbReady && window.fbReady()){
        await window.addSoloScore({ name: state.name, score: state.correct, durationMs: secs*1000 });
      }
      const local = JSON.parse(localStorage.getItem('ct_solo_scores')||'[]');
      local.push({ name: state.name, score: state.correct, durationMs: secs*1000, at: Date.now() });
      localStorage.setItem('ct_solo_scores', JSON.stringify(local));
    }catch(e){ warn('Score save failed', e); }

    // Render leaderboard (local if no Firebase)
    try{
      if (lbDiv()){
        let rows = [];
        if (window.getSoloTop && window.fbReady && window.fbReady()){
          rows = await window.getSoloTop(10);
        }
        if (!rows || !rows.length){
          rows = (JSON.parse(localStorage.getItem('ct_solo_scores')||'[]')
                  .sort((a,b)=>b.score-a.score).slice(0,10));
        }
        if (!rows.length){ lbDiv().textContent = 'No scores yet.'; }
        else{
          const ol = document.createElement('ol');
          rows.forEach(r=>{
            const li = document.createElement('li');
            li.textContent = `${r.name}: ${r.score} pts`;
            ol.appendChild(li);
          });
          lbDiv().innerHTML = '';
          lbDiv().appendChild(ol);
        }
      }
    }catch(e){ warn('LB render failed', e); }
  }

  async function start(){
    if (state.started) return;
    state.started = true;

    state.name = (elName() && elName().value.trim()) || 'Player';
    const n = Math.max(1, Math.min(50, parseInt((elCount() && elCount().value) || '12', 10)));

    let pool = await loadPacksMerged();
    log('Total questions merged:', pool.length);

    if (!pool || pool.length === 0){
      warn('No packs resolved. Using embedded fallback (3 questions). Check paths/case in packs/index.js.');
      pool = EMBEDDED_FALLBACK.slice();
    }

    pool = shuffle(pool.slice());
    state.order = pool.slice(0, Math.min(n, pool.length));
    state.qIdx = -1; state.correct = 0; state.startMs = Date.now();

    hide(resultCard()); show(quizCard()); next();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // Bind start/next safely
    if (elStart()){
      elStart().disabled = false;
      elStart().addEventListener('click', start);
    } else {
      warn('#btnStartSolo not found');
    }
    if (btnNext()){
      btnNext().addEventListener('click', next);
    } else {
      warn('#btnNext not found');
    }

    // Sanity log for required nodes
    ['#nameSolo','#countSolo','#questionBox','#quizCard','#resultCard']
      .forEach(sel=>{ if(!$(sel)) warn('Missing element:', sel); });
  });
})();
