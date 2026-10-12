import test from 'node:test';
import assert from 'node:assert/strict';
import {selectPractice,recallCards,focusTopics} from '../dist/public/study-tools.mjs';
const qs=Array.from({length:12},(_,i)=>({uid:'q'+i,revision:1,topic:i<8?'A':'B',stem:'Stem '+i,options:['yes','no'],answer:0,why:'Because '+i}));
test('balanced selections give small topics equal opportunity without duplicates',()=>{const rs=selectPractice(qs,{latest:new Map()},{count:6,balance:true});assert.equal(rs.length,6);assert.equal(rs.filter(q=>q.topic==='B').length,3);assert.equal(new Set(rs.map(q=>q.uid)).size,6);});
test('unseen and incorrect selection excludes previously correct questions',()=>{const stats={latest:new Map([['q0',{correct:true}],['q1',{correct:false}]])};assert.equal(selectPractice(qs,stats,{kind:'incorrect'}).length,1);assert.equal(selectPractice(qs,stats,{kind:'mixed'}).length,11);assert.equal(selectPractice(qs,stats,{kind:'new'}).length,10);assert.equal(selectPractice(qs,stats,{count:0}).length,0);});
test('recall uses supplied teaching content and deduplicates repeated snapshots',()=>{const q={...qs[0],deepReview:{followUpQuestions:[{prompt:'Recall?',answer:'A fact'}]}};const cards=recallCards([q,q,qs[1]]);assert.equal(cards.length,2);assert.equal(cards[0].answer,'A fact');assert.match(cards[1].answer,/Because/);});
test('focus priorities favour confident errors and retain sample sizes',()=>{const c={stats:{latest:new Map([['a',{q:{topic:'A'},correct:false,confidence:'Confident'}],['b',{q:{topic:'B'},correct:true,confidence:'Guess'}]])}};assert.equal(focusTopics(c)[0].name,'A');assert.equal(focusTopics(c)[0].n,1);});

