import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalStore} from '../src/shared/store.mjs';
import {Cloud} from '../src/shared/cloud.mjs';
const memory=new Map();
globalThis.localStorage={get length(){return memory.size;},key:i=>[...memory.keys()][i],getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.BroadcastChannel=undefined;
test('device saves survive reload and guest progress moves into only the signed-in account',async()=>{
 memory.clear();const a=await new LocalStore().open();await a.put(a.guestScope,'bookmark','q',{uid:'q',saved:true,updatedAt:1});
 const b=await new LocalStore().open();assert.equal(b.get(b.guestScope,'bookmark','q').saved,true);
 await b.claimGuest('alice');assert.equal(b.get('alice','bookmark','q').saved,true);assert.equal(b.get('bob','bookmark','q'),null);assert.equal(b.get(b.guestScope,'bookmark','q'),null);
});
test('sync acknowledgement never marks a newer edit as uploaded',async()=>{
 memory.clear();const s=await new LocalStore().open();await s.put('alice','bookmark','q',{saved:true,updatedAt:1});const pending=s.dirty('alice')[0];
 await s.put('alice','bookmark','q',{saved:false,updatedAt:2});await s.markSynced(pending);assert.equal(s.dirty('alice').length,1);
 await s.markSynced(s.dirty('alice')[0]);assert.equal(s.dirty('alice').length,0);
});
test('backup restoration validates the entire envelope before adding any records',async()=>{
 memory.clear();const s=await new LocalStore().open();await assert.rejects(s.import('alice',{schemaVersion:3,records:[{kind:'note',id:'a',data:{}},{kind:'draft',id:'private',data:{}}]}),/invalid record/);assert.equal(s.list('alice').length,0);
 await s.put('alice','note','a',{versions:{one:{text:'text'}},updatedAt:1});const backup=s.export('alice');await s.import('bob',backup);assert.deepEqual(s.get('alice','note','a'),s.get('bob','note','a'));
});
test('cloud authoring rejects guest and learner accounts',async()=>{
 const cloud=new Cloud({});assert.throws(()=>cloud.requireOwner(),/authorised/);cloud.user={uid:'learner'};await assert.rejects(cloud.publish({}),/authorised/);cloud.owner=true;assert.doesNotThrow(()=>cloud.requireOwner());
});
test('local preview account controls explain their availability',async()=>{const c=new Cloud({});c.ready=true;c.preview={};await assert.rejects(c.register('a@b.c','password'),/hosted/);await assert.rejects(c.reset('a@b.c'),/hosted/);});
test('sync transactions merge local/remote note versions and write only the current account',async()=>{
 memory.clear();const s=await new LocalStore().open(),c=new Cloud(s);await s.put('alice','note','q',{versions:{local:{text:'local'}},updatedAt:2});
 const writes=[];c.user={uid:'alice'};c.enabled=true;c.db={};Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 c.api={doc:(_, ...segments)=>segments.join('/'),serverTimestamp:()=>0,runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>({data:{versions:{remote:{text:'remote'}},updatedAt:1}})}),set:(ref,data)=>writes.push({ref,data})})};
 await c.sync();assert.equal(c.error,'');assert.equal(s.dirty('alice').length,0);assert.equal(writes.length,1);assert.match(writes[0].ref,/^users\/alice\/progress\//);assert.equal(Object.keys(s.get('alice','note','q').versions).length,2);
});
test('permission failures leave local progress queued rather than losing it',async()=>{
 memory.clear();const s=await new LocalStore().open(),c=new Cloud(s);await s.put('alice','bookmark','q',{saved:true,updatedAt:1});c.user={uid:'alice'};c.enabled=true;c.db={};c.api={doc:()=>'',runTransaction:async()=>{throw {code:'permission-denied'};}};
 await c.sync();assert.equal(s.dirty('alice').length,1);assert.match(c.error,/device copy is safe/);
});

test('progress reset persists, syncs and excludes older sessions without changing other accounts or preferences',async()=>{
 memory.clear();const a=await new LocalStore().open();
 await a.put('alice','session','old',{id:'old',createdAt:1,updatedAt:2,questions:[],answers:{}});
 await a.put('bob','session','old',{id:'old',createdAt:1,updatedAt:2,questions:[],answers:{}});
 await a.put('alice','bookmark','q',{saved:true,updatedAt:1});await a.put('alice','preference','display',{theme:'prism',updatedAt:1});
 await a.resetProgress('alice');const reset=a.get('alice','preference','history-reset');
 assert.equal(a.list('alice','session').length,0);assert.equal(a.list('bob','session').length,1);assert.equal(a.get('alice','bookmark','q').saved,true);assert.equal(a.get('alice','preference','display').theme,'prism');
 await a.acceptRemote('alice','session','old',{id:'old',createdAt:1,updatedAt:reset.resetAt+1,questions:[],answers:{}});assert.equal(a.get('alice','session','old'),null);
 await a.put('alice','session','new',{id:'new',createdAt:reset.resetAt+2,questions:[],answers:{}});assert.equal(a.list('alice','session').length,1);
 const b=await new LocalStore().open();assert.equal(b.list('alice','session').length,1);assert.ok(b.dirty('alice').some(r=>r.id==='history-reset'));
 const other=new LocalStore();await other.put('alice','session','old',{id:'old',createdAt:1,questions:[],answers:{}});await other.acceptRemote('alice','preference','history-reset',reset);assert.equal(other.list('alice','session').length,0);
});
