// Cursor-origin ripple adapted for this vanilla site from Animata's Ripple Button.
// https://animata.design/docs/button/ripple-button
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');

function hasGradient(button){
 return getComputedStyle(button).backgroundImage.includes('gradient');
}

export function createGradientRipple(button,x,y){
 if(reducedMotion.matches||button.disabled||!hasGradient(button))return;
 const rect=button.getBoundingClientRect(),size=Math.hypot(rect.width,rect.height)*2;
 const ink=document.createElement('span');
 ink.className='button-ripple';ink.setAttribute('aria-hidden','true');
 ink.style.setProperty('--ripple-size',size+'px');
 ink.style.setProperty('--ripple-x',(x-rect.left-size/2)+'px');
 ink.style.setProperty('--ripple-y',(y-rect.top-size/2)+'px');
 button.append(ink);ink.addEventListener('animationend',()=>ink.remove(),{once:true});
}

export function bindGradientRipples(){
 document.addEventListener('pointerdown',event=>{
  const button=event.target.closest('button');if(button)createGradientRipple(button,event.clientX,event.clientY);
 });
 document.addEventListener('keydown',event=>{
  if(!['Enter',' '].includes(event.key))return;
  const button=event.target.closest('button');if(!button)return;
  const rect=button.getBoundingClientRect();createGradientRipple(button,rect.left+rect.width/2,rect.top+rect.height/2);
 });
}
