import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseQuestion,parseBank,revisionKey,makeSession,answerSession,finishSession,mergeSession,mergeData,analytics,filterQuestions,studyReport} from '../src/shared/core.mjs';
import {auditDraft,publicationDraft,markPublished,generationPrompt} from '../dist/studio/authoring.mjs';
const question=(id='one')=>normaliseQuestion({id,stem:'Which number is even?',options:['2','3','5','7','9'],answer:0,why:'2 is divisible by 2.',distractors:['','3 is odd.','5 is odd.','7 is odd.','9 is odd.'],year:'Year 1',category:'Physiology',module:'Test module',topic:'Numbers',week:'Week 1',sources:['Test fixture'],reviewedAt:'2026-09-14'},'test');
test('learning submission locks both answer and confidence before feedback',()=>{
 const q=question(),s=makeSession([q]),key=revisionKey(q);answerSession(s,key,1,'Guess',12,100);
 assert.throws(()=>answerSession(s,key,0,'Confident',20,101),/already recorded/);
 assert.equal(s.answers[key].selected,1);assert.equal(s.answers[key].confidence,'Guess');
});
test('assessment remains editable until finish and unsubmitted choices stay skipped',()=>{
 const q=question(),other=question('two'),s=makeSession([q,other],{mode:'assessment'}),key=revisionKey(q);
 answerSession(s,key,1,'Unsure',12,100);answerSession(s,key,0,'Confident',15,110);
 const map=new Map([q,other].map(q=>[revisionKey(q),q]));assert.equal(analytics([s],map).answered,0);
 finishSession(s,120);assert.throws(()=>answerSession(s,key,1,'Guess',20),/finished/);
 const stats=analytics([s],map,[q,other]);assert.equal(stats.answered,1);assert.equal(stats.firstAccuracy,100);assert.equal(stats.meanSeconds,15);
});
test('merge retains first locked answer, pending work on separate questions and completion',()=>{
 const q=question(),other=question('two'),s=makeSession([q,other]);
 const a=structuredClone(s),b=structuredClone(s);answerSession(a,revisionKey(q),1,'Guess',10,100);answerSession(b,revisionKey(q),0,'Confident',5,200);
 a.pending={[revisionKey(q)]:{selected:1,updatedAt:100}};b.pending={[revisionKey(other)]:{selected:2,updatedAt:200}};
 finishSession(a,250);const merged=mergeSession(a,b);assert.equal(merged.answers[revisionKey(q)].selected,1);assert.equal(merged.finishedAt,250);assert.equal(Object.keys(merged.pending).length,2);
 assert.deepEqual(mergeSession(b,a),merged);
});
test('timed session merge never restores elapsed countdown',()=>{const s=makeSession([question()],{timed:true,minutes:1}),b=structuredClone(s);s.remaining=15;b.remaining=40;b.updatedAt++;assert.equal(mergeSession(s,b).remaining,15);});
test('analytics distinguish first attempts, repeats, uncertain answers and blanks',()=>{
 const q=question(),key=revisionKey(q),a=makeSession([q]),b=makeSession([q]);answerSession(a,key,1,'Guess',10,100);answerSession(b,key,0,'Confident',20,200);
 const stats=analytics([b,a],new Map([[key,q]]),[q]);assert.equal(stats.firstAccuracy,0);assert.equal(stats.repeatAccuracy,100);assert.equal(stats.distinct,1);assert.equal(stats.unresolved.length,0);assert.equal(stats.confidence[2].n,1);
 assert.equal(analytics([],new Map()).firstAccuracy,null);assert.equal(filterQuestions([q],{unseen:true},stats).length,0);
 assert.doesNotMatch(studyReport(stats),/Legacy|email|private note/i);
});
test('notes retain both devices versions and bookmark removal wins by timestamp',()=>{
 assert.equal(Object.keys(mergeData('note',{updatedAt:1,versions:{a:{text:'a'}}},{updatedAt:2,versions:{b:{text:'b'}}}).versions).length,2);
 assert.equal(mergeData('bookmark',{saved:true,updatedAt:1},{saved:false,updatedAt:2}).saved,false);
});
test('import catches malformed option arrays and duplicate identifiers',()=>{
 const q=question();assert.throws(()=>parseBank({questions:[{...q,options:[]}]}),/five/);assert.throws(()=>parseBank({questions:[q,q]}),/duplicated/);
 assert.equal(parseBank('```json\n'+JSON.stringify({questions:[q]})+'\n```').questions.length,1);
});
test('publication blocks missing review/source and cross-collection duplicates',()=>{
 const q=question(),d={id:'test',questions:[q]};assert.equal(auditDraft(d).errors,0);
 assert.ok(auditDraft({...d,questions:[{...q,reviewedAt:'',sources:[]}]}).errors>=2);
 assert.ok(auditDraft(d,[{...q,collectionId:'another'}]).errors>0);assert.ok(auditDraft({questions:[]}).errors>0);
});
test('content revisions increase only on changes and old snapshots stay independent',()=>{
 const d={id:'test',questions:[question()]},first=publicationDraft(d);markPublished(d,first);
 assert.equal(publicationDraft(d).questions[0].revision,1);d.questions[0].why='Changed explanation';const next=publicationDraft(d);
 assert.equal(next.questions[0].revision,2);assert.equal(first.questions[0].why,'2 is divisible by 2.');assert.equal(next.questions[0].uid,first.questions[0].uid);
});
test('generation prompt contains selected categorisation and requires owner review',()=>{const p=generationPrompt({module:'M',topic:'T',week:'W',count:5,year:'Year 1',category:'Physiology'});assert.match(p,/Teaching week: W/);assert.match(p,/Do not set reviewedAt/);assert.throws(()=>generationPrompt({count:101}),/between/);});
