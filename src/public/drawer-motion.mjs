const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=()=>matchMedia('(max-width:700px)').matches;
function keyframes(opening,panel){
 if(getComputedStyle(panel).position==='static')return opening?[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(4px)'}];
 const axis=mobile()?'translateY':'translateX',outside=`${axis}(100%)`,inside=`${axis}(0)`;
 return opening?[{opacity:0,transform:outside},{opacity:1,transform:inside}]:[{opacity:1,transform:inside},{opacity:0,transform:outside}];
}
export function animateDrawerIn(panel){panel.getAnimations().forEach(animation=>animation.cancel());if(reducedMotion.matches)return Promise.resolve();return panel.animate(keyframes(true,panel),{duration:280,easing:'cubic-bezier(.23,1,.32,1)'}).finished.catch(()=>{});}
export function animateDrawerOut(panel){panel.getAnimations().forEach(animation=>animation.cancel());if(reducedMotion.matches)return Promise.resolve();return panel.animate(keyframes(false,panel),{duration:180,easing:'cubic-bezier(.4,0,1,1)'}).finished.catch(()=>{});}
