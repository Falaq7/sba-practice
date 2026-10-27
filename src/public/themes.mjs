import {modal,action} from './shared/ui.mjs';
import {cycleFrame} from './colour-cycle.mjs';
export const DEFAULT_THEME='prism';
export const THEMES=[
 {id:'prism',name:'Prism',description:'Floating navigation, translucent panels and ambient light.',source:'https://linear.app/now/linear-liquid-glass',reference:'Linear'},
 {id:'folio',name:'Folio',description:'Serif headlines, ruled sections and an editorial layout.',source:'https://press.stripe.com/',reference:'Stripe Press'},
 {id:'pop',name:'Studio Pop',description:'Heavy outlines, offset shadows and geometric panels.',source:'https://gumroad.com/',reference:'Gumroad'},
 {id:'desktop',name:'Desktop 98',description:'Bevelled controls, window frames and a patterned desktop.',source:'https://poolsuite.net/',reference:'Poolsuite'},
 {id:'terminal',name:'Terminal',description:'Monospaced type, segmented panels and crisp status colours.'},
 {id:'blueprint',name:'Blueprint',description:'Drafting grids, technical labels and industrial controls.'},
 {id:'atelier',name:'Atelier',description:'Sculpted corners, botanical tones and expressive serif type.'},
 {id:'arcade',name:'Arcade',description:'A handheld-console frame, inset screens and tactile buttons.'},
 {id:'gallery',name:'Gallery',description:'Oversized Swiss typography, open space and sharp modular tiles.'},
 {id:'dark',name:'Original',description:'The compact, familiar teal interface.'}
];
export const COLOURWAYS=[
 {id:'violet',name:'Violet',description:'Lavender · indigo',h:250,h2:290},
 {id:'glacier',name:'Glacier',description:'Ice blue · cyan',h:205,h2:180},
 {id:'jade',name:'Jade',description:'Mint · deep green',h:160,h2:190},
 {id:'ember',name:'Ember',description:'Amber · coral',h:25,h2:350},
 {id:'rose',name:'Rose',description:'Blush · mauve',h:330,h2:270},
 {id:'cyber-ice',name:'Cyber Ice',description:'Chrome · electric cyan',h:210,h2:185,finish:'y2k'},
 {id:'bubblegum',name:'Bubblegum',description:'Hot pink · lilac',h:320,h2:265,finish:'y2k'},
 {id:'alien-lime',name:'Alien Lime',description:'Acid green · silver',h:85,h2:155,finish:'y2k'},
 {id:'digital-dream',name:'Digital Dream',description:'Cobalt · neon pink',h:235,h2:310,finish:'y2k'},
 {id:'peach-soda',name:'Peach Soda',description:'Peach · aqua',h:25,h2:175,finish:'y2k'}

];
const device=matchMedia('(prefers-color-scheme: dark)');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const cyclingColours=COLOURWAYS.filter(c=>c.finish==='y2k');
let active={},cycleKey='',elapsed=0,lastTick=0,timer=null;
function paintColour(){
 const cycling=active.theme==='prism'&&active.colourCycle;
 const colour=COLOURWAYS.find(c=>c.id===active.colourway)||COLOURWAYS.find(c=>c.id==='digital-dream');
 const frame=cycling?cycleFrame(cyclingColours,elapsed,'digital-dream'):colour;
 document.body.style.setProperty('--prism-h',frame.h.toFixed(3));document.body.style.setProperty('--prism-h2',frame.h2.toFixed(3));
}
function runCycle(){
 const shouldRun=active.theme==='prism'&&active.colourCycle&&!reducedMotion.matches&&!document.hidden;
 document.body.dataset.cycleState=active.theme!=='prism'||!active.colourCycle?'off':shouldRun?'running':'paused';
 if(!shouldRun&&timer){clearInterval(timer);timer=null;}
 if(shouldRun&&!timer){lastTick=performance.now();
  timer=setInterval(()=>{const now=performance.now();elapsed+=now-lastTick;lastTick=now;paintColour();},250);
 }
 const status=document.querySelector('#cycle-description');if(status)status.textContent=reducedMotion.matches?'Paused while your device requests reduced motion.':'30 seconds per colour, then a 30-second transition.';
}
document.addEventListener('visibilitychange',runCycle);
reducedMotion.addEventListener('change',runCycle);
export function applyTheme(value){
 const pref=typeof value==='string'?{theme:value}:value||{};
 const id=pref.theme==='light'?'dark':pref.theme;
 const theme=THEMES.find(x=>x.id===id)||THEMES[0];
 const mode=['light','dark'].includes(pref.appearance)?pref.appearance:'system';
 const colour=COLOURWAYS.find(x=>x.id===pref.colourway)||COLOURWAYS.find(c=>c.id==='digital-dream');
 active={theme:theme.id,appearance:mode,colourway:colour.id,colourCycle:pref.colourCycle!==false};
 const nextKey=theme.id+'|'+active.colourCycle+'|'+colour.id;
 if(nextKey!==cycleKey){cycleKey=nextKey;elapsed=0;}

 const body=document.body;
 Object.assign(body.dataset,{theme:theme.id,mode:mode==='system'?(device.matches?'dark':'light'):mode,appearance:mode,colourway:colour.id,finish:theme.id==='prism'&&active.colourCycle?'y2k':colour.finish||'soft',cycle:active.colourCycle?'on':'off'});
 paintColour();runCycle();
 // A tiny synchronous mirror prevents a light flash while account storage opens.
 try{localStorage.setItem('BM4_APPEARANCE_BOOT',JSON.stringify({...body.dataset,h:parseFloat(body.style.getPropertyValue('--prism-h')),h2:parseFloat(body.style.getPropertyValue('--prism-h2'))}));}catch{}
 document.documentElement.style.colorScheme=body.dataset.mode;
 document.documentElement.style.backgroundColor=body.dataset.mode==='dark'?'#101023':'#f4f2fa';
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',getComputedStyle(body).backgroundColor);
 document.querySelector('#appearance-status')?.replaceChildren(document.createTextNode(mode==='system'?`Following your device: ${body.dataset.mode}`:`Always ${mode}`));
 return theme.id;
}
device.addEventListener('change',()=>{if(active.appearance==='system')applyTheme(active);});
function mini(t){return `<span class="theme-mini mini-${t.id}" aria-hidden="true"><span class="mini-nav">BM4 <i></i><i></i></span><span class="mini-title">SBA practice</span><span class="mini-actions"><i>Start</i><i>Library</i></span><span class="mini-stats"><i>24</i><i>78%</i><i>6</i></span></span>`;}
function colourCard(c){return `<button data-colourway="${c.id}" class="colourway-choice ${c.finish||'soft'}" style="--prism-h:${c.h};--prism-h2:${c.h2}" aria-pressed="false"><span class="colourway-mini" aria-hidden="true"><span>SBA practice</span><i></i><b></b><b></b></span><strong>${c.name}</strong><small>${c.description}</small></button>`;}
export function themePicker(store,scope){
 applyTheme(store.get(scope,'preference','display'));
 const d=modal('Themes',`<div class="appearance-controls"><label>Appearance<select id="appearance-mode"><option value="system">Use device setting</option><option value="dark">Dark</option><option value="light">Light</option></select></label><small id="appearance-status"></small></div><details id="prism-colourways" class="colour-options"><summary>Colour options</summary><label class="cycle-control"><input type="checkbox" id="colour-cycle"> Animated colour cycle</label><div class="colourway-gallery">${COLOURWAYS.map(colourCard).join('')}</div></details><h3>Theme styles</h3><div class="theme-gallery">${THEMES.map(t=>`<button class="theme-choice" data-theme-choice="${t.id}" aria-pressed="false">${mini(t)}<span class="theme-description"><strong>${t.name}</strong><span>${t.description}</span><span class="theme-selected"></span></span></button>`).join('')}</div>`);
 d.classList.add('theme-dialog');d.addEventListener('close',()=>d.classList.remove('theme-dialog'),{once:true});
 function refresh(){
  d.querySelector('#appearance-mode').value=active.appearance;
  d.querySelector('#colour-cycle').checked=active.colourCycle;
  const options=d.querySelector('#prism-colourways');options.hidden=active.theme!=='prism';if(options.hidden)options.open=false;
  d.querySelectorAll('[data-theme-choice]').forEach(b=>{const selected=b.dataset.themeChoice===active.theme;b.setAttribute('aria-pressed',selected);b.querySelector('.theme-selected').textContent=selected?'Selected':'Select theme';});
  d.querySelectorAll('[data-colourway]').forEach(b=>b.setAttribute('aria-pressed',!active.colourCycle&&b.dataset.colourway===active.colourway));
  applyTheme(active);
 }
 async function update(patch){
  const preference={...store.get(scope,'preference','display'),...active,...patch,updatedAt:Date.now()};
  applyTheme(preference);refresh();await store.put(scope,'preference','display',preference);
 }
 d.querySelectorAll('[data-theme-choice]').forEach(b=>b.onclick=()=>action(b,()=>update({theme:b.dataset.themeChoice})));
 d.querySelectorAll('[data-colourway]').forEach(b=>b.onclick=()=>action(b,()=>update({colourway:b.dataset.colourway,colourCycle:false})));
 d.querySelector('#colour-cycle').onchange=e=>action(e.target,()=>update({colourCycle:e.target.checked}));
 d.querySelector('#appearance-mode').onchange=e=>action(e.target,()=>update({appearance:e.target.value}));
 refresh();
}
