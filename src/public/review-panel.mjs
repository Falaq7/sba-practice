import {esc} from './shared/core.mjs';

import {rich,deepReview} from './shared/ui.mjs';

import {animateDrawerIn,animateDrawerOut} from './drawer-motion.mjs';

export function highlightedStem(q){

 const spans=[];for(const c of q.deepReview?.keyClues||[]){if(!c.quote)continue;let at=q.stem.indexOf(c.quote);while(at>=0){spans.push([at,at+c.quote.length]);at=q.stem.indexOf(c.quote,at+c.quote.length);}}

 spans.sort((a,b)=>a[0]-b[0]);const merged=[];for(const s of spans){const last=merged.at(-1);if(last&&s[0]<=last[1])last[1]=Math.max(last[1],s[1]);else merged.push([...s]);}

 let at=0,out='';for(const [a,b]of merged){out+=rich(q.stem.slice(at,a))+'<mark class="stem-clue"><span class="stem-clue-text">'+rich(q.stem.slice(a,b))+'</span></mark>';at=b;}return out+rich(q.stem.slice(at));

}

export function answerFeedback(q,a,key,history=[]){

 const attempts=history.filter(x=>Number.isInteger(x.selected));

 const choiceHistory=attempts.length<2?'':`<details class="personal-choice-history"><summary>Your answer history · ${attempts.length} attempts</summary><p class="muted">These counts use only your recorded attempts at this question.</p><ul class="choice-history-list">${q.options.map((option,index)=>{const count=attempts.filter(x=>x.selected===index).length,share=Math.round(count/attempts.length*100);return `<li class="choice-history-item ${index===q.answer?'correct':''}"><span>${esc(option)}${index===q.answer?'<small>Correct answer</small>':''}</span><progress max="${attempts.length}" value="${count}" aria-label="${count} of ${attempts.length} attempts"></progress><small>${count} · ${share}%</small></li>`;}).join('')}</ul></details>`;

 return `<section class="feedback answer-feedback ${!a?'skipped':a.selected===q.answer?'':'wrong'}"><div><b class="feedback-result">${!a?'Skipped':a.selected===q.answer?'Correct':'Incorrect'}</b><p><strong>Best answer:</strong> ${esc(q.options[q.answer])}</p><p>${rich(q.why)}</p></div>${choiceHistory}<button class="explore-further" data-explore="${esc(key)}" aria-controls="deep-review-panel">Deep review <span aria-hidden="true"><svg class="diagonal-arrow" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.125em;flex-shrink:0"><path d="M6 18 18 6M6 6h12v12"/></svg></span></button></section>`;

}



export function reviewOptions(q,a,order){return `<div class="options review-options">${order.map((n,i)=>`<div class="option ${n===q.answer?'correct':a?.selected===n?'wrong':''}"><b>${'ABCDE'[i]}.</b><span>${rich(q.options[n])}${n===q.answer?'<small class="answer-label">Correct answer</small>':a?.selected===n?'<small class="answer-label">Your answer</small>':''}</span></div>`).join('')}</div>`;}

let cleanup=()=>{};
let retained=null;

export function bindDeepReview(c){

 const identity=JSON.stringify([c.scope,c.view,c.session?.id,c.view==='session'?c.session?.questions[c.session.current]?.key:null]);
 const previous=c.session?.id&&retained?.identity===identity?retained:null;
 cleanup();const cards=[...document.querySelectorAll('[data-review-key]')],host=document.querySelector('#review-rail,.session-sidebar');if(!cards.length||!host){retained=null;return;}

 let active=null,closed=previous?.closed||null,frame=0,transition=0,disposed=false;
 const saved=retained={identity,closed,active:previous?.active||null,scrollTop:previous?.scrollTop||0};const panel=document.createElement('section');panel.id='deep-review-panel';panel.className='deep-review-panel';panel.hidden=true;panel.setAttribute('aria-label','Deep Review');panel.setAttribute('role','complementary');host.prepend(panel);

 function positionNext(){
  const next=document.querySelector('#next');if(!next)return;
  if(panel.hidden||innerWidth<=700){next.style.removeProperty('translate');return;}
  const rect=next.getBoundingClientRect(),shift=parseFloat(getComputedStyle(next).translate)||0;
  const edge=innerWidth-panel.offsetWidth-16;
  next.style.translate=Math.min(0,edge-(rect.right-shift))+'px 0';
 }

 function animateClues(card){

  card.classList.remove('clue-ink-active');

  void card.offsetWidth;

  card.classList.add('clue-ink-active');

 }

 function show(card,manual=false,restore=false){const key=card.dataset.reviewKey;if(!manual&&(active===key||closed===key))return;const ref=c.session.questions.find(r=>r.key===key),q=c.questionMap.get(key),a=c.session.answers[key];if(!q||!ref)return;const wasHidden=panel.hidden||active===null;++transition;active=key;closed=null;saved.active=key;saved.closed=null;panel.hidden=false;document.body.classList.add('deep-review-open');

 const index=c.session.questions.indexOf(ref)+1,clues=q.deepReview?.keyClues||[],count=c.stats.rows.filter(r=>r.uid===q.uid).length;

 const labels=indices=>(indices||[]).filter(n=>q.options[n]!=null).map(n=>`<span class="tag">${'ABCDE'[ref.order.indexOf(n)]}. ${esc(q.options[n])}</span>`).join('');

 panel.innerHTML=`<header class="deep-panel-head"><div><small class="deep-eyebrow">Question-specific teaching · Question ${index}</small><h2>Deep Review</h2></div><button id="close-deep-review" aria-label="Close Deep Review">Close</button>${c.view==='session'?`<nav class="deep-question-navigation" aria-label="Question navigation"><button type="button" data-deep-previous ${index===1?'disabled':''}>← Previous</button><button type="button" data-deep-next ${index===c.session.questions.length?'disabled':''}>Next →</button></nav>`:''}</header><div class="deep-panel-body"><div class="deep-metrics"><div><b>${!a?'Skipped':a.selected===q.answer?'Correct':'Incorrect'}</b><small>Result</small></div><div><b>${esc(a?.confidence||'Not rated')}</b><small>Confidence</small></div><div><b>${a?.seconds==null||a.seconds>=600?'Unavailable':Math.round(a.seconds)+'s'}</b><small>Answering time</small></div><div><b>${count}</b><small>Attempts</small></div></div>${clues.length?`<button id="toggle-clues" aria-pressed="true">Hide highlighted clues</button><section class="review-clues"><h3>Key clues</h3>${clues.map(x=>`<div class="review-clue"><mark>${esc(x.quote)}</mark>${[].concat(x.explanation||[]).map(t=>`<p>${rich(t)}</p>`).join('')}${x.supports?.length?`<small>Supports</small><div class="clue-support">${labels(x.supports)}</div>`:''}${x.arguesAgainst?.length?`<small>Argues against</small><div class="clue-against">${labels(x.arguesAgainst)}</div>`:''}</div>`).join('')}</section>`:''}<div class="deep-extra">${deepReview({...q,deepReview:{...q.deepReview,keyClues:[]}})}</div></div>`;

 panel.querySelector('[data-deep-previous]')?.addEventListener('click',()=>document.querySelector('#previous')?.click());
 panel.querySelector('[data-deep-next]')?.addEventListener('click',()=>document.querySelector('#next')?.click());
 positionNext();
 panel.scrollTop=restore?saved.scrollTop:0;
 panel.onscroll=()=>{saved.scrollTop=panel.scrollTop;};

 document.querySelectorAll('[data-review-key]').forEach(el=>el.classList.toggle('active-review',el===card));card.classList.remove('clues-hidden');animateClues(card);

 panel.querySelector('#close-deep-review').onclick=async()=>{const token=++transition;closed=key;saved.closed=key;saved.active=null;await animateDrawerOut(panel);if(disposed||token!==transition)return;panel.hidden=true;positionNext();document.body.classList.remove('deep-review-open');card.querySelector('[data-explore]')?.focus({preventScroll:true});};

 panel.querySelector('#toggle-clues')?.addEventListener('click',e=>{const hidden=card.classList.toggle('clues-hidden');e.target.setAttribute('aria-pressed',String(!hidden));e.target.textContent=hidden?'Show highlighted clues':'Hide highlighted clues';if(!hidden)animateClues(card);});

 // Teaching content is a continuous read, including distractors and follow-up answers.

 panel.querySelectorAll('.deep-extra details').forEach(d=>{const section=document.createElement('section');section.className='deep-section';const summary=d.querySelector(':scope > summary');if(summary){const heading=document.createElement('h3');heading.textContent=summary.textContent;section.append(heading);summary.remove();}section.append(...d.childNodes);d.replaceWith(section);});

 const alternatives=[...panel.querySelectorAll('.deep-extra > .deep-section')].find(s=>s.querySelector('h3')?.textContent==='Why the other options are incorrect');

 if(alternatives){

  alternatives.classList.add('alternative-section');

  alternatives.innerHTML=`<h3>Why the other options are incorrect</h3><ol class="alternative-list">${ref.order.map((n,i)=>n===q.answer?'':`<li class="alternative-card${a?.selected===n?' selected-alternative':''}"><div class="alternative-heading"><span class="alternative-letter">${'ABCDE'[i]}</span><div><strong>${esc(q.options[n])}</strong>${a?.selected===n?'<small class="alternative-selected">Your answer</small>':''}</div></div><p>${rich(q.distractors[n]||'No explanation supplied.')}</p></li>`).join('')}</ol>`;

 }

 if(restore)return;
 if(wasHidden)animateDrawerIn(panel);else if(!matchMedia('(prefers-reduced-motion: reduce)').matches)panel.querySelector('.deep-panel-body')?.animate([{opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.16,1,.3,1)'});

 }

 function scan(){frame=0;const target=innerHeight*.35;const visible=cards.filter(el=>{const r=el.getBoundingClientRect();return r.bottom>120&&r.top<innerHeight;});const card=visible.sort((a,b)=>{const dist=el=>{const r=el.getBoundingClientRect();return r.top<=target&&r.bottom>=target?0:Math.min(Math.abs(r.top-target),Math.abs(r.bottom-target));};return dist(a)-dist(b);})[0];if(card)show(card);}

 const scroll=()=>{if(!frame)frame=requestAnimationFrame(scan);};const click=e=>{const b=e.target.closest('[data-explore]');if(b){const card=cards.find(x=>x.dataset.reviewKey===b.dataset.explore);if(card)show(card,true);}};

 // Completed reviews follow the visible question on desktop. In learning mode,
 // checking an answer opens its teaching immediately, including on phones.

 const autoScan=()=>{positionNext();if(!panel.hidden&&!closed&&document.querySelector('#review-rail')&&innerWidth>1050)scroll();};

 const escape=e=>{if(e.key==='Escape'&&!panel.hidden&&!document.querySelector('#dialog[open]')){e.preventDefault();e.stopPropagation();panel.querySelector('#close-deep-review')?.click();}};

 if(previous?.active){const card=cards.find(el=>el.dataset.reviewKey===previous.active);if(card)show(card,true,true);}
 document.addEventListener('click',click);document.addEventListener('keydown',escape,true);window.addEventListener('scroll',autoScan,{passive:true});window.addEventListener('resize',autoScan);autoScan();

 if(c.view==='session'&&c.session.mode==='learn'){const key=c.session.questions[c.session.current]?.key,card=cards.find(el=>el.dataset.reviewKey===key);if(card&&c.session.answers[key]?.locked&&c.openDeepReview===key)show(card);}

 cleanup=()=>{disposed=true;++transition;cancelAnimationFrame(frame);document.removeEventListener('click',click);document.removeEventListener('keydown',escape,true);window.removeEventListener('scroll',autoScan);window.removeEventListener('resize',autoScan);panel.remove();document.querySelector('#next')?.style.removeProperty('translate');document.body.classList.remove('deep-review-open');};

}
