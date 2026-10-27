import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
const {review}=await import('../dist/public/views.mjs');
function context(correct,total,answered=total){const refs=[],answers={},questionMap=new Map();for(let i=0;i<total;i++){const key='q'+i;refs.push({key,order:[0,1,2,3,4]});questionMap.set(key,{uid:key,stem:'Example question',options:['A','B','C','D','E'],answer:0,why:'Explanation',distractors:['','B','C','D','E']});if(i<answered)answers[key]={selected:i<correct?0:1,locked:true};}return {session:{id:'score-test',title:'Test session',mode:'learn',finishedAt:1,questions:refs,answers},questionMap,stats:{rows:[]}};}
test('score ring uses all session questions, including skipped questions',()=>{const html=review(context(28,41,40));assert.match(html,/28 \/ 41/);assert.match(html,/data-review-score="68"/);assert.match(html,/aria-label="68% correct, 28 of 41 questions"/);});
test('score ring handles zero and perfect scores',()=>{assert.match(review(context(0,5)),/data-review-score="0"/);assert.match(review(context(5,5)),/data-review-score="100"/);assert.match(review(context(0,0)),/data-review-score="0"/);});
