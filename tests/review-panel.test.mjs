import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.matchMedia=()=>({matches:true});
const {bindDeepReview}=await import('../dist/public/review-panel.mjs');

function fixture({mode='learn',locked=true,view='session',id,justAnswered=true,width=1440}={}){
 const classes=new Set(),listeners=new Map();let panel,focused=false,focusOptions,drawerCalls=0;
 const classList={add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:()=>false};
 const button={focus:options=>{focused=true;focusOptions=options;}},close={};
 const card={dataset:{reviewKey:'q@1'},classList,offsetWidth:1,querySelector:()=>button};
 const host={prepend:p=>{panel=p;}};
 globalThis.document={body:{classList},querySelector:s=>s==='#review-rail'?null:s==='#review-rail,.session-sidebar'?host:null,querySelectorAll:()=>[card],createElement:()=>({hidden:false,setAttribute(){},classList,getAnimations:()=>{drawerCalls++;return [];},querySelector:s=>s==='#close-deep-review'?close:null,querySelectorAll:()=>[],remove(){}}),addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 globalThis.window={addEventListener(){},removeEventListener(){}};
 globalThis.innerWidth=width;globalThis.cancelAnimationFrame=()=>{};
 const q={uid:'q',stem:'A patient has a symptom.',options:['Correct','Alternative'],answer:0,why:'Explanation',distractors:['','Why not'],deepReview:{keyClues:[]}};
 const c={view,openDeepReview:justAnswered?'q@1':null,session:{id,mode,current:0,questions:[{key:'q@1',order:[0,1]}],answers:{'q@1':{locked,selected:0,seconds:20}}},questionMap:new Map([['q@1',q]]),stats:{rows:[]}};
 bindDeepReview(c);
 return {get panel(){return panel;},get drawerCalls(){return drawerCalls;},get focusOptions(){return focusOptions;},classes,close,click:()=>listeners.get('click')({target:{closest:()=>({dataset:{explore:'q@1'}})}}),focused:()=>focused};
}

test('mobile teaching expands and closes without running drawer motion or scrolling restored focus',async()=>{
 const f=fixture({width:390});
 assert.equal(f.panel.hidden,false);assert.equal(f.drawerCalls,0);
 await f.close.onclick();assert.equal(f.panel.hidden,true);
 assert.deepEqual(f.focusOptions,{preventScroll:true});assert.equal(f.drawerCalls,0);
 f.click();assert.equal(f.panel.hidden,false);assert.equal(f.drawerCalls,0);
});

test('checked learning answers open teaching; closing restores layout and manual reopening works',async()=>{
 const f=fixture();
 assert.equal(f.panel.hidden,false);
 assert.match(f.panel.innerHTML,/Deep Review/);
 assert.ok(f.classes.has('deep-review-open'));
 await f.close.onclick();
 assert.equal(f.panel.hidden,true);
 assert.equal(f.classes.has('deep-review-open'),false);
 assert.ok(f.focused());
 f.click();
 assert.equal(f.panel.hidden,false);
 assert.ok(f.classes.has('deep-review-open'));
});

test('draft learning and assessment answers do not automatically reveal teaching',()=>{
 for(const options of [{locked:false},{mode:'assessment'},{view:'review',mode:'assessment'}]){
  const f=fixture(options);
  assert.equal(f.panel.hidden,true);
  assert.equal(f.classes.has('deep-review-open'),false);
 }
});

test('sync redraw keeps a closed review closed and restores an open review without replaying entrance',async()=>{
 const first=fixture({id:'stable-session'});await first.close.onclick();
 const redraw=fixture({id:'stable-session'});assert.equal(redraw.panel.hidden,true);
 redraw.click();const reopened=fixture({id:'stable-session'});assert.equal(reopened.panel.hidden,false);
});

test('home page without a session does not crash review binding',()=>{
 fixture();globalThis.document.querySelectorAll=()=>[];
 assert.doesNotThrow(()=>bindDeepReview({view:'home',session:null}));
});

test('returning to an answered question leaves teaching closed until manually opened',()=>{
 const f=fixture({id:'revisited-session',justAnswered:false});assert.equal(f.panel.hidden,true);f.click();assert.equal(f.panel.hidden,false);
});
