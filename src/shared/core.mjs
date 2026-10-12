export const answerSeconds=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<600?v:null;
export function meanAnswerSeconds(rows){const values=rows.map(r=>answerSeconds(r.seconds)).filter(v=>v!==null);return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;}
import {yearLabel,categoryLabel} from './catalogue.mjs';
export const SCHEMA = 3;
export const clone = value => structuredClone(value);
export const stableStringify = value => JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export const id = prefix => `${prefix}-${(globalThis.crypto.randomUUID?.()||Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''))}`;
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pct = (n, total) => total ? Math.round(n / total * 100) : null;
export const percent = value => value == null ? 'Not attempted' : `${value}%`;
export const unique = xs => [...new Set(xs.filter(Boolean))];
export const shuffle = xs => { const out = [...xs]; for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];} return out; };
export function signature(q) { return [q.stem, ...[...q.options].sort()].join('|').toLowerCase().replace(/[^a-z0-9]/g,''); }
export function normaliseQuestion(raw, bankId, index=0) {
  const q=clone(raw); q.id=String(q.id ?? `question-${index+1}`);
  q.uid=String(q.uid || `${bankId}::${q.id}`); q.revision=Number(q.revision)||1;
  q.stem=String(q.stem||''); q.options=Array.isArray(q.options)?q.options.map(String):[];
  q.why=String(q.why||''); q.distractors=Array.isArray(q.distractors)?q.distractors.map(String):[];
  q.module=String(q.module||'Uncategorised'); q.topic=String(q.topic||'Uncategorised');
  q.theme=String(q.theme||'General'); q.week=String(q.week||q.teachingWeek||''); q.year=yearLabel(q.year);q.category=categoryLabel(q.category||q.subjects?.[0]);
  q.subjects=Array.isArray(q.subjects)?q.subjects:[]; q.lo=Array.isArray(q.lo)?q.lo:q.lo?[String(q.lo)]:[];
  q.difficulty=['Easy','Moderate','Hard'].includes(q.difficulty)?q.difficulty:'Moderate';
  q.sources=Array.isArray(q.sources)?q.sources:Array.isArray(q.deepReview?.sourceNotes)?q.deepReview.sourceNotes:[];
  q.reviewedAt=q.reviewedAt||''; return q;
}
export function validateQuestion(q) {
  const errors=[],warnings=[];
  const d=q.deepReview;if(d){if(typeof d!=='object'||Array.isArray(d))errors.push('Expanded review must be a JSON object.');else{for(const key of ['keyClues','commonTraps','recogniseNextTime','followUpQuestions'])if(d[key]!=null&&!Array.isArray(d[key]))errors.push('Expanded review '+key+' must be a list.');for(const key of ['paragraphs','comparisonPoints'])if(d.keyConcept?.[key]!=null&&!Array.isArray(d.keyConcept[key]))errors.push('Concept '+key+' must be a list.');}}
  if(d&&typeof d==='object'){
    if(Array.isArray(d.keyClues)&&d.keyClues.some(c=>!c||typeof c!=='object'||typeof c.quote!=='string'||['supports','arguesAgainst'].some(k=>c[k]!=null&&(!Array.isArray(c[k])||c[k].some(n=>!Number.isInteger(n)||n<0||n>4)))))errors.push('Each key clue needs text and valid answer-option links.');
    if(d.keyConcept!=null&&(typeof d.keyConcept!=='object'||Array.isArray(d.keyConcept)))errors.push('The underlying concept must be an object.');
    if(Array.isArray(d.keyConcept?.comparisonPoints)&&d.keyConcept.comparisonPoints.some(c=>!c||typeof c!=='object'))errors.push('Each comparison needs a label and explanation.');
    if(Array.isArray(d.followUpQuestions)&&d.followUpQuestions.some(c=>!c||typeof c!=='object'||typeof c.prompt!=='string'||typeof c.answer!=='string'))errors.push('Each follow-up needs a question and answer.');
  }

  if(!q.stem.trim()) errors.push('Question text is missing.');
  if(q.options.length!==5 || q.options.some(x=>!x.trim())) errors.push('Exactly five non-empty options are required.');
  if(new Set(q.options.map(x=>x.trim().toLowerCase())).size!==q.options.length) errors.push('Answer options must be distinct.');
  if(!Number.isInteger(q.answer)||q.answer<0||q.answer>4) errors.push('Choose one correct answer.');
  if(!q.why.trim()) errors.push('Explain why the answer is correct.');
  if(q.distractors.length!==5||q.options.some((_,i)=>i!==q.answer&&!q.distractors[i]?.trim())) errors.push('Explain each incorrect option.');
  if(!q.module||q.module==='Uncategorised'||!q.topic||q.topic==='Uncategorised') errors.push('Choose a module and topic.');
  if(!q.week) warnings.push('Teaching week is not set.');
  if(!q.sources?.length) warnings.push('Add a source or review note.');
  if(!q.reviewedAt) warnings.push('Mark the question reviewed before publishing.');
  if(q.image?.src && !safeImage(q.image.src)) errors.push('Use an HTTPS or embedded PNG, JPEG, WebP or GIF image.');
  if(q.image?.src && !q.image.alt?.trim()) warnings.push('Add descriptive image alternative text.');
  return {errors,warnings};
}
export function parseBank(text) {
  const data=typeof text==='string'?JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')):clone(text);
  if(!data||typeof data!=='object'||!Array.isArray(data.questions)||!data.questions.length) throw Error('This file needs a non-empty questions array.');
  const bankId=String(data.setId||id('bank'));
  if(data.questions.some(q=>!q||typeof q!=='object'||!Array.isArray(q.options)||q.options.length!==5))throw Error('Every question must contain exactly five answer options.');
  const questions=data.questions.map((q,i)=>normaliseQuestion(q,bankId,i));
  if(unique(questions.map(q=>q.uid)).length!==questions.length) throw Error('Question identifiers are duplicated within this bank.');
  return {...data,setId:bankId,title:String(data.title||'Untitled collection'),questions};
}
export function safeImage(src) { return typeof src==='string'&&(/^(https:\/\/)/i.test(src)||/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(src))?src:''; }
export function revisionKey(q) { return `${q.uid}@${q.revision}`; }
export function makeSession(questions,{mode='learn',timed=false,minutes=20,title='Practice'}={}) {
  if(!questions.length) throw Error('No questions match this selection.');
  if(!['learn','assessment'].includes(mode)) throw Error('Choose a valid session mode.');
  if(timed&&(!Number.isFinite(minutes)||minutes<1||minutes>600)) throw Error('Choose a duration between 1 and 600 minutes.');
  return {id:id('session'),title,mode,timed,duration:timed?minutes*60:0,remaining:timed?minutes*60:0,createdAt:Date.now(),updatedAt:Date.now(),finishedAt:null,current:0,
    questions:shuffle(questions).map(q=>({key:revisionKey(q),uid:q.uid,revision:q.revision,order:shuffle([0,1,2,3,4])})),answers:{}};
}
export function answerSession(session,key,selected,confidence,seconds,now=Date.now()) {
  if(session.finishedAt) throw Error('This session has finished.');
  if(!session.questions.some(q=>q.key===key)) throw Error('Question is not in this session.');
  if(!Number.isInteger(selected)||selected<0||selected>4) throw Error('Select an answer first.');
  if(confidence&&!['Guess','Unsure','Confident'].includes(confidence))throw Error('Choose a valid confidence level.');
  const old=session.answers[key];
  if(old?.locked) throw Error('The first submitted answer is already recorded.');
  session.answers[key]={selected,confidence:confidence||null,seconds:answerSeconds(seconds),answeredAt:now,locked:session.mode==='learn',updatedAt:now};
  session.updatedAt=now; return session;
}
export function finishSession(session,now=Date.now()) {
  if(session.finishedAt) return session;
  session.finishedAt=now; session.updatedAt=now;
  Object.values(session.answers).forEach(a=>{a.locked=true;}); return session;
}
export function mergeSession(a,b) {
  if(!a) return clone(b); if(!b) return clone(a);
  const winner=(a.updatedAt||0)>(b.updatedAt||0)?a:b;
  const result={...clone(winner),answers:{},pending:{},flags:{}};
  if(a.deletedAt||b.deletedAt)result.deletedAt=Math.max(a.deletedAt||0,b.deletedAt||0);
  for(const key of unique([...Object.keys(a.pending||{}),...Object.keys(b.pending||{})]))result.pending[key]=mergeData('pending',a.pending?.[key],b.pending?.[key]);
  for(const key of unique([...Object.keys(a.flags||{}),...Object.keys(b.flags||{})]))result.flags[key]=mergeData('flag',a.flags?.[key],b.flags?.[key]);
  if(a.timed)result.remaining=Math.min(a.remaining,b.remaining);
  for(const key of unique([...Object.keys(a.answers||{}),...Object.keys(b.answers||{})])) {
    const x=a.answers?.[key],y=b.answers?.[key];
    if(!x||!y) result.answers[key]=clone(x||y);
    else if(x.locked||y.locked) result.answers[key]=clone(x.locked&&y.locked?(x.answeredAt<=y.answeredAt?x:y):(x.locked?x:y));
    else result.answers[key]=clone(x.updatedAt>y.updatedAt?x:y);
  }
  result.finishedAt=a.finishedAt&&b.finishedAt?Math.min(a.finishedAt,b.finishedAt):a.finishedAt||b.finishedAt||null;
  if(result.finishedAt) Object.values(result.answers).forEach(x=>{x.locked=true;});
  return result;
}
export function mergeData(kind,a,b) {
  if(!a) return clone(b); if(!b) return clone(a);
  if(kind==='session') return mergeSession(a,b);
  if(kind==='note') return {...(a.updatedAt>b.updatedAt?a:b),versions:{...a.versions,...b.versions}};
  return clone((a.updatedAt||0)>(b.updatedAt||0)?a:b);
}
export function responses(sessions,questionMap) {
  const out=[];
  for(const s of sessions) for(const ref of s.questions) {
    const a=s.answers[ref.key],q=questionMap.get(ref.key);
    if(!q||!a||(!a.locked&&!s.finishedAt)) continue;
    out.push({...a,seconds:answerSeconds(a.seconds),uid:ref.uid,key:ref.key,sessionId:s.id,mode:s.mode,q,correct:a.selected===q.answer});
  }
  return out.sort((a,b)=>a.answeredAt-b.answeredAt||a.sessionId.localeCompare(b.sessionId));
}
export function analytics(sessions,questionMap,library=[]) {
  const rows=responses(sessions,questionMap),first=[],repeat=[],seen=new Set(),latest=new Map();
  for(const r of rows){(seen.has(r.uid)?repeat:first).push(r);seen.add(r.uid);latest.set(r.uid,r);}
  const accuracy=rs=>pct(rs.filter(r=>r.correct).length,rs.length);
  const topics=unique([...library.map(q=>q.topic),...rows.map(r=>r.q.topic)]).map(topic=>{
    const rs=rows.filter(r=>r.q.topic===topic),f=first.filter(r=>r.q.topic===topic),recent=rs.slice(-20),prior=rs.slice(-40,-20);
    return {topic,total:library.filter(q=>q.topic===topic).length,seen:unique(rs.map(r=>r.uid)).length,n:rs.length,first:accuracy(f),recent:accuracy(recent),recentN:recent.length,
      trend:recent.length>=5&&prior.length>=5?accuracy(recent)-accuracy(prior):null};
  });
  return {rows,first,repeat,latest,topics,answered:rows.length,distinct:seen.size,firstAccuracy:accuracy(first),repeatAccuracy:accuracy(repeat),
    unresolved:[...latest.values()].filter(r=>!r.correct||['Guess','Unsure'].includes(r.confidence)),
    confidence:['Guess','Unsure','Confident'].map(label=>{const rs=rows.filter(r=>r.confidence===label);return {label,n:rs.length,accuracy:accuracy(rs)};}),
    meanSeconds:meanAnswerSeconds(rows)};
}
export function filterQuestions(questions,filters={},stats=null,bookmarks=[]) {
  const saved=new Set(bookmarks.filter(b=>b.saved).map(b=>b.uid));
  return questions.filter(q=>(!filters.query||[q.collection,q.category,q.module,q.topic,q.week,q.stem].join(' ').toLowerCase().includes(filters.query.toLowerCase()))&&
    (!filters.year||yearLabel(q.year)===filters.year)&&(!filters.category||q.category===filters.category)&&(!filters.module||q.module===filters.module)&&(!filters.topic||q.topic===filters.topic)&&(!filters.week||q.week===filters.week)&&
    (!filters.difficulty||q.difficulty===filters.difficulty)&&(!filters.saved||saved.has(q.uid))&&
    (!filters.unseen||!stats?.latest.has(q.uid))&&(!filters.review||stats?.unresolved.some(r=>r.uid===q.uid)));
}
export function studyReport(stats,{label='All time'}={}) {
  return `SBA STUDY REPORT — ${label}\n\nAnswered: ${stats.answered}\nDistinct questions: ${stats.distinct}\nFirst-attempt accuracy: ${percent(stats.firstAccuracy)} (n=${stats.first.length})\nRepeat accuracy: ${percent(stats.repeatAccuracy)} (n=${stats.repeat.length})\n\nTOPICS\n${stats.topics.filter(t=>t.n).map(t=>`${t.topic}: ${percent(t.recent)} over the latest ${t.recentN} responses; ${t.seen} distinct questions seen. ${t.recentN<5?'Limited evidence.':''}`).join('\n')}\n\nCONFIDENCE BEFORE FEEDBACK\n${stats.confidence.map(c=>`${c.label}: ${percent(c.accuracy)} (n=${c.n})`).join('\n')}\n\nPlease suggest a short, practical revision plan based on this evidence. Separate limited samples from repeated patterns. Do not predict an exam grade or infer diagnoses about the learner. No identifying information is included.`;
}
