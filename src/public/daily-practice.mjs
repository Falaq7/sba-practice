import {esc} from './shared/core.mjs';
import {specialty} from './custom-study.mjs';

const pair=q=>JSON.stringify([specialty(q),q.category||'Other']);
const label=q=>`${specialty(q)} · ${q.category||'Other'}`;
const unique=qs=>[...new Map(qs.map(q=>[q.uid,q])).values()];
const current=(q,r)=>r&&r.q.stem===q.stem&&r.q.answer===q.answer&&JSON.stringify(r.q.options)===JSON.stringify(q.options);
export function combinedResults(stats){
 const groups=new Map();
 for(const r of stats.latest.values()){
  const key=pair(r.q),g=groups.get(key)||{key,label:label(r.q),n:0,correct:0,review:0};
  g.n++;g.correct+=Number(r.correct);g.review+=Number(!r.correct||['Guess','Unsure'].includes(r.confidence));groups.set(key,g);
 }
 return [...groups.values()].sort((a,b)=>b.review-a.review||a.label.localeCompare(b.label));
}
export function practicePlan(questions,stats,minutes=15,year=''){
 const pool=unique(questions).filter(q=>!year||(year==='Custom'?q.localOnly:q.year===year&&!q.localOnly));
 const latest=new Map(pool.flatMap(q=>current(q,stats.latest.get(q.uid))?[[q.uid,stats.latest.get(q.uid)]]:[]));
 const groups=combinedResults({latest});
 const focus=groups.filter(g=>g.n>=3&&g.review>0&&pool.filter(q=>pair(q)===g.key).length>=2).slice(0,2);
 const keys=new Set(focus.map(g=>g.key)),count=Math.min(pool.length,Math.max(1,Math.floor(minutes/2)));
 const rank=q=>{const r=latest.get(q.uid);return !r?2:!r.correct?0:['Guess','Unsure'].includes(r.confidence)?1:3;};
 const ordered=[...pool].sort((a,b)=>rank(a)-rank(b)||a.uid.localeCompare(b.uid));
 const targeted=ordered.filter(q=>keys.has(pair(q))).slice(0,Math.ceil(count*.7));
 const chosen=new Set(targeted.map(q=>q.uid));
 const remainder=ordered.filter(q=>!chosen.has(q.uid));
 // Round-robin the remaining specialties/themes so a large bank cannot dominate the mix.
 const buckets=new Map();for(const q of remainder){const k=pair(q);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(q);}
 const selected=[...targeted];while(selected.length<count){let added=false;for(const bucket of buckets.values()){if(bucket.length&&selected.length<count){selected.push(bucket.shift());added=true;}}if(!added)break;}
 return {questions:selected,focus,unseen:selected.filter(q=>!latest.has(q.uid)).length,review:selected.filter(q=>{const r=latest.get(q.uid);return r&&(!r.correct||['Guess','Unsure'].includes(r.confidence));}).length,available:pool.length};
}
export function periodResults(stats,now=Date.now()){
 const day=86400000,summarise=rs=>({n:rs.length,correct:rs.filter(r=>r.correct).length});
 return {recent:summarise(stats.first.filter(r=>r.answeredAt>now-30*day&&r.answeredAt<=now)),previous:summarise(stats.first.filter(r=>r.answeredAt>now-60*day&&r.answeredAt<=now-30*day))};
}
export function todayPractice(){return `<section class="panel today-practice" aria-labelledby="today-heading"><div class="row between"><div><small class="desk-label">Suggested session</small><h2 id="today-heading">Today’s practice</h2><p class="muted">New questions and answers to revisit.</p></div><div class="today-controls"><label>Question pool<select id="today-pool"></select></label><div class="today-times" role="group" aria-label="Approximate practice time">${[5,15,30].map(n=>`<button data-today-minutes="${n}" aria-pressed="${n===15}">${n} min</button>`).join('')}</div></div></div><button class="quiet-button" id="today-explanation" aria-expanded="false" aria-controls="today-plan">Why this suggestion? ⌄</button><div id="today-plan" aria-live="polite" hidden></div><div class="today-footer"><small class="muted">About 2 minutes per SBA. You can adjust the session before starting.</small><button class="primary" id="today-start">Set up today’s practice →</button></div></section>`;}
export function additionalAnalytics(c){
 const {recent,previous}=periodResults(c.stats),format=x=>x.n?`${x.correct} of ${x.n} correct (${Math.round(x.correct/x.n*100)}%)`:'No first attempts';
 const groups=combinedResults(c.stats);
 return `<div class="additional-analytics"><section class="panel"><small class="desk-label">Compare your answers</small><h2>Last 30 days and the month before</h2><div class="period-comparison"><div><small>Last 30 days</small><strong>${format(recent)}</strong></div><div><small>Previous 30 days</small><strong>${format(previous)}</strong></div></div><p class="muted">First attempts only. Different questions and difficulty can affect these results.${recent.n<5||previous.n<5?' There are too few answers in one or both periods to judge a trend.':''}</p></section><section class="panel"><h2>Specialty + theme</h2><p class="muted">Your latest answer to each question, grouped more broadly than individual topics.</p>${groups.length?`<div class="table-wrap"><table><thead><tr><th>Area</th><th>Correct</th><th>To revisit</th><th></th></tr></thead><tbody>${groups.map((g,i)=>`<tr><th scope="row">${esc(g.label)}${g.n<5?'<small class="combined-sample">Few answers so far</small>':''}</th><td>${g.correct} / ${g.n}</td><td>${g.review}</td><td><button data-combined-practice="${i}">Practise</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">These results will appear after you answer some questions.</p>'}<small class="muted">To revisit includes incorrect answers and answers marked Guess or Unsure.</small></section></div>`;
}
export function bindDailyPractice(c,setup){
 const questions=unique(c.questions),select=document.querySelector('#today-pool');
 if(select){
  const years=[...new Set(questions.map(q=>q.localOnly?'Custom':q.year).filter(Boolean))].sort();
  select.innerHTML=years.map(y=>`<option value="${esc(y)}">${esc(y==='Custom'?'Custom question banks':y)}</option>`).join('');
  const saved=c.store.get(c.scope,'preference','home-bank')?.year;
  if(years.includes(saved))select.value=saved;else if(saved==='Custom question banks'&&years.includes('Custom'))select.value='Custom';
  let minutes=15,plan;
  let explanationMotion;
  document.querySelector('#today-explanation').onclick=e=>{
   const el=document.querySelector('#today-plan'),button=e.currentTarget,opening=button.getAttribute('aria-expanded')!=='true',from=el.hidden?0:el.getBoundingClientRect().height;
   explanationMotion?.cancel();button.setAttribute('aria-expanded',String(opening));button.textContent=opening?'Why this suggestion? ⌃':'Why this suggestion? ⌄';el.inert=!opening;
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.hidden=!opening;return;}
   el.hidden=false;el.style.overflow='hidden';const full=el.getBoundingClientRect().height,style=getComputedStyle(el),space={paddingTop:style.paddingTop,paddingBottom:style.paddingBottom,borderTopWidth:style.borderTopWidth,borderBottomWidth:style.borderBottomWidth},flat={paddingTop:'0px',paddingBottom:'0px',borderTopWidth:'0px',borderBottomWidth:'0px'};
   explanationMotion=el.animate([{height:from+'px',opacity:from?1:0,...(from?space:flat)},{height:(opening?full:0)+'px',opacity:opening?1:0,...(opening?space:flat)}],{duration:300,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
   explanationMotion.onfinish=()=>{el.hidden=!opening;explanationMotion.cancel();el.style.overflow='';};
  };
  const update=()=>{plan=practicePlan(questions,c.stats,minutes,select.value);const el=document.querySelector('#today-plan');
   el.innerHTML=`<div class="today-count"><strong>${plan.questions.length}</strong><span>SBA questions</span></div><div><strong>${plan.focus.length?'A little more practice in '+plan.focus.map(g=>esc(g.label)).join(' and '):'A balanced mix to get started'}</strong><p class="muted">${plan.questions.length?`${plan.unseen} new · ${plan.review} to revisit${plan.questions.length-plan.unseen-plan.review?` · ${plan.questions.length-plan.unseen-plan.review} previously correct`:''}`:'Load a question bank from your library to build a session.'}</p><small class="muted">${plan.focus.length?'Suggested from your latest answers; small samples are not a reliable measure of ability.':'More answers will help identify useful areas to revisit.'}${plan.available<Math.floor(minutes/2)&&plan.available?' This pool has fewer questions, so this session is shorter.':''}</small></div>`;
   document.querySelector('#today-start').disabled=!plan.questions.length;document.querySelector('#today-start').textContent='Set up '+plan.questions.length+' questions →';
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el.animate([{opacity:.45,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'cubic-bezier(.2,.7,.2,1)'});
  };
  select.addEventListener('change',update);document.querySelectorAll('[data-today-minutes]').forEach(b=>b.addEventListener('click',()=>{minutes=Number(b.dataset.todayMinutes);document.querySelectorAll('[data-today-minutes]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));update();}));
  document.querySelector('#today-start').addEventListener('click',()=>setup(plan.questions));update();
 }
 const groups=combinedResults(c.stats);document.querySelectorAll('[data-combined-practice]').forEach(b=>{const qs=questions.filter(q=>pair(q)===groups[Number(b.dataset.combinedPractice)]?.key);b.disabled=!qs.length;b.addEventListener('click',()=>setup(qs));});
}
