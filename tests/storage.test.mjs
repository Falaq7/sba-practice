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

test('transient device writes retry three times and clear the old save error',async()=>{
 const store=new LocalStore();store.database={};let calls=0;
 store.error='Could not finish saving on this device. Previous failure';
 store.persistOnce=async()=>{if(++calls<3)throw Object.assign(Error('temporary'),{name:'AbortError'});};
 await store.persist({});assert.equal(calls,3);assert.equal(store.error,'');
});
test('permanent device write failure preserves journal and answer after bounded retries',async()=>{
 memory.clear();const store=new LocalStore();store.database={};let calls=0;
 store.persistOnce=async()=>{calls++;throw Object.assign(Error('temporary'),{name:'AbortError'});};
 await assert.rejects(store.put('alice','note','retry',{text:'Keep me',updatedAt:1}));
 assert.equal(calls,3);assert.equal(store.get('alice','note','retry').text,'Keep me');
 assert.ok(memory.has('BM4_V3_RECORD:alice|note|retry'));assert.match(store.error,/download a backup/);
});
test('cloud acknowledgement with unchanged data does not redraw review',async()=>{
 const data={text:'same',updatedAt:1};let receive,redraws=0,writes=0;
 const cloud=new Cloud({get:()=>data,dirty:()=>[],acceptRemote:async()=>{writes++;}});
 cloud.user={uid:'alice'};cloud.api={collection:()=>({}),onSnapshot:(_,options,fn)=>{receive=fn;return ()=>{};}};
 cloud.sync=()=>{};cloud.addEventListener('remote',()=>redraws++);cloud.startProgress('alice');
 await receive({docChanges:()=>[{type:'modified',doc:{data:()=>({kind:'preference',id:'display',data})}}]});
 assert.equal(redraws,0);assert.equal(writes,0);
});

test('closed IndexedDB connection is replaced before retrying a save',async()=>{
 const previous=globalThis.indexedDB;globalThis.indexedDB={};
 try{const store=new LocalStore();store.database={};let calls=0,reopened=0;
 store.persistOnce=async()=>{if(++calls===1)throw Object.assign(Error('closed'),{name:'InvalidStateError'});};store.reconnect=async()=>{reopened++;};
 await store.persist({});assert.equal(calls,2);assert.equal(reopened,1);
 }finally{globalThis.indexedDB=previous;}
});

test('included question content is reused without a network write, but edited content still syncs',async()=>{
 memory.clear();const store=await new LocalStore().open(),cloud=new Cloud(store),q={uid:'included-q',revision:1,stem:'Included question',options:['A','B','C','D','E'],answer:0,why:'Explanation'};
 cloud.bundledQuestions=[q];cloud.user={uid:'alice'};cloud.enabled=true;await store.put('alice','question','included-q@1',{...q,updatedAt:1,collection:'Display title'});
 let writes=0;cloud.api={doc:()=>'',serverTimestamp:()=>0,runTransaction:async(_,fn)=>{writes++;return fn({get:async()=>({exists:()=>false}),set(){}});}};
 await cloud.sync();assert.equal(writes,0);assert.equal(store.dirty('alice').length,0);
 await store.put('alice','question','included-q@1',{...q,why:'Edited explanation',updatedAt:2});await cloud.sync();assert.equal(writes,1);assert.equal(store.dirty('alice').length,0);
});
test('session progress uploads before question bodies queued earlier',async()=>{
 memory.clear();const store=await new LocalStore().open(),cloud=new Cloud(store);await store.put('alice','question','private-q',{uid:'private-q',revision:1,updatedAt:1});await store.put('alice','session','attempt',{id:'attempt',questions:[],answers:{},updatedAt:2});
 cloud.user={uid:'alice'};cloud.enabled=true;const kinds=[];cloud.api={doc:()=>'',serverTimestamp:()=>0,runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>false}),set:(_,r)=>kinds.push(r.kind)})};await cloud.sync();assert.deepEqual(kinds,['session','question']);
});
test('progress listener excludes bulk question bodies and retrieves missing private questions for sessions',async()=>{
 memory.clear();const store=await new LocalStore().open(),cloud=new Cloud(store);cloud.user={uid:'alice'};let receive,filter,reads=0;
 cloud.api={collection:()=>'',where:(...args)=>(filter=args),query:()=>'',doc:(_, ...parts)=>parts.join('/'),onSnapshot:(_,options,fn)=>{assert.equal(options.includeMetadataChanges,true);receive=fn;return ()=>{};},getDoc:async()=>{reads++;return {exists:()=>true,data:()=>({data:{uid:'private',revision:1}})};}};cloud.sync=()=>{};cloud.startProgress('alice');
 assert.equal(filter[0],'kind');assert(!filter[2].includes('question'));
 await receive({size:1,metadata:{fromCache:false},docChanges:()=>[{type:'added',doc:{data:()=>({kind:'session',id:'attempt',data:{id:'attempt',questions:[{key:'private@1'}],answers:{},updatedAt:1}})}}]});
 assert.equal(reads,1);assert.equal(store.get('alice','question','private@1').uid,'private');assert.equal(cloud.receiving,false);assert.ok(cloud.lastDownloadAt);cloud.resetSync();
});
test('a stalled connection is labelled honestly and diagnostics never include question text or credentials',()=>{
 const cloud=new Cloud({dirtyCount:()=>3});cloud.user={uid:'private-user',password:'secret'};cloud.syncing=true;cloud.waitingSince=Date.now()-20000;cloud.syncProgress={done:1,total:3};cloud.trace('uploaded',{kind:'session',milliseconds:500});
 assert.match(cloud.syncStatus(),/Saved on device.*slow sync/);const report=JSON.stringify(cloud.diagnostics());assert(!report.includes('private-user'));assert(!report.includes('secret'));assert.match(report,/uploaded/);
});

test('an aborted sync acknowledgement rejects promptly and preserves the queued record',async()=>{
 const store=new LocalStore(),record={key:'alice|note|n',scope:'alice',kind:'note',id:'n',data:{updatedAt:1},dirty:true};store.records.set(record.key,record);
 store.database={transaction:()=>{const request={result:record},tx={objectStore:()=>({get:()=>request,put(){}})};queueMicrotask(()=>{request.onsuccess();tx.onabort();});return tx;}};
 await assert.rejects(store.markSynced(record),/acknowledgement aborted/);assert.equal(store.dirtyCount('alice'),1);
});
test('temporary network errors schedule a delayed retry without clearing queued progress',async()=>{
 memory.clear();const store=await new LocalStore().open(),cloud=new Cloud(store);await store.put('alice','preference','display',{appearance:'dark',updatedAt:1});cloud.user={uid:'alice'};cloud.enabled=true;cloud.api={doc:()=>'',runTransaction:async()=>{throw {code:'unavailable'};}};
 await cloud.sync();assert.equal(store.dirtyCount('alice'),1);assert.ok(cloud.retryTimer);assert.equal(cloud.syncing,false);assert.ok(cloud.diagnostics().events.some(e=>e.event==='retry-scheduled'));cloud.resetSync();
});
