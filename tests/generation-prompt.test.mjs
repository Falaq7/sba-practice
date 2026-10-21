import test from 'node:test';
import assert from 'node:assert/strict';
import {generationPrompt as publicPrompt} from '../dist/public/generation-prompt.mjs';
import {generationPrompt as studioPrompt} from '../dist/studio/authoring.mjs';

const settings={module:'Renal',topic:'Filtration',count:3,category:'Physiology',year:'Year 1'};
function template(prompt){return JSON.parse(prompt.split('OUTPUT TEMPLATE')[1].split('\n{')[1].split('\n\nFINAL CHECK')[0].replace(/^/,'{'));}

test('public and studio generators share the complete import template and comparison material',()=>{
 const input={...settings,objectives:'LO9 Explain filtration.',existingQuestions:'Existing: calculate filtered load from GFR and concentration.'};
 const prompt=publicPrompt(input);
 assert.equal(prompt,studioPrompt(input));
 assert.ok(prompt.includes(input.objectives));
 assert.ok(prompt.includes(input.existingQuestions));
 const q=template(prompt).questions[0];
 assert.equal(q.year,'Year 1');
 assert.equal(q.module,'Renal');
 assert.equal(q.options.length,5);
 assert.equal(q.distractors.length,5);
 assert.equal(q.distractors[q.answer],'');
 assert.ok(Array.isArray(q.lo)&&q.lo.length===1);
 assert.equal(typeof q.assessmentObjective,'string');
 assert.ok(q.assessmentObjective.length>0);
 assert.equal(q.reviewedAt,undefined);
});

test('without supplied objectives the example does not invent curriculum links',()=>{
 for(const objectives of [undefined,'','   '])assert.deepEqual(template(publicPrompt({...settings,objectives})).questions[0].lo,[]);
});
