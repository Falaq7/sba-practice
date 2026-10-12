const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
export function bindYearAccordions(root=document){
 for(const details of root.querySelectorAll('.year-group')){
  if(details.dataset.motionBound)continue;details.dataset.motionBound='true';
  const summary=details.querySelector(':scope>summary'),content=details.querySelector(':scope>.year-banks');if(!summary||!content)continue;
  const chevron=summary.querySelector('.year-chevron');if(chevron)chevron.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  summary.setAttribute('aria-expanded',String(details.open));let animation,wanted=details.open;
  summary.addEventListener('click',event=>{
   event.preventDefault();const height=details.open?content.getBoundingClientRect().height:0;animation?.cancel();wanted=!wanted;summary.setAttribute('aria-expanded',String(wanted));content.inert=!wanted;
   if(reducedMotion.matches){details.open=wanted;return;}
   details.open=true;content.style.overflow='hidden';
   animation=content.animate([{height:height+'px',opacity:height?1:0},{height:(wanted?content.scrollHeight:0)+'px',opacity:wanted?1:0}],{duration:300,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
   animation.onfinish=()=>{details.open=wanted;animation.cancel();content.style.overflow='';};
  });
 }
}
