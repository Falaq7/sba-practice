/* Optional Firebase-backed accounts and community question-bank library. */
const CLOUD_SDK_VERSION='11.10.0';
const CLOUD_MAX_BANK_BYTES=780000;
const cloudState={configured:false,loading:false,ready:false,error:'',auth:null,store:null,api:null,user:null,profile:null,myBanks:[],publicBanks:[],failedPins:0,cooldownUntil:0};

function cloudConfig(){return window.SBA_FIREBASE_CONFIG||null}
function cloudConfigReady(){const c=cloudConfig();return!!(c&&c.apiKey&&c.projectId&&c.appId&&!Object.values(c).some(v=>String(v).includes('REPLACE_ME')))}
function cloudHandle(value){return String(value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,24)}
function cloudDisplayName(value){return String(value||'').trim().replace(/\s+/g,' ').slice(0,28)}
function cloudEmail(handle){return`${cloudHandle(handle)}@users.sba-workspace.app`}
function cloudCredential(handle,pin){return`SBA4:${cloudHandle(handle)}:${pin}:workspace`}
function cloudHeroHeading(){return cloudState.profile?.displayName?`<h1>SBA Workspace:<br><span>${esc(cloudState.profile.displayName)}</span></h1>`:'<h1>Your SBA<br><span>workspace.</span></h1>'}
function cloudTimestampMillis(value){return value?.toMillis?.()||Number(value)||0}
function cloudDate(value){const n=cloudTimestampMillis(value);return n?new Date(n).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'Recently'}
function cloudErrorMessage(error){const code=String(error?.code||'');if(code.includes('email-already-in-use'))return'That username is already taken.';if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))return'Username or PIN not recognised.';if(code.includes('too-many-requests'))return'Too many attempts. Please wait before trying again.';if(code.includes('network'))return'Could not reach the online workspace. Check your connection.';return error?.message||'The online workspace could not complete that action.'}
function cloudSetBusy(button,busy,label='Working…'){if(!button)return;button.disabled=busy;if(busy){button.dataset.oldText=button.textContent;button.textContent=label}else if(button.dataset.oldText){button.textContent=button.dataset.oldText;delete button.dataset.oldText}}

function cloudUpdateAccountButton(){const button=document.getElementById('cloudAccountButton');if(!button)return;if(cloudState.profile){button.textContent=`◉ ${cloudState.profile.displayName}`;button.classList.add('signed-in');button.title='Open your account'}else if(cloudState.loading){button.textContent='Connecting…';button.classList.remove('signed-in')}else{button.textContent=cloudState.configured?'Sign in':'Online unavailable';button.classList.remove('signed-in');button.title=cloudState.configured?'Sign in or create an account':'Online accounts are not configured yet'}}

function cloudAccountModal(){
  if(!cloudState.configured){modal(`<div class="q-top"><div><span class="eyebrow">Online workspace</span><h2>Connection setup required</h2></div><button class="v2-btn" data-act="close-modal">Close</button></div><div class="cloud-notice"><b>Online accounts are temporarily unavailable.</b><p>The workspace owner needs to complete the connection before sign-in and shared banks can be used.</p></div>`);return}
  if(cloudState.profile){modal(`<div class="q-top"><div><span class="eyebrow">Signed in</span><h2>${esc(cloudState.profile.displayName)}</h2></div><button class="v2-btn" data-act="close-modal">Close</button></div><div class="cloud-account-summary"><span class="cloud-avatar">${esc(cloudState.profile.displayName.slice(0,1).toUpperCase())}</span><div><b>@${esc(cloudState.profile.username)}</b><p class="muted">Your online banks follow this account between devices.</p></div></div><div class="button-row end"><button class="v2-btn" data-act="banks">Open question banks</button><button class="v2-btn" data-cloud-act="change-pin">Change PIN</button><button class="v2-btn danger" data-cloud-act="sign-out">Sign out</button></div>`);return}
  modal(`<div class="q-top"><div><span class="eyebrow">Online workspace</span><h2>Sign in or create an account</h2></div><button class="v2-btn" data-act="close-modal">Close</button></div><p class="muted">Use a memorable username and a four-digit PIN. This is a low-stakes educational account—never reuse an important PIN.</p><div class="cloud-auth-grid"><label class="editor-field"><span>Username</span><input id="cloudUsername" autocomplete="username" maxlength="24" placeholder="e.g. studybuddy"></label><label class="editor-field"><span>Four-digit PIN</span><input id="cloudPin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="4" pattern="[0-9]{4}" placeholder="••••"></label></div><p class="cloud-auth-error" id="cloudAuthError" role="alert"></p><div class="button-row end"><button class="v2-btn" data-cloud-act="create-account">Create account</button><button class="v2-btn primary" data-cloud-act="sign-in">Sign in</button></div><div class="privacy-note">If you forgot your PIN/login, message me :)</div>`);setTimeout(()=>document.getElementById('cloudUsername')?.focus(),0)
}

function cloudChangePinModal(forced=false){
  if(!cloudState.user||!cloudState.profile)return cloudAccountModal();
  modal(`<div class="q-top"><div><span class="eyebrow">Account security</span><h2>${forced?'Choose a new PIN':'Change your PIN'}</h2></div>${forced?'':'<button class="v2-btn" data-act="close-modal">Close</button>'}</div><p class="muted">${forced?'Your account was given a temporary PIN. Replace it before continuing.':'Enter your current PIN and choose four new digits.'}</p><div class="cloud-auth-grid"><label class="editor-field"><span>${forced?'Temporary PIN':'Current PIN'}</span><input id="cloudCurrentPin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="4" pattern="[0-9]{4}" placeholder="••••"></label><label class="editor-field"><span>New PIN</span><input id="cloudNewPin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="4" pattern="[0-9]{4}" placeholder="••••"></label><label class="editor-field"><span>Confirm new PIN</span><input id="cloudConfirmPin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="4" pattern="[0-9]{4}" placeholder="••••"></label></div><p class="cloud-auth-error" id="cloudPinError" role="alert"></p><div class="button-row end"><button class="v2-btn primary" data-cloud-act="save-new-pin">Save new PIN</button></div>`);setTimeout(()=>document.getElementById('cloudCurrentPin')?.focus(),0)
}

async function cloudChangePin(button){
  const current=String(document.getElementById('cloudCurrentPin')?.value||''),next=String(document.getElementById('cloudNewPin')?.value||''),confirmPin=String(document.getElementById('cloudConfirmPin')?.value||''),errorBox=document.getElementById('cloudPinError');
  if(!/^\d{4}$/.test(current)||!/^\d{4}$/.test(next)){errorBox.textContent='Both PINs must contain exactly four digits.';return}
  if(next!==confirmPin){errorBox.textContent='The new PINs do not match.';return}
  if(next===current){errorBox.textContent='Choose a different PIN.';return}
  cloudSetBusy(button,true,'Saving…');errorBox.textContent='';
  try{
    const api=cloudState.api,handle=cloudState.profile.username,user=cloudState.user,credential=api.EmailAuthProvider.credential(user.email,cloudCredential(handle,current));
    await api.reauthenticateWithCredential(user,credential);await api.updatePassword(user,cloudCredential(handle,next));
    await api.setDoc(api.doc(cloudState.store,'profiles',user.uid),{pinResetRequired:false,updatedAt:api.serverTimestamp()},{merge:true});cloudState.profile.pinResetRequired=false;closeModal();toast('PIN changed')
  }catch(error){errorBox.textContent=String(error?.code||'').includes('invalid-credential')?'The current or temporary PIN is incorrect.':cloudErrorMessage(error)}finally{cloudSetBusy(button,false)}
}

async function cloudAuthenticate(create,button){
  if(!cloudState.ready)return;
  const usernameInput=document.getElementById('cloudUsername'),pinInput=document.getElementById('cloudPin'),errorBox=document.getElementById('cloudAuthError');
  const display=cloudDisplayName(usernameInput?.value),handle=cloudHandle(display),pin=String(pinInput?.value||'');
  if(handle.length<3){errorBox.textContent='Use at least three letters, numbers or underscores.';return}
  if(!/^\d{4}$/.test(pin)){errorBox.textContent='Enter exactly four digits.';return}
  if(Date.now()<cloudState.cooldownUntil){errorBox.textContent='Please wait a minute before trying again.';return}
  cloudSetBusy(button,true,create?'Creating…':'Signing in…');errorBox.textContent='';
  try{
    const api=cloudState.api;let credential;
    if(create){credential=await api.createUserWithEmailAndPassword(cloudState.auth,cloudEmail(handle),cloudCredential(handle,pin));await api.updateProfile(credential.user,{displayName:display});await api.setDoc(api.doc(cloudState.store,'profiles',credential.user.uid),{username:handle,displayName:display,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()})}
    else credential=await api.signInWithEmailAndPassword(cloudState.auth,cloudEmail(handle),cloudCredential(handle,pin));
    cloudState.failedPins=0;closeModal();toast(create?'Account created':'Signed in')
  }catch(error){cloudState.failedPins++;if(cloudState.failedPins>=5){cloudState.cooldownUntil=Date.now()+60000;cloudState.failedPins=0}errorBox.textContent=cloudErrorMessage(error)}finally{cloudSetBusy(button,false)}
}

async function cloudLoadProfile(user){
  const api=cloudState.api,ref=api.doc(cloudState.store,'profiles',user.uid),snap=await api.getDoc(ref);
  if(snap.exists())return snap.data();
  const username=cloudHandle(user.email?.split('@')[0]||'learner'),displayName=cloudDisplayName(user.displayName||username);
  const profile={username,displayName,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()};await api.setDoc(ref,profile);return{username,displayName}
}

async function cloudRefreshData({quiet=false}={}){
  if(!cloudState.ready)return;
  const api=cloudState.api;
  try{
    if(cloudState.user){const own=await api.getDocs(api.collection(cloudState.store,'users',cloudState.user.uid,'banks'));cloudState.myBanks=own.docs.map(d=>({cloudId:d.id,...d.data()}))}else cloudState.myBanks=[];
    const published=await api.getDocs(api.query(api.collection(cloudState.store,'publicBanks'),api.orderBy('publishedAt','desc')));cloudState.publicBanks=published.docs.map(d=>({cloudId:d.id,...d.data()}));
    if(view==='banks')renderBanks()
  }catch(error){cloudState.error=cloudErrorMessage(error);if(!quiet)toast(cloudState.error)}
}

async function cloudInitialise(){
  if(cloudState.loading||cloudState.ready)return;cloudState.configured=cloudConfigReady();cloudUpdateAccountButton();if(!cloudState.configured)return;
  cloudState.loading=true;cloudUpdateAccountButton();
  try{
    const base=`https://www.gstatic.com/firebasejs/${CLOUD_SDK_VERSION}`;
    const [appApi,authApi,fireApi]=await Promise.all([import(`${base}/firebase-app.js`),import(`${base}/firebase-auth.js`),import(`${base}/firebase-firestore.js`)]);
    const firebaseApp=appApi.initializeApp(cloudConfig());cloudState.auth=authApi.getAuth(firebaseApp);cloudState.store=fireApi.getFirestore(firebaseApp);cloudState.api={...authApi,...fireApi};cloudState.ready=true;
    authApi.onAuthStateChanged(cloudState.auth,async user=>{cloudState.user=user;cloudState.profile=user?await cloudLoadProfile(user):null;cloudUpdateAccountButton();await cloudRefreshData({quiet:true});if(view==='home')render();if(cloudState.profile?.pinResetRequired)setTimeout(()=>cloudChangePinModal(true),100)})
  }catch(error){cloudState.error=cloudErrorMessage(error);console.warn('Online workspace unavailable:',error)}finally{cloudState.loading=false;cloudUpdateAccountButton()}
}

function cloudThemeWeights(bankData){const counts=countBy(bankData.questions||[],q=>[canonicalTaxonomyValue('themes',q.theme)]),total=Math.max(1,bankData.questions?.length||0),weights={};for(const theme of STANDARD_TAXONOMY.themes)weights[theme]=Math.round((counts[theme]||0)/total*1000)/10;return weights}
function cloudPrimaryTheme(weights){return Object.entries(weights).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||'General'}
function cloudBankId(bank){return`${cloudState.user.uid}_${String(bank.id||bank.setId).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)}`}
function cloudBankPayload(bank){
  const data=clone(bank.data),size=new Blob([JSON.stringify(data)]).size;if(size>CLOUD_MAX_BANK_BYTES)throw Error('This bank is too large for online storage. Export it as JSON and reduce embedded image sizes first.');
  const themeWeights=cloudThemeWeights(data);return{schemaVersion:1,ownerUid:cloudState.user.uid,authorName:cloudState.profile.displayName,authorHandle:cloudState.profile.username,sourceBankId:bank.id,title:bank.title,setId:bank.setId,questionCount:data.questions.length,themeWeights,primaryTheme:cloudPrimaryTheme(themeWeights),bank:data,updatedAt:cloudState.api.serverTimestamp()}
}

async function cloudSavePrivateBank(bankId,{quiet=false}={}){
  if(!cloudState.user){cloudAccountModal();return null}const b=db.banks.find(x=>x.id===bankId&&!x.builtin);if(!b)throw Error('Only editable question banks can be saved online.');const payload=cloudBankPayload(b),id=cloudBankId(b),ref=cloudState.api.doc(cloudState.store,'users',cloudState.user.uid,'banks',id);await cloudState.api.setDoc(ref,payload,{merge:true});await cloudRefreshData({quiet:true});if(!quiet)toast('Saved to your account');return{id,payload}
}
async function cloudPublishBank(bankId){
  if(!cloudState.user){cloudAccountModal();return}const b=db.banks.find(x=>x.id===bankId&&!x.builtin);if(!b)return;if(!confirm(`Publish “${b.title}” to the Community Library? Anyone will be able to copy its questions and explanations.`))return;
  const saved=await cloudSavePrivateBank(bankId,{quiet:true});if(!saved)return;await cloudState.api.setDoc(cloudState.api.doc(cloudState.store,'publicBanks',saved.id),{...saved.payload,visibility:'public',publishedAt:cloudState.api.serverTimestamp()},{merge:true});await cloudRefreshData({quiet:true});toast('Published to the Community Library')
}
async function cloudUnpublish(cloudId){if(!cloudState.user)return;const item=cloudState.publicBanks.find(x=>x.cloudId===cloudId&&x.ownerUid===cloudState.user.uid);if(!item)return;if(!confirm(`Remove “${item.title}” from the Community Library? Personal copies already made by other learners will remain.`))return;await cloudState.api.deleteDoc(cloudState.api.doc(cloudState.store,'publicBanks',cloudId));await cloudRefreshData({quiet:true});toast('Bank unpublished')}

function cloudAddToWorkspace(cloudId,source){
  const record=(source==='mine'?cloudState.myBanks:cloudState.publicBanks).find(x=>x.cloudId===cloudId);if(!record?.bank)return;
  const imported=normaliseBank(clone(record.bank));imported.id=`${imported.setId}-${Date.now()}`;imported.setId=imported.id;imported.title=source==='public'?`${record.title} — by ${record.authorName}`:record.title;imported.data.setId=imported.setId;imported.data.title=imported.title;db.banks.push(imported);db.currentBankId=imported.id;save();renderBanks();toast('Added an editable copy to your workspace')
}

function cloudLocalButtons(){
  if(!cloudState.user)return;const cards=[...document.querySelectorAll('.bank-card')],banks=db.banks.filter(x=>!x.archived);cards.slice(0,banks.length).forEach((card,index)=>{const b=banks[index];if(!b||b.builtin)return;const row=card.querySelector('.button-row'),online=cloudState.myBanks.find(x=>x.sourceBankId===b.id),published=online&&cloudState.publicBanks.find(x=>x.cloudId===online.cloudId&&x.ownerUid===cloudState.user.uid);if(!row)return;row.insertAdjacentHTML('beforeend',`<button class="v2-btn" data-cloud-act="save-bank" data-bank-id="${esc(b.id)}">${online?'Update online':'Save online'}</button><button class="v2-btn ${published?'warn':''}" data-cloud-act="${published?'unpublish':'publish-bank'}" data-bank-id="${esc(b.id)}" ${published?`data-cloud-id="${esc(published.cloudId)}"`:''}>${published?'Unpublish':'Publish'}</button>`)});
}

function cloudWeightSummary(item){return Object.entries(item.themeWeights||{}).filter(([,value])=>value>0).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([name,value])=>`<span class="tag">${esc(name)} ${value}%</span>`).join('')}
function cloudMyBankCards(){if(!cloudState.user)return'<div class="cloud-empty"><b>Sign in to open your private online banks.</b><span>You can also browse question banks shared by other learners.</span><button class="v2-btn primary" data-cloud-act="account">Sign in</button></div>';if(!cloudState.myBanks.length)return'<div class="cloud-empty"><b>No private online banks yet</b><span>Use “Save online” on one of your editable banks.</span></div>';return cloudState.myBanks.map(item=>{const published=cloudState.publicBanks.some(x=>x.cloudId===item.cloudId&&x.ownerUid===cloudState.user.uid);return`<article class="cloud-bank-card"><div><span class="eyebrow">${published?'Published':'Private'}</span><h3>${esc(item.title)}</h3><p class="muted">${item.questionCount} questions · updated ${cloudDate(item.updatedAt)}</p><div class="cloud-weight-tags">${cloudWeightSummary(item)}</div></div><div class="button-row"><button class="v2-btn primary" data-cloud-act="use-cloud-bank" data-source="mine" data-cloud-id="${esc(item.cloudId)}">Add a copy</button>${published?`<button class="v2-btn warn" data-cloud-act="unpublish" data-cloud-id="${esc(item.cloudId)}">Unpublish</button>`:''}</div></article>`}).join('')}

function cloudFilteredPublicBanks(){
  const theme=document.getElementById('communityTheme')?.value||'',author=document.getElementById('communityAuthor')?.value||'',sort=document.getElementById('communitySort')?.value||'newest';let rows=cloudState.publicBanks.filter(x=>(!theme||(x.themeWeights?.[theme]||0)>0)&&(!author||x.authorHandle===author));
  rows=[...rows].sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='questions'?(b.questionCount||0)-(a.questionCount||0):sort==='weight'&&theme?(b.themeWeights?.[theme]||0)-(a.themeWeights?.[theme]||0):cloudTimestampMillis(b.publishedAt)-cloudTimestampMillis(a.publishedAt));return rows
}
function cloudCommunityCards(){const rows=cloudFilteredPublicBanks();const target=document.getElementById('communityBankList');if(!target)return;target.innerHTML=rows.length?rows.map(item=>`<article class="cloud-bank-card public"><div><span class="eyebrow">${esc(item.primaryTheme||'Mixed bank')}</span><h3>${esc(item.title)}</h3><p class="muted">By <b>${esc(item.authorName||item.authorHandle)}</b> · ${item.questionCount} questions · published ${cloudDate(item.publishedAt)}</p><div class="cloud-weight-tags">${cloudWeightSummary(item)}</div></div><button class="v2-btn primary" data-cloud-act="use-cloud-bank" data-source="public" data-cloud-id="${esc(item.cloudId)}">Add to my workspace</button></article>`).join(''):'<div class="cloud-empty"><b>No matching published banks</b><span>Try another category or author.</span></div>'}

function cloudRenderBankHub(){
  const host=document.querySelector('#view>.result-card');if(!host)return;const authors=[...new Map(cloudState.publicBanks.map(x=>[x.authorHandle,x.authorName||x.authorHandle])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  host.insertAdjacentHTML('beforeend',`<section class="cloud-bank-hub"><div class="cloud-hub-head"><div><span class="eyebrow">Online workspace</span><h2>My online banks</h2><p class="muted">Private to ${cloudState.profile?esc(cloudState.profile.displayName):'your account'} until you choose Publish.</p></div><button class="v2-btn" data-cloud-act="refresh-library" ${cloudState.ready?'':'disabled'}>Refresh</button></div><div class="cloud-bank-list">${cloudState.configured?cloudMyBankCards():'<div class="cloud-empty"><b>Online accounts are awaiting connection.</b><span>Sign-in and shared banks will appear once the workspace connection is restored.</span></div>'}</div><div class="cloud-hub-head community-heading"><div><span class="eyebrow">Shared by learners</span><h2>Community Library</h2><p class="muted">Published banks are educational resources supplied by their authors. Review clinical content before relying on it.</p></div></div><div class="community-filters"><label><span>Category weighting</span><select id="communityTheme"><option value="">All categories</option>${STANDARD_TAXONOMY.themes.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><label><span>Author</span><select id="communityAuthor"><option value="">All authors</option>${authors.map(([handle,name])=>`<option value="${esc(handle)}">${esc(name)}</option>`).join('')}</select></label><label><span>Sort</span><select id="communitySort"><option value="newest">Newest</option><option value="title">Title A–Z</option><option value="questions">Most questions</option><option value="weight">Highest selected weighting</option></select></label></div><div class="cloud-bank-list" id="communityBankList"></div></section>`);cloudCommunityCards()
}

const cloudBaseRenderBanks=renderBanks;
renderBanks=function(){cloudBaseRenderBanks();cloudLocalButtons();cloudRenderBankHub()};
const cloudBaseShell=shell;
shell=function(){cloudBaseShell();cloudUpdateAccountButton();setTimeout(cloudInitialise,0)};

document.addEventListener('change',event=>{if(event.target.matches('#communityTheme,#communityAuthor,#communitySort'))cloudCommunityCards()},true);
document.addEventListener('click',async event=>{
  const action=event.target.closest('[data-cloud-act]');if(!action)return;event.preventDefault();event.stopPropagation();const type=action.dataset.cloudAct;
  try{
    if(type==='account')cloudAccountModal();
    else if(type==='create-account')await cloudAuthenticate(true,action);
    else if(type==='sign-in')await cloudAuthenticate(false,action);
    else if(type==='change-pin')cloudChangePinModal();
    else if(type==='save-new-pin')await cloudChangePin(action);
    else if(type==='sign-out'){await cloudState.api.signOut(cloudState.auth);closeModal();toast('Signed out')}
    else if(type==='save-bank'){cloudSetBusy(action,true);await cloudSavePrivateBank(action.dataset.bankId);cloudSetBusy(action,false)}
    else if(type==='publish-bank'){cloudSetBusy(action,true,'Publishing…');await cloudPublishBank(action.dataset.bankId);cloudSetBusy(action,false)}
    else if(type==='unpublish')await cloudUnpublish(action.dataset.cloudId);
    else if(type==='use-cloud-bank')cloudAddToWorkspace(action.dataset.cloudId,action.dataset.source);
    else if(type==='refresh-library'){cloudSetBusy(action,true);await cloudRefreshData();cloudSetBusy(action,false)}
  }catch(error){cloudSetBusy(action,false);toast(cloudErrorMessage(error))}
},true);
