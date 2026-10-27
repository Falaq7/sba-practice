// One minute per colour: 30 seconds still, then a 30-second eased blend.
export const SLOT_MS=60000,FADE_MS=30000;
export function cycleFrame(colours,elapsed,startId){
 const start=Math.max(0,colours.findIndex(c=>c.id===startId));
 const slot=Math.floor(Math.max(0,elapsed)/SLOT_MS),within=Math.max(0,elapsed)%SLOT_MS;
 const from=colours[(start+slot)%colours.length],to=colours[(start+slot+1)%colours.length];
 const t=Math.max(0,(within-(SLOT_MS-FADE_MS))/FADE_MS),ease=t*t*(3-2*t);
 const blend=(a,b)=>a+(((b-a+540)%360)-180)*ease;
 return {h:blend(from.h,to.h),h2:blend(from.h2,to.h2)};
}

// Bound animation progress after a busy main thread; never catch up in one jump.
export const cycleStep=delta=>Math.max(0,Math.min(100,delta));
export function hslToHex(h,s,l){
 h=((h%360)+360)%360;s/=100;l/=100;
 const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0')};
 return '#'+f(0)+f(8)+f(4);
}
