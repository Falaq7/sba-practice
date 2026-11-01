import {hslToHex as hex} from './colour-cycle.mjs';
// Keep one renderer and its last painted frame for the page's lifetime.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let shader,canvas,loading=false,failed=false,generation=0,syncFrame=0,resizeFrame=0,resizeObserver,lastSize='',lastProps=null,running=false;
function resizeSurface(){
 resizeFrame=0;if(!canvas||!shader||failed)return;
 const rect=canvas.getBoundingClientRect(),width=Math.round(rect.width),height=Math.round(rect.height),key=width+'x'+height;
 if(width<=0||height<=0||key===lastSize)return;
 try{shader.resize(width,height);lastSize=key;}catch{fallback();}
}
function scheduleResize(){if(!resizeFrame)resizeFrame=requestAnimationFrame(resizeSurface);}
window.addEventListener('resize',scheduleResize,{passive:true});
window.visualViewport?.addEventListener('resize',scheduleResize,{passive:true});
function eligible(){return !document.hidden&&!reduced.matches&&document.body.dataset.theme==='prism';}
function colors(){const style=getComputedStyle(document.body),rawH=parseFloat(style.getPropertyValue('--prism-h')),rawJ=parseFloat(style.getPropertyValue('--prism-h2')),h=Number.isFinite(rawH)?rawH:235,j=Number.isFinite(rawJ)?rawJ:310,light=document.body.dataset.mode==='light';return {colorA:hex(h,16,light?94:8),colorB:hex(h,70,light?84:28),colorC:hex(j,66,light?86:21),colorD:hex(h+35,50,light?92:12)};}
function pause(){if(running){shader?.pause();running=false;}}
function fallback(){failed=true;document.body.dataset.shader='off';pause();}
function scheduleSync(){if(!syncFrame)syncFrame=requestAnimationFrame(()=>{syncFrame=0;sync();});}
async function sync(){
 if(failed)return;
 if(!eligible()){
  pause();
  // Backgrounding a tab must not swap the last GPU frame for a different pattern.
  if(reduced.matches||document.body.dataset.theme!=='prism')document.body.dataset.shader='off';
  return;
 }
 if(!shader){
  if(loading||!navigator.gpu)return;
  loading=true;const token=generation;
  try{
   const {createShader}=await import('./shaders-4.0.4.js');if(token!==generation)return;
   canvas=document.createElement('canvas');canvas.id='shader-surface';canvas.style.width='100%';canvas.style.height=CSS.supports('height','100lvh')?'100lvh':'100vh';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
   const initial=colors();
   const next=await createShader(canvas,{components:[{type:'FlowingGradient',id:'ambient',props:{...initial,speed:.14,distortion:.22,seed:7}}]},{disableTelemetry:true,onError:fallback});
   if(token!==generation){next.destroy();canvas?.remove();return;}
   shader=next;lastProps=initial;
   if(shader.getFailureReason()){fallback();return;}
   resizeObserver=new ResizeObserver(scheduleResize);resizeObserver.observe(canvas);resizeSurface();
  }catch{fallback();return;}finally{loading=false;}
 }
 if(!eligible()){shader.pause();running=false;return;}
 try{
  const props=colors(),changed=Object.fromEntries(Object.entries(props).filter(([key,value])=>lastProps?.[key]!==value));
  // Update only changed colour uniforms; seed, speed and the renderer clock stay put.
  if(Object.keys(changed).length){shader.update('ambient',changed);lastProps=props;}
  if(!running){shader.resume();running=true;}
  if(document.body.dataset.shader!=='on')document.body.dataset.shader='on';
 }catch{fallback();}
}
new MutationObserver(scheduleSync).observe(document.body,{attributes:true,attributeFilter:['data-theme','data-mode']});
document.addEventListener('bm4-palette',scheduleSync);
reduced.addEventListener('change',scheduleSync);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else scheduleSync();});
window.addEventListener('pagehide',event=>{
 pause();if(event.persisted)return;
 generation++;cancelAnimationFrame(syncFrame);syncFrame=0;cancelAnimationFrame(resizeFrame);resizeFrame=0;resizeObserver?.disconnect();lastSize='';lastProps=null;shader?.destroy();shader=null;canvas?.remove();
});
window.addEventListener('pageshow',scheduleSync);
// Wait until the first page has painted before downloading the optional effect.
setTimeout(scheduleSync,700);
