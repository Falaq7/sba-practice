import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.matchMedia=()=>({matches:true});
const {session}=await import('../dist/public/views.mjs');

function navigation(mode='learn',locked=true){
 const refs=['right','wrong','blank'].map(key=>({key,order:[0,1]}));
 const questionMap=new Map(refs.map(({key})=>[key,{uid:key,module:'Test',stem:'A question',options:['Correct','Incorrect'],answer:0,why:'Reason',distractors:['','Reason']}]));
 const html=session({session:{title:'Test',current:0,mode,questions:refs,answers:{right:{selected:0,locked},wrong:{selected:1,locked}},flags:{wrong:{flagged:true}}},questionMap,answer:{selected:0,eliminated:[],seconds:5},stats:{rows:[]}});
 return [...html.matchAll(/<button data-jump="\d+"[^>]*>/g)].map(match=>match[0]);
}

test('learning navigator distinguishes correct, incorrect, unanswered and flagged questions',()=>{
 const [right,wrong,blank]=navigation();
 assert.match(right,/class="answered correct /);assert.match(right,/aria-label="Question 1, answered, correct"/);assert.match(right,/aria-current="true"/);
 assert.match(wrong,/class="answered incorrect flagged"/);assert.match(wrong,/aria-label="Question 2, answered, incorrect, flagged"/);
 assert.doesNotMatch(blank,/answered|correct|incorrect|flagged/);
});

test('assessment answers and unchecked learning choices do not reveal correctness',()=>{
 for(const buttons of [navigation('assessment'),navigation('learn',false)]){
  assert.match(buttons[0],/class="answered /);
  buttons.forEach(button=>assert.doesNotMatch(button,/correct|incorrect/));
 }
});
