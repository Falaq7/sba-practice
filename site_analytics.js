/* Privacy-conscious Firebase Analytics for aggregate SBA Workspace usage. */
const ANALYTICS_CONSENT_KEY='SBA_ANALYTICS_CONSENT_V1';
const analyticsState={loading:false,ready:false,instance:null,api:null,queue:[],lastScreen:''};

function analyticsConsent(){try{return localStorage.getItem(ANALYTICS_CONSENT_KEY)==='denied'?'denied':'granted'}catch{return'granted'}}
function analyticsProductionHost(){return location.protocol==='https:'&&!/^(localhost|127\.|0\.0\.0\.0)/i.test(location.hostname)}
function analyticsParams(params={}){const clean={};for(const[key,value]of Object.entries(params)){if(['string','number','boolean'].includes(typeof value))clean[key]=typeof value==='string'?value.slice(0,80):value}return clean}
function analyticsTrack(name,params={}){
  if(analyticsConsent()!=='granted'||!analyticsProductionHost())return;
  const event={name,params:analyticsParams(params)};
  if(analyticsState.ready){try{analyticsState.api.logEvent(analyticsState.instance,event.name,event.params)}catch{}}
  else if(analyticsState.queue.length<30)analyticsState.queue.push(event)
}
function analyticsFlush(){if(!analyticsState.ready)return;for(const event of analyticsState.queue.splice(0))analyticsTrack(event.name,event.params)}
function analyticsScreenName(){return({home:'home',exam:'question_session',results:'session_review',history:'attempt_history',progress:'progress_dashboard',banks:'question_banks'})[view]||'workspace'}
function analyticsTrackScreen(force=false){const screen=analyticsScreenName();if(!force&&screen===analyticsState.lastScreen)return;analyticsState.lastScreen=screen;analyticsTrack('screen_view',{firebase_screen:screen,firebase_screen_class:'sba_workspace'})}

async function analyticsInitialise(){
  if(analyticsState.ready||analyticsState.loading||analyticsConsent()!=='granted'||!analyticsProductionHost()||!cloudState.ready||!cloudConfig()?.measurementId)return;
  analyticsState.loading=true;
  try{
    const api=await import(`https://www.gstatic.com/firebasejs/${CLOUD_SDK_VERSION}/firebase-analytics.js`);
    if(!(await api.isSupported()))return;
    analyticsState.api=api;analyticsState.instance=api.getAnalytics();api.setAnalyticsCollectionEnabled(analyticsState.instance,true);analyticsState.ready=true;analyticsTrackScreen(true);analyticsFlush()
  }catch(error){console.warn('Usage analytics unavailable:',error)}finally{analyticsState.loading=false}
}

function analyticsSetConsent(value){
  try{localStorage.setItem(ANALYTICS_CONSENT_KEY,value)}catch{}
  if(value==='granted')analyticsInitialise();
  else if(analyticsState.ready)analyticsState.api.setAnalyticsCollectionEnabled(analyticsState.instance,false)
}

const analyticsBaseCloudInitialise=cloudInitialise;
cloudInitialise=async function(){await analyticsBaseCloudInitialise();await analyticsInitialise()};
const analyticsBaseRender=render;
render=function(){const value=analyticsBaseRender();requestAnimationFrame(()=>analyticsTrackScreen());return value};
const analyticsBaseStartSession=startSession;
startSession=function(qs,opt){const value=analyticsBaseStartSession(qs,opt);analyticsTrack('session_started',{session_mode:opt.mode||'custom',question_count:qs.length,timed:!!opt.timed,feedback_mode:opt.feedbackMode==='end'?'end':'instant'});return value};
const analyticsBaseComplete=complete;
complete=function(){const active=db.current,attemptId=active?.id;analyticsBaseComplete();if(active&&viewAttempt?.id===attemptId&&db.current===null){const summary=metrics(viewAttempt),scoreBand=summary.score>=80?'80_100':summary.score>=60?'60_79':summary.score>=40?'40_59':'0_39';analyticsTrack('session_completed',{session_mode:viewAttempt.mode||'unknown',question_count:summary.n,answered_count:summary.n-summary.unanswered,score_band:scoreBand,timed:!!viewAttempt.timed})}};
const analyticsBaseOpenDeepReview=openDeepReview;
openDeepReview=function(index,attempt=viewAttempt){const value=analyticsBaseOpenDeepReview(index,attempt);if(activeDeepReview)analyticsTrack('deep_review_opened',{review_context:view==='exam'?'instant_answer':'completed_review'});return value};
let analyticsImportMethod='file';
const analyticsBaseImportBankFile=importBankFile;
importBankFile=function(file){if(file)analyticsImportMethod='file';return analyticsBaseImportBankFile(file)};
const analyticsBasePreviewPastedBank=previewPastedBank;
previewPastedBank=function(){analyticsImportMethod='paste';return analyticsBasePreviewPastedBank()};
const analyticsBaseCloudAddToWorkspace=cloudAddToWorkspace;
cloudAddToWorkspace=function(cloudId,source){const record=(source==='mine'?cloudState.myBanks:cloudState.publicBanks).find(x=>x.cloudId===cloudId),before=db.banks.length,value=analyticsBaseCloudAddToWorkspace(cloudId,source);if(record&&db.banks.length>before)analyticsTrack('community_bank_added',{source:source==='public'?'community':'private_online',question_count:Number(record.questionCount)||0});return value};

const analyticsBaseSettingsModal=settingsModal;
settingsModal=function(){
  analyticsBaseSettingsModal();
  const form=document.querySelector('#modal .form-grid');if(!form)return;
  form.insertAdjacentHTML('beforeend',`<div class="field field-wide analytics-setting"><span>Privacy</span><label class="toggle-setting"><span><b>Basic usage analytics</b><small>Counts visits and broad feature use. Custom events exclude names, PINs, question content, answers and bank titles.</small></span><input id="setAnalytics" type="checkbox" role="switch" ${analyticsConsent()==='granted'?'checked':''} aria-label="Share basic usage analytics"></label></div>`)
};

document.addEventListener('click',event=>{
  const studioAction=event.target.closest('[data-studio-act]');
  if(studioAction?.dataset.studioAct==='confirm-bank-import')analyticsTrack('question_bank_imported',{import_method:analyticsImportMethod});
  else if(studioAction?.dataset.studioAct==='copy-ai-population-prompt')analyticsTrack('ai_prompt_copied',{prompt_type:'json_population'});
},true);
document.addEventListener('change',event=>{if(event.target.id==='setAnalytics'){analyticsSetConsent(event.target.checked?'granted':'denied');toast(event.target.checked?'Usage analytics enabled':'Usage analytics disabled')}},true);

