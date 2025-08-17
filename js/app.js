// js/app.js — Minimal rescue build (solo works without packs/Firebase)
// Purpose: keep it short so it won't get truncated by the editor and to
// guarantee solo mode works even when packs fail to load. This script
// randomises a small embedded set of Office trivia questions and writes
// scores to localStorage. Firebase integration is optional and ignored
// here.

(function () {
  'use strict';

  // --- helpers
  const $ = (s) => document.querySelector(s);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const show = (el) => el && el.classList.remove('hidden');
  const hide = (el) => el && el.classList.add('hidden');
  function shuffle(a){
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  // --- elements
  const elName   = () => $('#nameSolo');
  const elCount  = () => $('#countSolo');
  const elStart  = () => $('#btnStartSolo');
  const quizCard = () => $('#quizCard');
  const resultCard = () => $('#resultCard');
  const qBox     = () => $('#questionBox');
  const btnNext  = () => $('#btnNext');
  const summary  = () => $('#resultSummary');
  const quizMeta = () => $('#quizMeta');
  const lbDiv    = () => $('#leaderboard');

  // --- minimal state
  const state = { started:false, qIdx:-1, order:[], correct:0, startMs:0, name:'Player' };

  // --- embedded questions (so it plays even with zero packs)
  const QUESTIONS = [
    { id:'f1', text:'In what city is Dunder Mifflin Scranton?', choices:['Scranton','Akron','Utica','Buffalo'], answerIndex:0 },
    { id:'f2', text:'Who is Regional Manager for most early seasons?', choices:['Jim','Michael','Ryan','Creed'], answerIndex:1 },
    { id:'f3', text:'Dwight’s farm grows…', choices:['Beets','Corn','Oranges','Potatoes'], answerIndex:0 },
    { id:'f4', text:'Pam’s last name (pre-wedding)?', choices:['Halpert','Beesly','Kapoor','Vance'], answerIndex:1 },
    { id:'f5', text:'Which branch is Jim transferred to briefly?', choices:['Utica','Stamford','Nashua','Buffalo'], answerIndex:1 },
    { id:'f6', text:'Kevin plays in a band called…', choices:['Scrantonicity','Dunder Tunes','Electric City','The Creed'], answerIndex:0 }
  ];

  // --- rendering
  function renderQuestion(){
    const q = state.order[state.qIdx];
    if (!q) return;
    if (quizMeta()) quizMeta().textContent = `Q ${state.qIdx+1} / ${state.order.length}`;
    if (qBox()){
      qBox().innerHTML = '';
      const h = document.createElement('h3');
      h.textContent = q.text;
      qBox().appendChild(h);
      q.choices.forEach((c,i)=>{
        const b = document.createElement('button');
        b.textContent = c;
        b.style.display='block';
        b.style.margin='6px 0';
        b.onclick = () => {
          // disable all choices once answered
          Array.from(qBox().querySelectorAll('button')).forEach(x=>x.disabled = true);
          // mark correct/incorrect via border color
          if (i === q.answerIndex){ b.style.borderColor = '#3c6'; state.correct++; }
          else { b.style.borderColor = '#c33'; }
          // reveal the Next button and enable it
          if (btnNext()) {
            btnNext().disabled = false;
            btnNext().classList.remove('hidden');
          }
        };
        qBox().appendChild(b);
      });
    }
    // hide and disable the Next button until an answer is selected
    if (btnNext()) {
      btnNext().classList.add('hidden');
      btnNext().disabled = true;
    }
  }

  function next(){
    state.qIdx++;
    if (state.qIdx >= state.order.length) return finish();
    renderQuestion();
  }

  function finish(){
    hide(quizCard()); show(resultCard());
    const secs = Math.round((Date.now()-state.startMs)/1000);
    if (summary()) summary().textContent = `${state.name}, you scored ${state.correct}/${state.order.length} in ${secs}s.`;
    // local leaderboard write (Firebase optional)
    try{
      const local = JSON.parse(localStorage.getItem('ct_solo_scores')||'[]');
      local.push({ name: state.name, score: state.correct, durationMs: secs*1000, at: Date.now() });
      localStorage.setItem('ct_solo_scores', JSON.stringify(local));
    }catch(e){}
  }

  function start(){
    if (state.started) return;
    state.started = true;
    state.name = (elName() && elName().value.trim()) || 'Player';
    const n = Math.max(1, Math.min(50, parseInt((elCount() && elCount().value) || '12', 10)));
    const pool = shuffle(QUESTIONS.slice());
    state.order = pool.slice(0, Math.min(n, pool.length));
    state.qIdx = -1; state.correct = 0; state.startMs = Date.now();
    hide(resultCard()); show(quizCard()); next();
  }

  // --- init
  document.addEventListener('DOMContentLoaded', () => {
    if (elStart()){ elStart().disabled = false; on(elStart(),'click', start); }
    if (btnNext()) on(btnNext(),'click', next);
    // click sound for fun if available
    document.querySelectorAll('button,a').forEach(el=>{
      on(el,'click', ()=> window.playSound && window.playSound('click'));
    });
    // render current leaderboard from localStorage
    try{
      if (lbDiv()){
        const rows = (JSON.parse(localStorage.getItem('ct_solo_scores')||'[]')
          .sort((a,b)=>b.score - a.score)).slice(0,10);
        if (rows.length){
          const ol = document.createElement('ol');
          rows.forEach(r=>{
            const li=document.createElement('li');
            li.textContent=`${r.name}: ${r.score} pts`;
            ol.appendChild(li);
          });
          lbDiv().innerHTML=''; lbDiv().appendChild(ol);
        } else {
          lbDiv().textContent = 'No scores yet.';
        }
      }
    } catch(e){}
  });

})(); // END SENTINEL