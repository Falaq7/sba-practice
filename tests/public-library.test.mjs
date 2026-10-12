import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Cloud} from '../src/shared/cloud.mjs';
import {parseBank,validateQuestion} from '../src/shared/core.mjs';
const raw=JSON.parse(await readFile(new URL('../content/library.json',import.meta.url),'utf8'));
test('public bundle contains five complete Year 1 banks without preview records',()=>{
 assert.deepEqual(Object.keys(raw).sort(),['questions','releases','schemaVersion','setId','title'].sort());
 const bank=parseBank(raw);assert.equal(bank.questions.length,350);assert.equal(raw.releases.length,5);
 assert.equal(new Set(bank.questions.map(q=>q.uid)).size,350);
 for(const r of raw.releases){const qs=bank.questions.filter(q=>q.collectionId===r.id);assert.equal(qs.length,70);assert.equal(r.count,70);for(const q of qs){assert.equal(q.year,'Year 1');assert.deepEqual(validateQuestion(q).errors,[]);}}
});
test('bundled catalogue works without Firebase and survives remote read failures',async()=>{
 const cloud=new Cloud({});cloud.bundled=raw.releases;cloud.bundledQuestions=parseBank(raw).questions;
 assert.equal((await cloud.manifest()).length,5);assert.equal((await cloud.release(raw.releases[4])).length,70);
 cloud.ready=true;cloud.api={getDocs:()=>{throw Error('Unavailable');},query:x=>x,collection:()=>({}),where:()=>({})};
 assert.equal((await cloud.manifest()).length,5);
 cloud.api.getDocs=async()=>({docs:[{id:'extra',data:()=>({status:'published'})},{id:raw.releases[0].id,data:()=>({status:'published',count:1})}]});
 const releases=await cloud.manifest();assert.equal(releases.length,6);assert.equal(releases.find(r=>r.id===raw.releases[0].id).count,70);
});
