const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=()=>matchMedia('(max-width:700px)').matches;
function keyframes(opening){
 const axis=mobile()?'translateY':'translateX',outside=`${axis}(100%)`,inside=`${axis}(0)`,settle=`${axis}(-1.2%)`;
 return opening?[{opacity:0,transform:outside},{opacity:1,transform:settle,offset:.82},{opacity:1,transform:inside}]:[{opacity:1,transform:inside},{opacity:0,transform:outside}];
}
export function animateDrawerIn(panel){panel.getAnimations().forEach(animation=>animation.cancel());if(reducedMotion.matches)return Promise.resolve();return panel.animate(keyframes(true),{duration:440,easing:'cubic-bezier(.22,.8,.2,1)'}).finished.catch(()=>{});}
export function animateDrawerOut(panel){panel.getAnimations().forEach(animation=>animation.cancel());if(reducedMotion.matches)return Promise.resolve();return panel.animate(keyframes(false),{duration:260,easing:'cubic-bezier(.4,0,1,1)'}).finished.catch(()=>{});}
