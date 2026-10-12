import test from 'node:test';
import assert from 'node:assert/strict';
import {cycleFrame} from '../src/public/colour-cycle.mjs';
const colours=[{id:'ice',h:210,h2:185},{id:'pink',h:320,h2:265},{id:'lime',h:85,h2:155},{id:'dream',h:235,h2:310},{id:'peach',h:25,h2:175}];
test('cycle holds 30 seconds and reaches each next palette after one minute',()=>{assert.deepEqual(cycleFrame(colours,30000,'ice'),{h:210,h2:185});assert.equal(cycleFrame(colours,45000,'ice').h,265);for(let i=0;i<6;i++)assert.deepEqual(cycleFrame(colours,i*60000,'ice'),{h:colours[i%5].h,h2:colours[i%5].h2});});
test('hue blending follows the short route through the circular colour wheel',()=>{assert.equal(cycleFrame(colours,45000,'pink').h,382.5);assert.equal(cycleFrame(colours,0,'unknown').h,210);});
