import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/public/theme-boot.js',import.meta.url),'utf8');
function boot(saved,{deviceDark=false,blocked=false}={}){
 const body={dataset:{},style:{setProperty(){}}},root={style:{}};
 vm.runInNewContext(source,{document:{body,documentElement:root},localStorage:{getItem(){if(blocked)throw Error('blocked');return saved;}},matchMedia:()=>({matches:deviceDark})});
 return {body,root};
}
test('saved dark appearance is already dark before account storage opens on a light device',()=>{
 const {body,root}=boot(JSON.stringify({appearance:'dark',theme:'prism'}));
 assert.equal(body.dataset.mode,'dark');assert.equal(root.style.colorScheme,'dark');
});
test('explicit light and system settings are respected at startup',()=>{
 assert.equal(boot(JSON.stringify({appearance:'light'}),{deviceDark:true}).body.dataset.mode,'light');
 assert.equal(boot(JSON.stringify({appearance:'system',appearanceChosen:true}),{deviceDark:true}).body.dataset.mode,'dark');
 assert.equal(boot(JSON.stringify({appearance:'system',appearanceChosen:true})).body.dataset.mode,'light');
});
test('missing, corrupt or blocked startup storage safely starts dark',()=>{
 for(const saved of [null,'broken'])assert.equal(boot(saved).body.dataset.mode,'dark');
 assert.equal(boot(null,{blocked:true}).body.dataset.mode,'dark');
});

test('legacy automatic device mode does not opt a learner out of dark mode',()=>{
 assert.equal(boot(JSON.stringify({appearance:'system'})).body.dataset.mode,'dark');
});
