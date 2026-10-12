import {parseBank,validateQuestion,revisionKey} from './core.mjs';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const index=v=>Number.isInteger(v)&&v>=0&&v<5;
const reserved=new Set(['__proto__','constructor','prototype']);
const identifier=v=>typeof v==='string'&&v.length>0&&!reserved.has(v);
export function validateBackup(backup){
 if(!object(backup)||backup.schemaVersion!==3||!Array.isArray(backup.records))throw Error('Choose a BM4 data backup file (version 3).');
 backup=structuredClone(backup);
 const seen=new Set();
 for(const r of backup.records){
  if(!object(r)||!['session','question','bookmark','note','preference','report','bank'].includes(r.kind)||!identifier(r.id)||!object(r.data))throw Error('Backup contains an invalid record. Nothing has been restored.');
  const key=JSON.stringify([r.kind,r.id]);if(seen.has(key))throw Error('Backup contains duplicate records. Nothing has been restored.');seen.add(key);
  const d=r.data;
  if(d.updatedAt!=null&&!number(d.updatedAt))throw Error('Backup contains an invalid saved date.');
  if(r.kind==='session')validateSession(d,r.id);
  if(r.kind==='question'){
   const q=parseBank({setId:'backup',questions:[d]}).questions[0];
   if(revisionKey(q)!==r.id||validateQuestion(q).errors.length)throw Error('Backup contains an incomplete question.');
   // These fields are used directly by the saved question renderer.
   if(typeof d.uid!=='string'||!Number.isInteger(d.revision)||typeof d.stem!=='string'||!Array.isArray(d.distractors)||d.options.some(x=>typeof x!=='string'))throw Error('Backup contains an invalid question.');
   r.data=q;
  }
  if(r.kind==='bank'){
   if(d.id!==r.id||typeof d.title!=='string'||!Array.isArray(d.questions))throw Error('Backup contains an invalid custom bank.');
   if(!d.removed){const bank=parseBank({setId:r.id,title:d.title,questions:d.questions});if(bank.questions.some(q=>validateQuestion(q).errors.length))throw Error('Backup contains an incomplete custom question.');d.questions=bank.questions;}
  }
  if(r.kind==='note'&&d.versions!=null&&(!object(d.versions)||Object.values(d.versions).some(v=>!object(v)||typeof v.text!=='string')))throw Error('Backup contains an invalid note.');
 }
 return backup;
}
export function validateSession(s,id=s?.id){
 const fail=()=>{throw Error('Backup contains an invalid session. Nothing has been restored.');};
 if(!object(s)||s.id!==id||!identifier(id)||!['learn','assessment'].includes(s.mode)||!Array.isArray(s.questions)||!s.questions.length||!object(s.answers)||!Number.isInteger(s.current)||s.current<0||s.current>=s.questions.length||!number(s.createdAt)||!number(s.updatedAt)||typeof s.timed!=='boolean'||!number(s.remaining)||!number(s.duration)||(s.finishedAt!=null&&!number(s.finishedAt)))fail();
 const keys=new Set();
 for(const ref of s.questions){if(!object(ref)||!identifier(ref.key)||!identifier(ref.uid)||!Number.isInteger(ref.revision)||ref.revision<1||ref.key!==revisionKey(ref)||keys.has(ref.key)||!Array.isArray(ref.order)||ref.order.length!==5||new Set(ref.order).size!==5||ref.order.some(n=>!index(n)))fail();keys.add(ref.key);}
 for(const kind of ['answers','pending','flags']){
  const rows=s[kind];if(rows==null&&kind!=='answers')continue;if(!object(rows))fail();
  for(const [key,value] of Object.entries(rows)){
   if(!keys.has(key)||!object(value))fail();
   if(kind==='flags'){if(typeof value.flagged!=='boolean')fail();continue;}
   if(kind==='answers'?!index(value.selected):value.selected!=null&&!index(value.selected))fail();
   if(value.seconds!=null&&!number(value.seconds))fail();
   if(value.confidence!=null&&!['Guess','Unsure','Confident'].includes(value.confidence))fail();
   if(value.eliminated!=null&&(!Array.isArray(value.eliminated)||value.eliminated.some(n=>!index(n))))fail();
   if(kind==='answers'&&(typeof value.locked!=='boolean'||!number(value.answeredAt)))fail();
  }
 }
 return s;
}
