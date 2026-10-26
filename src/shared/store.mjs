import {clone,mergeData,id,stableStringify} from './core.mjs';
import {validateBackup} from './backup-validation.mjs';
const PREFIX='BM4_V3_RECORD:';
export class LocalStore extends EventTarget {
  constructor(name='BM4_SBA_V3'){super();this.name=name;this.records=new Map();this.database=null;this.error='';this.fallback=false;this.pending=new Set();}
  async open(){
    try{this.database=await new Promise((resolve,reject)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close another old copy of the site to finish opening storage.'));});
      const rows=await this.readAll();rows.forEach(r=>this.records.set(r.key,r));
    }catch(e){this.fallback=true;this.error='Using limited browser storage. Keep a progress backup.';}
    const recovery=[];
    try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(PREFIX)){try{const r=JSON.parse(localStorage.getItem(k));this.records.set(r.key,this.mergeRecord(this.records.get(r.key),r));recovery.push(r);}catch{this.error='A saved record could not be read. Original data was preserved.';}}}}catch{if(!this.database)this.error='Device storage is unavailable. Keep this tab open and download a backup.';}
    if(this.database) for(const r of recovery) await this.persist(r);
    if(globalThis.BroadcastChannel){this.channel=new BroadcastChannel(this.name);this.channel.onmessage=async()=>{if(this.database){const rows=await this.readAll();rows.forEach(r=>this.records.set(r.key,this.mergeRecord(this.records.get(r.key),r)));this.dispatchEvent(new Event('remote'));}};}
    globalThis.addEventListener?.('storage',e=>{if(e.key?.startsWith(PREFIX)&&e.newValue){try{const r=JSON.parse(e.newValue);this.records.set(r.key,this.mergeRecord(this.records.get(r.key),r));this.dispatchEvent(new Event('remote'));}catch{}}});
    this.guestScope=this.get('meta','setting','guest')?.scope||id('guest');
    if(!this.get('meta','setting','guest')) await this.put('meta','setting','guest',{scope:this.guestScope,updatedAt:Date.now()},false).catch(()=>{});
    if(!this.get('meta','setting','bank-scope-migration')){
      const destination=this.personalScope;
      for(const r of [...this.records.values()].filter(r=>r.scope==='device-question-banks'&&r.kind==='bank'))await this.put(destination,'bank',r.id,{...r.data,localOnly:false});
      await this.put('meta','setting','bank-scope-migration',{done:true,updatedAt:Date.now()},false);
    }
    return this;
  }
  get guestScope(){return this.get('meta','setting','guest')?.scope||this.initialGuestScope;}
  set guestScope(value){this.initialGuestScope=value;}
  get personalScope(){return this.currentScope||this.get('meta','setting','activeAccount')?.scope||this.guestScope;}
  key(scope,kind,recordId){return `${scope}|${kind}|${recordId}`;}
  visible(record){
    if(!record)return false;
    if(record.kind!=='session')return true;
    if(record.data.deletedAt)return false;
    const reset=this.records.get(this.key(record.scope,'preference','history-reset'))?.data?.resetAt||0;
    return !reset||(record.data.createdAt||0)>reset;
  }
  get(scope,kind,recordId){const r=this.records.get(this.key(scope,kind,recordId));return clone(this.visible(r)?r.data:null);}
  list(scope,kind){return [...this.records.values()].filter(r=>r.scope===scope&&(!kind||r.kind===kind)&&this.visible(r)).map(r=>clone(r.data));}
  async resetProgress(scope){
    await Promise.all([...this.pending]);
    const resetAt=Math.max(Date.now(),...this.list(scope,'session').map(s=>s.createdAt||0));
    await this.put(scope,'preference','history-reset',{resetAt,updatedAt:resetAt});
  }
  dirtyCount(scope){let count=0;for(const r of this.records.values())if(r.scope===scope&&r.dirty)count++;return count;}
  dirty(scope){return [...this.records.values()].filter(r=>r.scope===scope&&r.dirty).map(clone);}
  mergeRecord(a,b){if(!a)return clone(b);return {...b,data:mergeData(b.kind,a.data,b.data),dirty:a.dirty||b.dirty};}
  readAll(){return new Promise((resolve,reject)=>{const tx=this.database.transaction('records','readonly'),r=tx.objectStore('records').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async put(scope,kind,recordId,data,dirty=true){
    const key=this.key(scope,kind,recordId),old=this.records.get(key);
    const record={key,scope,kind,id:recordId,data:mergeData(kind,old?.data,data),dirty:dirty||!!old?.dirty};
    // Journal only the changed record synchronously before the asynchronous database write.
    this.records.set(key,record);
    const text=JSON.stringify(record);try{localStorage.setItem(PREFIX+key,text);}catch(e){if(!this.database){this.error='Device storage is unavailable. Download a backup before closing.';this.dispatchEvent(new Event('change'));}}
    const work=this.persist(record);this.pending.add(work);
    try{await work;this.dispatchEvent(new Event('change'));this.channel?.postMessage(key);return this.get(scope,kind,recordId);}finally{this.pending.delete(work);}
  }
  async persist(record){
    if(!this.database)return;
    for(let attempt=0;attempt<3;attempt++){
      try{await this.persistOnce(record);if(this.error.startsWith('Could not finish saving on this device.'))this.error='';return;}
      catch(e){if(attempt<2&&!['QuotaExceededError','DataCloneError'].includes(e?.name)){await new Promise(resolve=>setTimeout(resolve,150*2**attempt));continue;}
        this.error='Could not finish saving on this device. Your answer is kept in this tab; download a backup before closing.';this.dispatchEvent(new Event('change'));throw e;
      }
    }
  }
  async persistOnce(record){
    if(!this.database)return;
    await new Promise((resolve,reject)=>{const tx=this.database.transaction('records','readwrite'),table=tx.objectStore('records'),r=table.get(record.key);let merged;
      r.onsuccess=()=>{merged=this.mergeRecord(r.result,record);table.put(merged);};
      tx.oncomplete=()=>{this.records.set(record.key,this.mergeRecord(merged,this.records.get(record.key)||merged));try{const journal=localStorage.getItem(PREFIX+record.key);if(journal&&stableStringify(JSON.parse(journal).data)===stableStringify(record.data))localStorage.removeItem(PREFIX+record.key);}catch{}resolve();};
      tx.onerror=tx.onabort=()=>reject(tx.error||Object.assign(Error('Device save transaction aborted'),{name:'AbortError'}));});
  }
  async acceptRemote(scope,kind,recordId,data){return this.put(scope,kind,recordId,data,false);}
  async markSynced(record){
    const current=this.records.get(record.key);if(!current||stableStringify(current.data)!==stableStringify(record.data))return;
    const clean={...current,dirty:false};
    if(this.database)await new Promise((resolve,reject)=>{const tx=this.database.transaction('records','readwrite'),table=tx.objectStore('records'),r=table.get(record.key);r.onsuccess=()=>{if(stableStringify(r.result?.data)===stableStringify(record.data))table.put(clean);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    if(stableStringify(this.records.get(record.key)?.data)!==stableStringify(record.data))return;
    this.records.set(record.key,clean);if(this.fallback)try{localStorage.setItem(PREFIX+record.key,JSON.stringify(clean));}catch{this.error='Device storage is unavailable. Download a backup before closing.';}
  }
  async claimGuest(uid){
    const move=async()=>{
      // Two signed-in tabs must not each claim the same guest's work.
      if(this.database)(await this.readAll()).forEach(r=>this.records.set(r.key,this.mergeRecord(this.records.get(r.key),r)));
      const guest=this.guestScope,records=[...this.records.values()].filter(r=>r.scope===guest);
      for(const r of records)await this.put(uid,r.kind,r.id,r.data);
      await this.put('meta','setting','guest',{scope:id('guest'),updatedAt:Date.now()},false);
      return records.length;
    };
    return globalThis.navigator?.locks?globalThis.navigator.locks.request(this.name+':claim-guest',move):move();
  }
  export(scope){return {schemaVersion:3,backupType:'complete',exportedAt:new Date().toISOString(),records:[...this.records.values()].filter(r=>r.scope===scope&&this.visible(r)).map(({kind,id,data})=>({kind,id,data}))};}
  async import(scope,backup){
    const valid=validateBackup(backup);
    for(const r of valid.records)await this.put(scope,r.kind,r.id,r.data);
  }
}
