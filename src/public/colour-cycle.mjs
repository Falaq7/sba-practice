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
