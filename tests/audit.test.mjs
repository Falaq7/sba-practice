import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSession,normaliseQuestion,parseBank,validateQuestion,answerSession} from '../src/shared/core.mjs';
import {validateBackup} from '../src/shared/backup-validation.mjs';
import {LocalStore} from '../src/shared/store.mjs';
import {sessionPacing} from '../src/shared/practice-extras.mjs';
const q=normaliseQuestion({id:'q',stem:'Question?',options:['a','b','c','d','e'],answer:0,why:'Because a.',distractors:['','b wrong','c wrong','d wrong','e wrong'],module:'Cardiology',topic:'Anatomy'},'test');
const wrap=s=>({schemaVersion:3,records:[{kind:'session',id:s.id,data:s}]});
test('backup sessions preserve real attempts but reject crash-inducing references and answers before writes',async()=>{
 const s=makeSession([q]);answerSession(s,s.questions[0].key,0,null,4);
 assert.doesNotThrow(()=>validateBackup(wrap(s)));
 for(const mutate of [s=>s.current=2,s=>s.questions[0].order=null,s=>s.questions[0].order=[0,0,1,2,3],s=>s.answers[s.questions[0].key]=null,s=>s.pending={[s.questions[0].key]:{selected:8}},s=>s.questions=[],s=>s.answers.unrelated={selected:1}]){
  const broken=structuredClone(s);mutate(broken);const store=new LocalStore();
  await assert.rejects(store.import('guest',{schemaVersion:3,records:[{kind:'note',id:'safe',data:{}},...wrap(broken).records]}),/invalid session/);assert.equal(store.records.size,0);
 }
 assert.throws(()=>validateBackup(null),/backup file/);
});
test('malformed teaching content is rejected instead of crashing Deep Review',()=>{
 for(const deepReview of [{keyClues:[null]},{keyClues:[{quote:'Question',supports:'A'}]},{followUpQuestions:[null]},{keyConcept:{comparisonPoints:[null]}}])assert(validateQuestion({...q,deepReview}).errors.length);
 assert.throws(()=>parseBank('null'),/questions array/);
});
test('backup rejects duplicate and reserved identifiers',()=>{
 const r={kind:'note',id:'note',data:{}};
 assert.throws(()=>validateBackup({schemaVersion:3,records:[r,r]}),/duplicate/);
 assert.throws(()=>validateBackup({schemaVersion:3,records:[{...r,id:'__proto__'}]}),/invalid record/);
});
test('pacing has a meaningful terminal state',()=>{assert.equal(sessionPacing(5,0),'All questions answered');assert.equal(sessionPacing(5,2),'2m 30s per unanswered question');});
test('status counts queued records without cloning their question content',()=>{const s=new LocalStore();s.records.set('a',{scope:'alice',dirty:true,data:()=>{}});s.records.set('b',{scope:'bob',dirty:true});assert.equal(s.dirtyCount('alice'),1);});
