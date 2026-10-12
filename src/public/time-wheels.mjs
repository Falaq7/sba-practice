// Scrollable, draggable time wheels; the centre row is the actual form value.
export function bindTimeWheels(form,onChange){
 const sync=[];for(const wheel of form.querySelectorAll('[data-time-wheel]')){
  const input=form.elements[wheel.dataset.timeWheel],rows=[...wheel.querySelectorAll('[data-wheel-value]')],values=rows.map(r=>Number(r.dataset.wheelValue));let drag=null,frame;
  const height=()=>rows[0].getBoundingClientRect().height;
  const update=()=>{const index=Math.max(0,Math.min(rows.length-1,Math.round(wheel.scrollTop/height()))),value=values[index];rows.forEach((r,i)=>r.classList.toggle('selected',i===index));wheel.setAttribute('aria-valuenow',value);wheel.setAttribute('aria-valuetext',String(value));if(input.value!==String(value)){input.value=String(value);onChange();}};
  const move=index=>{wheel.scrollTo({top:Math.max(0,Math.min(rows.length-1,index))*height(),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  wheel.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);});
  wheel.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,y:e.clientY,top:wheel.scrollTop,moved:false};wheel.setPointerCapture(e.pointerId);wheel.classList.add('dragging');});
  wheel.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const delta=drag.y-e.clientY;if(Math.abs(delta)>3)drag.moved=true;wheel.scrollTop=drag.top+delta;update();});
  const finish=e=>{if(!drag)return;const old=drag;drag=null;wheel.classList.remove('dragging');if(wheel.hasPointerCapture(old.id))wheel.releasePointerCapture(old.id);if(old.moved||e.type==='pointercancel')move(Math.round(wheel.scrollTop/height()));else {const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-wheel-value]');if(target&&wheel.contains(target))move(rows.indexOf(target));}};
  wheel.addEventListener('pointerup',finish);wheel.addEventListener('pointercancel',finish);
  wheel.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(e.key))return;e.preventDefault();const at=values.indexOf(Number(input.value));move(e.key==='Home'?0:e.key==='End'?rows.length-1:at+({ArrowDown:1,ArrowUp:-1,PageDown:3,PageUp:-3}[e.key]));});
  sync.push(()=>{const index=Math.max(0,values.indexOf(Number(input.value)));wheel.scrollTop=index*height();rows.forEach((r,i)=>r.classList.toggle('selected',i===index));wheel.setAttribute('aria-valuenow',values[index]);wheel.setAttribute('aria-valuetext',String(values[index]));});
 }return ()=>sync.forEach(fn=>fn());
}
