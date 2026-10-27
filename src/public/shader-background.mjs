// One lazily loaded decorative canvas. The CSS background remains the fallback.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let shader,canvas,loading=false,failed=false,timer,last='',generation=0,resizeFrame=0,resizeObserver,lastSize='';
function resizeSurface(){
 resizeFrame=0;if(!canvas||!shader||failed)return;
 const {width,height}=canvas.getBoundingClientRect(),key=width+'x'+height;
 if(width<=0||height<=0||key===lastSize)return;
 try{shader.resize(width,height);lastSize=key;}catch{fallback();}
}
function scheduleResize(){if(!resizeFrame)resizeFrame=requestAnimationFrame(resizeSurface);}
window.addEventListener('resize',scheduleResize,{passive:true});
window.visualViewport?.addEventListener('resize',scheduleResize,{passive:true});
function eligible(){return !document.hidden&&!reduced.matches&&document.body.dataset.theme==='prism';}
function hex(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0')};return '#'+f(0)+f(8)+f(4)}
function colors(){const style=getComputedStyle(document.body),h=parseFloat(style.getPropertyValue('--prism-h'))||235,j=parseFloat(style.getPropertyValue('--prism-h2'))||310,light=document.body.dataset.mode==='light';return {colorA:hex(h,16,light?94:8),colorB:hex(h,70,light?84:28),colorC:hex(j,66,light?86:21),colorD:hex(h+35,50,light?92:12),speed:.14,distortion:.22,seed:7};}
function fallback(){failed=true;document.body.dataset.shader='off';shader?.pause();clearInterval(timer);}
async function sync(){
 if(failed)return;
 if(!eligible()){document.body.dataset.shader='off';shader?.pause();clearInterval(timer);timer=null;return;}
 if(!shader){
  if(loading||!navigator.gpu)return;
  loading=true;const token=generation;
  try{const {createShader}=await import('./shaders-4.0.4.js');if(token!==generation)return;
   canvas=document.createElement('canvas');canvas.id='shader-surface';canvas.style.width='100%';canvas.style.height=CSS.supports('height','100lvh')?'100lvh':'100vh';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
   const next=await createShader(canvas,{components:[{type:'FlowingGradient',id:'ambient',props:colors()}]},{disableTelemetry:true,onError:fallback});
   if(token!==generation){next.destroy();canvas?.remove();return;}shader=next;
   if(shader.getFailureReason()){fallback();return;}
   resizeObserver=new ResizeObserver(scheduleResize);resizeObserver.observe(canvas);resizeSurface();
  }catch{fallback();return;}finally{loading=false;}
 }
 if(!eligible()){shader.pause();return;}
 const props=colors(),key=JSON.stringify(props);if(last!==key){shader.update('ambient',props);last=key;}
 shader.resume();document.body.dataset.shader='on';if(!timer)timer=setInterval(sync,500);
}
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-theme','data-mode']});
reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
window.addEventListener('pagehide',()=>{generation++;cancelAnimationFrame(resizeFrame);resizeFrame=0;resizeObserver?.disconnect();lastSize='';clearInterval(timer);timer=null;shader?.destroy();shader=null;canvas?.remove();document.body.dataset.shader='off';});
window.addEventListener('pageshow',sync);
// Wait until the first page has painted before downloading the optional effect.
setTimeout(sync,700);
