import {bankManifest,uploadBankQuestions,downloadBank} from './private-banks.mjs';
import {communityKey,communityFingerprint,duplicateMessage} from './community.mjs';
import {mergeData,clone,id} from './core.mjs';
import {placement} from './catalogue.mjs';
import {pinCredentials,usernameFor} from './identity.mjs';
const VERSION='11.10.0';
export class Cloud extends EventTarget {
  constructor(store){super();this.store=store;this.user=null;this.owner=false;this.ready=false;this.syncing=false;this.error='';this.epoch=0;this.enabled=false;}
  async init(){
    if((['127.0.0.1','localhost'].includes(location.hostname)||/^192\.168\.\d{1,3}\.\d{1,3}$/.test(location.hostname)||/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(location.hostname)||/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(location.hostname))){try{const r=await fetch('/__preview/config');if(r.ok){const c=await r.json();if(c.preview){this.preview=c;this.ready=true;this.dispatchEvent(new Event('status'));return;}}}catch{}this.preview={preview:true,offline:true};this.error='Local preview is offline. Device progress is still available.';this.dispatchEvent(new Event('status'));return;}
    const config=globalThis.SBA_FIREBASE_CONFIG;if(!config?.projectId)return;
    try{const base=`https://www.gstatic.com/firebasejs/${VERSION}`;
      const [app,auth,db,functions]=await Promise.all([import(`${base}/firebase-app.js`),import(`${base}/firebase-auth.js`),import(`${base}/firebase-firestore.js`),import(`${base}/firebase-functions.js`)]);
      this.api={...auth,...db,...functions};this.auth=auth.getAuth(app.initializeApp(config));this.db=db.getFirestore();this.functions=functions.getFunctions(undefined,'europe-west2');this.ready=true;
      auth.onAuthStateChanged(this.auth,async user=>{if(user?.isAnonymous){this.reportUser=user;this.dispatchEvent(new Event('status'));return;}this.reportUser=null;const epoch=++this.epoch;this.stop?.();this.enabled=false;this.user=user;this.owner=false;
        if(user){try{const token=await user.getIdTokenResult();if(epoch!==this.epoch)return;this.owner=token.claims.sbaPublisher===true;}catch(e){this.error=message(e);}}
        if(epoch===this.epoch)this.dispatchEvent(new Event('auth'));});
      globalThis.addEventListener('online',()=>this.sync());
    }catch(e){this.error='Online connection unavailable. Device saving still works.';this.dispatchEvent(new Event('status'));}
  }
  async signIn(email,password,legacy=false){if(!this.ready)throw Error('Online accounts are unavailable. Check your connection.');
    if(this.preview)throw Error('Local preview saves on this computer. Account sign-in becomes available when the hosted connection is set up.');
    if(legacy){const handle=email.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');email=`${handle}@users.sba-workspace.app`;password=`SBA4:${handle}:${password}:workspace`;}
    return this.api.signInWithEmailAndPassword(this.auth,email.trim(),password);
  }
  async signInPin(username,pin){const c=pinCredentials(username,pin);return this.signIn(c.email,c.password);}
  async signUpPin(username,pin){const c=pinCredentials(username,pin,{signup:true});return this.register(c.email,c.password);}
  async changePin(currentPin,newPin){if(!this.user||this.preview)throw Error('Sign in on the hosted site to change your PIN.');const old=pinCredentials(usernameFor(this.user),currentPin),next=pinCredentials(old.handle,newPin,{signup:true});await this.api.reauthenticateWithCredential(this.user,this.api.EmailAuthProvider.credential(old.email,old.password));await this.api.updatePassword(this.user,next.password);const ref=this.api.doc(this.db,'profiles',this.user.uid),profile=await this.api.getDoc(ref);if(profile.exists()&&profile.data().pinResetRequired)await this.api.updateDoc(ref,{pinResetRequired:false,updatedAt:this.api.serverTimestamp()});}
  async needsPinChange(){if(!this.user||this.preview)return false;const profile=await this.api.getDoc(this.api.doc(this.db,'profiles',this.user.uid));return profile.exists()&&profile.data().pinResetRequired===true;}
  async register(email,password){if(this.preview)throw Error('Account creation is available on the hosted site. Local preview saves on this computer.');if(!this.ready)throw Error('Online accounts are unavailable.');return this.api.createUserWithEmailAndPassword(this.auth,email.trim(),password);}
  async reset(email){if(this.preview)throw Error('Password reset is available on the hosted site.');if(!this.ready)throw Error('Online accounts are unavailable.');return this.api.sendPasswordResetEmail(this.auth,email.trim());}
  async signOut(){++this.epoch;this.enabled=false;this.stop?.();await this.api.signOut(this.auth);}
  startProgress(uid){
    if(this.user?.uid!==uid)return;this.enabled=true;const epoch=this.epoch,a=this.api;
    this.stop=a.onSnapshot(a.collection(this.db,'users',uid,'progress'),async snap=>{
      if(this.epoch!==epoch||this.user?.uid!==uid)return;
      try{for(const change of snap.docChanges())if(change.type!=='removed'){const r=change.doc.data();if(r.kind&&r.id&&r.data){const data=r.kind==='bank'?await downloadBank(a,this.db,uid,r.data):r.data;if(this.epoch!==epoch||this.user?.uid!==uid)return;await this.store.acceptRemote(uid,r.kind,r.id,data);}}
        if(epoch!==this.epoch)return;this.error='';this.dispatchEvent(new Event('remote'));this.sync();
      }catch(e){this.error=message(e);this.dispatchEvent(new Event('status'));}
    },e=>{this.error=message(e);this.dispatchEvent(new Event('status'));});this.sync();
  }
  async sync(){
    if(!this.enabled||!this.user||this.syncing||!navigator.onLine)return;
    const uid=this.user.uid,epoch=this.epoch,a=this.api;this.syncing=true;this.dispatchEvent(new Event('status'));
    try{for(const r of this.store.dirty(uid)){
      if(epoch!==this.epoch||this.user?.uid!==uid)break;
      if(!['session','question','bookmark','note','preference','report','bank'].includes(r.kind))continue;
      const key=encodeURIComponent(`${r.kind}:${r.id}`),ref=a.doc(this.db,'users',uid,'progress',key);
      if(r.kind==='bank')await uploadBankQuestions(a,this.db,uid,r.data);
      if(epoch!==this.epoch||this.user?.uid!==uid)break;
      const merged=await a.runTransaction(this.db,async tx=>{const old=await tx.get(ref);const data=mergeData(r.kind,old.exists()?old.data().data:null,r.kind==='bank'?bankManifest(r.data):r.data);
        if(new Blob([JSON.stringify(data)]).size>850000)throw Error('A large saved image or record cannot sync. It remains on this device; download a backup.');
        tx.set(ref,{kind:r.kind,id:r.id,data,serverUpdatedAt:a.serverTimestamp()});return data;});
      if(epoch!==this.epoch)break;
      const hydrated=r.kind==='bank'?await downloadBank(a,this.db,uid,merged):merged;if(epoch!==this.epoch||this.user?.uid!==uid)break;await this.store.acceptRemote(uid,r.kind,r.id,hydrated);await this.store.markSynced({...r,data:hydrated});
    }this.error='';}catch(e){this.error=message(e);}finally{this.syncing=false;this.dispatchEvent(new Event('status'));if(!this.error&&epoch===this.epoch&&this.store.dirty(uid).length)queueMicrotask(()=>this.sync());}
  }
  async manifest(){
    if(this.preview&&!this.preview.offline)return (await fetch('/__preview/manifest')).json();
    const bundled=this.bundled||[];
    if(!this.ready)return bundled;
    try{const a=this.api,snap=await a.getDocs(a.query(a.collection(this.db,'libraryReleases'),a.where('status','==','published')));
      const remote=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status==='published');
      return [...new Map([...remote,...bundled].map(r=>[r.id,r])).values()];
    }catch(e){if(bundled.length)return bundled;throw e;}
  }
  async release(release){
    if(this.preview&&!this.preview.offline){const r=await fetch('/__preview/questions?release='+encodeURIComponent(release.id));if(!r.ok)throw Error('Collection unavailable.');return r.json();}
    if(this.bundled?.some(r=>r.id===release.id&&r.currentVersion===release.currentVersion))return this.bundledQuestions.filter(q=>q.collectionId===release.id);
    const a=this.api,snap=await a.getDocs(a.collection(this.db,'libraryReleases',release.id,'versions',release.currentVersion,'questions'));return snap.docs.map(d=>d.data());
  }
  async previewAction(name,body){if(!this.preview?.token)throw Error('Open the local studio to use preview publishing.');const r=await fetch('/__preview/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Preview-Token':this.preview.token},body:JSON.stringify(body)});const out=await r.json();if(!r.ok)throw Error(out.error);return out;}
  requireOwner(){if(!this.user||!this.owner)throw Error('This action requires Falaq’s authorised publishing account.');}
  async drafts(){this.requireOwner();const a=this.api,s=await a.getDocs(a.collection(this.db,'studioDrafts'));return s.docs.map(d=>({id:d.id,...d.data()}));}
  async saveDraft(draft){this.requireOwner();if(new Blob([JSON.stringify(draft)]).size>850000)throw Error('This draft is too large for one online record. Split it into smaller batches or use smaller images; the local copy is safe.');await this.api.setDoc(this.api.doc(this.db,'studioDrafts',draft.id),draft);}
  async publish(draft){
    this.requireOwner();const a=this.api,releaseId=draft.id,version=id('release'),base=a.doc(this.db,'libraryReleases',releaseId);
    // Write an unpublished revision first. The manifest pointer is the atomic publication boundary.
    for(let offset=0;offset<draft.questions.length;offset+=350){const batch=a.writeBatch(this.db);
      draft.questions.slice(offset,offset+350).forEach(q=>batch.set(a.doc(this.db,'libraryReleases',releaseId,'versions',version,'questions',encodeURIComponent(q.uid)),{...q,collection:draft.title,publishedAt:Date.now()}));await batch.commit();}
    const old=await a.getDoc(base),previous=old.exists()?old.data().currentVersion:null;
    const metadata={...placement(draft.questions),title:draft.title,count:draft.questions.length,modules:[...new Set(draft.questions.map(q=>q.module))],topics:[...new Set(draft.questions.map(q=>q.topic))],weeks:[...new Set(draft.questions.map(q=>q.week).filter(Boolean))],publishedAt:Date.now(),ownerUid:this.user.uid};
    await a.setDoc(a.doc(this.db,'libraryReleases',releaseId,'versions',version),metadata);
    await a.setDoc(base,{...metadata,status:'published',currentVersion:version,previousVersion:previous});
    return version;
  }
  async withdraw(releaseId){this.requireOwner();await this.api.updateDoc(this.api.doc(this.db,'libraryReleases',releaseId),{status:'withdrawn',updatedAt:Date.now()});}
  async rollback(releaseId){this.requireOwner();const a=this.api,ref=a.doc(this.db,'libraryReleases',releaseId);await a.runTransaction(this.db,async tx=>{const snap=await tx.get(ref),r=snap.data();if(!r?.previousVersion)throw Error('There is no previous published revision.');const version=await tx.get(a.doc(this.db,'libraryReleases',releaseId,'versions',r.previousVersion));if(!version.exists())throw Error('Previous revision metadata is unavailable.');tx.update(ref,{...version.data(),currentVersion:r.previousVersion,previousVersion:r.currentVersion,updatedAt:Date.now()});});}
  async communityBanks(){
    let banks;if(this.preview){const r=await fetch('/__preview/community');if(!r.ok)throw Error('Community banks unavailable.');banks=await r.json();}else{if(!this.ready)return [];const a=this.api,snap=await a.getDocs(a.query(a.collection(this.db,'communityBanks'),a.where('status','==','published')));banks=snap.docs.map(d=>({...d.data(),id:d.id}));}
    const {parseBank,validateQuestion}=await import('./core.mjs');const seen=new Set();return banks.flatMap(b=>{try{if(typeof b.title!=='string'||b.title.length>120||b.questions.length>100)return [];const parsed=parseBank({...b,setId:b.id});if(parsed.questions.some(q=>validateQuestion(q).errors.length))return [];const key=communityKey(parsed);if(seen.has(key))return [];seen.add(key);return [{...b,questions:parsed.questions}];}catch{return [];}});
  }
  async shareCommunity(bank){
    const {parseBank,validateQuestion}=await import('./core.mjs');if(!bank.title?.trim()||bank.title.length>120)throw Error('Use a title under 120 characters.');if(bank.questions.length>100)throw Error('Share up to 100 questions per bank.');const sharedId=await communityFingerprint(bank),parsed=parseBank({...bank,setId:sharedId,questions:bank.questions.map(q=>({...q,uid:undefined}))});for(const q of parsed.questions){const errors=validateQuestion(q).errors;if(errors.length)throw Error(errors.join(' '));}
    const payload={id:sharedId,title:bank.title.trim(),questions:parsed.questions,status:'published',createdAt:Date.now()};if(new TextEncoder().encode(JSON.stringify(payload)).length>800000)throw Error('This bank is too large to share. Keep it under 800 KB.');
    if(this.preview){const r=await fetch('/__preview/community',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const out=await r.json();if(!r.ok)throw Error(out.error||'Could not share bank.');return out;}
    if(!this.ready||!this.user)throw Error('Sign in to share a bank with the community.');if((await this.communityBanks()).some(b=>communityKey(b)===communityKey(parsed)))throw Error(duplicateMessage);const ref=this.api.doc(this.db,'communityBanks',sharedId);await this.api.runTransaction(this.db,async tx=>{const old=await tx.get(ref);if(old.exists())throw Error(duplicateMessage);tx.set(ref,{...payload,ownerUid:this.user.uid});});return {id:sharedId};
  }
  async report(data){if(this.preview){const r=await fetch('/__preview/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const out=await r.json();if(!r.ok)throw Error(out.error||'Report could not be sent.');return;}if(!this.ready)throw Error('Reports are saved on this device until you reconnect.');let reporter=this.auth.currentUser;if(!reporter)try{reporter=(await this.api.signInAnonymously(this.auth)).user;}catch(e){if(/admin-restricted-operation|operation-not-allowed/.test(e.code||''))throw Error('Guest reporting is not enabled on the hosted site yet. Your report is saved on this device.');throw Error(message(e));}const a=this.api,ref=a.doc(this.db,'questionReports',data.id),limit=a.doc(this.db,'reportSenders',reporter.uid);await a.runTransaction(this.db,async tx=>{const [existing,last]=await Promise.all([tx.get(ref),tx.get(limit)]);if(existing.exists())return;if(last.exists()&&Date.now()-last.data().sentAt.toMillis()<30000)throw Error('Please wait 30 seconds before sending another report. Your report stays saved here.');tx.set(ref,{...data,ownerUid:reporter.uid});tx.set(limit,{sentAt:a.serverTimestamp(),lastReportId:data.id});});}
  async reports(){if(this.preview){const r=await fetch('/__preview/reports',{headers:{'x-preview-token':this.preview.token}});if(!r.ok)throw Error('Report access unavailable.');return r.json();}this.requireOwner();const snap=await this.api.getDocs(this.api.collection(this.db,'questionReports'));return snap.docs.map(d=>d.data());}
  async accountAdmin(operation,data){
    if(this.preview)return this.previewAction('account-'+operation,data);
    this.requireOwner();try{return (await this.api.httpsCallable(this.functions,'manageSbaAccount')({operation,...data})).data;}catch(e){if(/No account has that username/.test(e.message||''))throw Error(e.message);if(/not-found|internal|unavailable/.test(e.code||''))throw Error('Account management is not connected yet. Deploy the private recovery function; the existing maintainer reset utility is still available.');throw e;}
  }
  async resolveReport(reportId){if(this.preview)return this.previewAction('resolve-report',{id:reportId});this.requireOwner();await this.api.updateDoc(this.api.doc(this.db,'questionReports',reportId),{resolvedAt:Date.now()});}
}
export function message(e){const code=e?.code||'';if(/invalid-credential|wrong-password|user-not-found/.test(code))return 'The sign-in details were not recognised.';if(code.includes('email-already-in-use'))return 'That username is already taken. Choose another, or sign in.';if(/permission-denied|unauthorized/.test(code))return 'Online access is not configured for this account yet. Your device copy is safe.';if(code.includes('network'))return 'No connection. Changes remain saved on this device.';return e?.message||'The action could not be completed.';}
