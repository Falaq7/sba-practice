import test from 'node:test';
import assert from 'node:assert/strict';
import {cycleFrame,cycleStep,hslToHex} from '../src/public/colour-cycle.mjs';
const colours=[{id:'ice',h:210,h2:185},{id:'pink',h:320,h2:265},{id:'lime',h:85,h2:155},{id:'dream',h:235,h2:310},{id:'peach',h:25,h2:175}];
test('cycle holds 30 seconds and reaches each next palette after one minute',()=>{assert.deepEqual(cycleFrame(colours,30000,'ice'),{h:210,h2:185});assert.equal(cycleFrame(colours,45000,'ice').h,265);for(let i=0;i<6;i++)assert.deepEqual(cycleFrame(colours,i*60000,'ice'),{h:colours[i%5].h,h2:colours[i%5].h2});});
test('hue blending follows the short route through the circular colour wheel',()=>{assert.equal(cycleFrame(colours,45000,'pink').h,382.5);assert.equal(cycleFrame(colours,0,'unknown').h,210);});

test('negative and wrapped hues render the same colour without conversion artefacts',()=>{
 for(const hue of [-175,-30,0,25,210,385]){
  assert.equal(hslToHex(hue,70,28),hslToHex(hue+720,70,28));
  assert.match(hslToHex(hue,70,28),/^#[0-9a-f]{6}$/);
 }
 assert.equal(hslToHex(-120,100,50),'#0000ff');
});

test('colour blending remains visually continuous across every palette and hue boundary',()=>{
 let previous=cycleFrame(colours,0,'dream');
 for(let elapsed=100;elapsed<=colours.length*60000;elapsed+=100){
  const frame=cycleFrame(colours,elapsed,'dream');
  for(const key of ['h','h2']){assert.ok(Math.abs(((frame[key]-previous[key]+540)%360)-180)<1);const rgb=hslToHex(frame[key],70,28),last=hslToHex(previous[key],70,28);for(const at of [1,3,5])assert.ok(Math.abs(parseInt(rgb.slice(at,at+2),16)-parseInt(last.slice(at,at+2),16))<=3);}
  previous=frame;
 }
});

test('slow or suspended timers cannot skip ahead through the palette',()=>{
 assert.equal(cycleStep(16),16);assert.equal(cycleStep(100),100);
 assert.equal(cycleStep(30000),100);assert.equal(cycleStep(3600000),100);assert.equal(cycleStep(-10),0);
 const before=cycleFrame(colours,45000,'dream'),after=cycleFrame(colours,45000+cycleStep(120000),'dream');
 assert.ok(Math.abs(after.h-before.h)<1);
});
