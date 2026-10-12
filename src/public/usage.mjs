import {modal} from './shared/ui.mjs';
const KEY='BM4_USAGE_CONSENT_V1';
const EVENTS={sba_section_view:['section'],sba_practice_start:['question_count','practice_mode'],sba_practice_complete:['question_count','answered_count'],sba_answer_submitted:[],sba_bank_practised:['bank_id'],sba_study_report:[]};
export function safeEvent(name,params={}){
 if(!Object.hasOwn(EVENTS,name))return null;
 const out={};for(const key of EVENTS[name]){const value=params[key];if(key.endsWith('_count')){if(Number.isInteger(value)&&value>=0&&value<=10000)out[key]=value;}else if(key==='bank_id'){if(typeof value==='string'&&/^[\w-]{1,80}$/.test(value))out[key]=value;}else if(key==='practice_mode'){if(['learn','assessment'].includes(value))out[key]=value;}else if(['home','library','progress','saved','session','review'].includes(value))out[key]=value;}
 return {name,params:out};
}
export class UsageAnalytics{
 constructor(){this.measurement=globalThis.SBA_FIREBASE_CONFIG?.measurementId;this.local=['localhost','127.0.0.1'].includes(location.hostname)||location.protocol!=='https:';this.loaded=false;this.view='home';this.previous=null;}
 choice(){try{return localStorage.getItem(KEY);}catch{return 'denied';}}
 blocked(){return navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';}
 allowed(){return !this.local&&!this.blocked()&&this.choice()==='granted'&&/^G-[A-Z0-9]+$/.test(this.measurement||'');}
 init(){if(this.allowed())this.enable();else if(!this.local&&!this.blocked()&&!this.choice())this.offer();}
 enable(){if(!this.allowed()||this.loaded)return;this.loaded=true;
  globalThis.dataLayer=globalThis.dataLayer||[];this.gtag=function(){globalThis.dataLayer.push(arguments);};
  this.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  this.gtag('js',new Date());this.gtag('config',this.measurement,{send_page_view:true,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:location.origin+location.pathname,page_referrer:'',cookie_expires:7776000});
  const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(this.measurement);document.head.append(script);this.page(this.view,true);
 }
 track(name,params={}){const event=safeEvent(name,params);if(!event||!this.allowed()||!this.loaded)return;this.gtag('event',event.name,{...event.params,send_to:this.measurement,page_location:location.origin+location.pathname,page_referrer:'',page_title:this.view});}
 page(view,force=false){this.view=['home','library','progress','saved','session','review'].includes(view)?view:'home';if(!force&&this.previous===this.view)return;this.previous=this.view;this.track('sba_section_view',{section:this.view});}
 set(choice){try{localStorage.setItem(KEY,choice);}catch{}document.querySelector('#usage-choice')?.remove();if(choice==='granted'){globalThis['ga-disable-'+this.measurement]=false;if(this.loaded){this.gtag('consent','update',{analytics_storage:'granted'});this.page(this.view,true);}this.enable();}else{globalThis['ga-disable-'+this.measurement]=true;if(this.loaded)this.gtag('consent','update',{analytics_storage:'denied'});this.clearCookies();}}
 clearCookies(){for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(!/^_ga(?:_|$)|^_gid$|^_gat/.test(name))continue;const parts=location.hostname.split('.');document.cookie=name+'=; Max-Age=0; path=/';for(let i=0;i<parts.length-1;i++)document.cookie=name+'=; Max-Age=0; path=/; domain=.'+parts.slice(i).join('.');}}
 offer(){const box=document.createElement('section');box.id='usage-choice';box.className='usage-choice';box.setAttribute('aria-label','Optional usage analytics');box.innerHTML='<p>Allow optional Google Analytics cookies to measure visits and practice activity?</p><div class="row"><button id="usage-allow">Allow analytics</button><button id="usage-decline">No thanks</button></div>';document.querySelector('footer').before(box);box.querySelector('#usage-allow').onclick=()=>this.set('granted');box.querySelector('#usage-decline').onclick=()=>this.set('denied');}
 settings(){const d=modal('Usage analytics',`<p>Optional Google Analytics cookies measure visits and practice activity.</p><p>${this.local?'Local preview: no usage data is sent.':this.blocked()?'Your browser privacy preference blocks analytics.':this.choice()==='granted'?'Analytics allowed.':'Analytics is off.'}</p><div class="row"><button id="usage-on" ${this.blocked()?'disabled':''}>Allow analytics</button><button id="usage-off">Keep analytics off</button></div>`);d.querySelector('#usage-on').onclick=()=>{this.set('granted');d.close();};d.querySelector('#usage-off').onclick=()=>{this.set('denied');d.close();};}
}
