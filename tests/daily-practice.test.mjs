import test from 'node:test';
import assert from 'node:assert/strict';
import {practicePlan,periodResults} from '../dist/public/daily-practice.mjs';
const qs=Array.from({length:20},(_,i)=>({uid:String(i),stem:'Q'+i,answer:0,options:['a','b'],year:'Year 1',specialty:i<10?'Cardiology':'Respiratory',category:i%2?'Anatomy':'Pharmacology'}));
const stats={latest:new Map(),first:[]};
test('sparse sessions contain no duplicates or other years',()=>{const p=practicePlan([qs[0],qs[0],{...qs[1],year:'Year 2'}],stats,30,'Year 1');assert.equal(p.questions.length,1);assert.equal(p.unseen,1);});
test('cold start balances broad groups and respects time budget',()=>{const p=practicePlan(qs,stats,15,'Year 1');assert.equal(p.questions.length,7);assert.equal(new Set(p.questions.map(q=>q.uid)).size,7);assert.equal(new Set(p.questions.map(q=>q.specialty)).size,2);assert.equal(p.focus.length,0);});
test('weak pairs require several answers and changed questions are unseen',()=>{const latest=new Map(qs.slice(0,6).map(q=>[q.uid,{q,correct:false}]));assert.equal(practicePlan(qs,{latest},15,'Year 1').focus.length,2);assert.equal(practicePlan(qs.map(q=>({...q,stem:q.stem+'changed'})),{latest},15,'Year 1').focus.length,0);});
test('period boundaries do not overlap or count future answers',()=>{const now=100*86400000;const first=[{answeredAt:now,correct:true},{answeredAt:now-30*86400000,correct:false},{answeredAt:now-60*86400000,correct:true},{answeredAt:now+1,correct:true}];assert.deepEqual(periodResults({first},now),{recent:{n:1,correct:1},previous:{n:1,correct:0}});});
