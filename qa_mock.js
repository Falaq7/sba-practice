// SBA Workspace assessment integrity checks.
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('BM4_Year1_Mock_SBA.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert(scripts.length>=2,'expected embedded data and application scripts');
new Function(scripts.at(-1)[1]);
const m=html.match(/<script id="examData" type="application\/json">([\s\S]*?)<\/script>/);
assert(m,'embedded dataset missing'); const d=JSON.parse(m[1]),q=d.questions,n=q.length;
assert.equal(n,105); assert.equal(new Set(q.map(x=>x.id)).size,n); assert.equal(new Set(q.map(x=>x.stem)).size,n);
for(const x of q){assert.equal(x.options.length,5);assert(Number.isInteger(x.answer)&&x.answer>=0&&x.answer<5);assert.equal(x.distractors.length,5);assert(x.why&&x.module&&x.topic&&x.lo.length&&x.domain&&x.difficulty);assert(x.subjects.length);}
const score=a=>a.reduce((s,x,i)=>s+(x===q[i].answer),0);
const correct=q.map(x=>x.answer),wrong=q.map(x=>(x.answer+1)%5),mixed=q.map((x,i)=>i%2?x.answer:(x.answer+1)%5),blank=Array(n).fill(null);
assert.equal(score(correct),105);assert.equal(score(wrong),0);assert.equal(score(mixed),52);assert.equal(score(blank),0);
assert.equal(blank.filter(x=>x===null).length,105);
for(const [theme,target] of Object.entries(d.blueprint.targets))assert.equal(q.filter(x=>x.theme===theme).length,target,theme);
for(const [subject,target] of Object.entries(d.blueprint.subjectTargets))assert.equal(q.filter(x=>x.subjects.includes(subject)).length,target,subject);
for(const token of ['localStorage.setItem','showModal()','print()','Retry errors','Flagged','Open Deep Review','Question banks'])assert(html.includes(token),token);
for(const token of ['shuffle=a=>','optionOrders','outcome(a,i)','Y2K_THEME_START','prefers-reduced-motion'])assert(html.includes(token),token);
for(const token of ['settingsModal','Liquid Glass','Y2K Prism','Clinical Minimal','Neon Cyber','Warm Paper','Retro Terminal','BM4_STYLE_v1'])assert(html.includes(token),token);
for(const token of ['safeImage','safeImage(q)','question-media','image:{optional:true'])assert(html.includes(token),token);
for(const token of ['option-row','eliminatedOptions','Rule out'])assert(html.includes(token),token);
for(const token of ['Aurora','Midnight Cosmos','Bioluminescent Ocean','Sakura Dream','Blueprint Lab','EXTRA_THEMES_START'])assert(html.includes(token),token);
for(const token of ['20% Easy','60% Moderate','20% Hard','near-miss distractors','one unambiguously best answer','same-category options'])assert(html.includes(token),token);
for(const token of ['export-menu','Save as JSON','Copy to clipboard','download(','copyText','attemptData'])assert(html.includes(token),token);
console.log(JSON.stringify({questions:n,allCorrect:score(correct),allWrong:score(wrong),mixed:score(mixed),unanswered:blank.length,themeTargets:'exact',subjectTargets:'exact',integrity:'pass'},null,2));
