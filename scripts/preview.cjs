const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=process.env.SBA_PREVIEW_DATA_DIR||path.join(root,'.preview');fs.mkdirSync(dir,{recursive:true});
const dataFile=path.join(dir,'library.json'),token=crypto.randomBytes(32).toString('hex');
const ports={public:Number(process.env.SBA_PREVIEW_PUBLIC_PORT)||8780,studio:Number(process.env.SBA_PREVIEW_STUDIO_PORT)||8781};const publicHost=process.env.SBA_PREVIEW_PUBLIC_HOST||'127.0.0.1';const origins={public:'http://'+publicHost+':'+ports.public,studio:'http://127.0.0.1:'+ports.studio};
function data(){try{return JSON.parse(fs.readFileSync(dataFile,'utf8'));}catch{return {releases:{},versions:{},reports:{}};}}
function save(d){const tmp=dataFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(d));fs.renameSync(tmp,dataFile);}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
for(const kind of ['public','studio'])http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,origins[kind]);if(req.headers.host!==new URL(origins[kind]).host)return json(res,403,{error:'Invalid host'});
  if(u.pathname==='/__preview/config')return json(res,200,{preview:true,kind,token:kind==='studio'?token:undefined});
  if(u.pathname==='/__preview/manifest')return json(res,200,Object.values(data().releases).filter(r=>r.status==='published'));
  if(u.pathname==='/__preview/questions'){const d=data(),r=d.releases[u.searchParams.get('release')];if(!r||r.status!=='published')return json(res,404,{error:'Collection unavailable'});return json(res,200,d.versions[r.currentVersion]||[]);}
  if(u.pathname==='/__preview/community'){
    if(kind!=='public')return json(res,403,{error:'Use the learner site.'});
    if(req.method==='GET')return json(res,200,Object.values(data().community||{}));
    if(req.method!=='POST'||req.headers.origin!==origins.public)return json(res,403,{error:'Open the learner site to share a bank.'});
    let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>800000)return json(res,413,{error:'Share banks under 800 KB.'});chunks.push(chunk);}
    const body=JSON.parse(Buffer.concat(chunks));if(!body.title?.trim()||body.title.length>120||!Array.isArray(body.questions)||!body.questions.length||body.questions.length>100)return json(res,400,{error:'Provide a title and 1–100 questions.'});
    const {parseBank,validateQuestion}=await import('../src/shared/core.mjs');const {communityKey,communityFingerprint,duplicateMessage}=await import('../src/shared/community.mjs');const sharedId=await communityFingerprint(body),bank=parseBank({setId:sharedId,questions:body.questions.map(q=>({...q,uid:undefined}))});
    const errors=bank.questions.flatMap(q=>validateQuestion(q).errors);if(errors.length)return json(res,400,{error:errors[0]});const record={id:sharedId,title:body.title.trim(),questions:bank.questions,status:'published',createdAt:Date.now()};const saved=data();saved.community||={};if(Object.values(saved.community).some(b=>communityKey(b)===communityKey(bank)))return json(res,409,{error:duplicateMessage});saved.community[sharedId]=record;save(saved);return json(res,200,{id:sharedId});
  }
  if(u.pathname==='/__preview/reports'&&req.method==='GET'){if(kind!=='studio'||req.headers['x-preview-token']!==token)return json(res,403,{error:'Private studio access required.'});return json(res,200,Object.values(data().reports||{}));}
  if(u.pathname==='/__preview/report'&&req.method==='POST'){
    if(kind!=='public'||req.headers.origin!==origins.public)return json(res,403,{error:'Open the learner site to report.'});let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>20000)return json(res,413,{error:'Keep reports under 4000 characters.'});chunks.push(chunk);}const b=JSON.parse(Buffer.concat(chunks));if(typeof b.details!=='string'||!b.details.trim()||b.details.length>4000||typeof b.uid!=='string'||b.uid.length>500)return json(res,400,{error:'Describe what needs checking.'});const d=data(),id=crypto.randomUUID();d.reports||={};d.reports[id]={id,uid:b.uid,revision:Number(b.revision)||1,topic:String(b.topic||'').slice(0,200),kind:String(b.kind||'Inaccuracy').slice(0,80),details:b.details.trim(),createdAt:Date.now()};save(d);return json(res,200,{id});
  }
  if(req.method==='POST'&&u.pathname.startsWith('/__preview/')){
    if(kind!=='studio'||req.headers.origin!==origins.studio||req.headers['x-preview-token']!==token)return json(res,403,{error:'Local studio access required'});
    let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>5000000)return json(res,413,{error:'Batch too large for preview'});chunks.push(chunk);}const body=JSON.parse(Buffer.concat(chunks)),d=data();
    if(u.pathname==='/__preview/account-lookup'||u.pathname==='/__preview/account-reset'){if(!process.env.SBA_FIREBASE_ADMIN_KEY)return json(res,503,{error:'Account recovery needs the private Firebase admin key on this computer. See admin/README.md. No account was changed.'});const {localAccountAction}=await import('../admin/account-server.mjs');return json(res,200,await localAccountAction(u.pathname.endsWith('-reset')?'reset':'lookup',body));}
    if(u.pathname==='/__preview/resolve-report'){if(!d.reports?.[body.id])return json(res,404,{error:'Report unavailable.'});d.reports[body.id].resolvedAt=Date.now();save(d);return json(res,200,{ok:true});}
    if(u.pathname==='/__preview/publish'){const {placement}=await import('../src/shared/catalogue.mjs');const draft=body.draft;if(!draft?.id||!Array.isArray(draft.questions)||!draft.questions.length)return json(res,400,{error:'Invalid collection'});const version=crypto.randomUUID(),old=d.releases[draft.id];d.versions[version]=draft.questions.map(q=>({...q,collection:draft.title,collectionId:draft.id,publishedAt:Date.now()}));d.releases[draft.id]={...placement(draft.questions),id:draft.id,title:draft.title,count:draft.questions.length,currentVersion:version,previousVersion:old?.currentVersion||null,status:'published',publishedAt:Date.now(),modules:[...new Set(draft.questions.map(q=>q.module))],topics:[...new Set(draft.questions.map(q=>q.topic))],weeks:[...new Set(draft.questions.map(q=>q.week).filter(Boolean))]};save(d);return json(res,200,{version});}
    if(u.pathname==='/__preview/withdraw'){if(!d.releases[body.id])return json(res,404,{error:'Collection unavailable'});d.releases[body.id].status='withdrawn';save(d);return json(res,200,{ok:true});}
    if(u.pathname==='/__preview/rollback'){const r=d.releases[body.id];if(!r?.previousVersion)return json(res,400,{error:'No previous revision'});[r.currentVersion,r.previousVersion]=[r.previousVersion,r.currentVersion];const qs=d.versions[r.currentVersion];const {placement}=await import('../src/shared/catalogue.mjs');Object.assign(r,placement(qs));r.count=qs.length;r.modules=[...new Set(qs.map(q=>q.module))];r.topics=[...new Set(qs.map(q=>q.topic))];r.weeks=[...new Set(qs.map(q=>q.week).filter(Boolean))];save(d);return json(res,200,{ok:true});}
    return json(res,404,{error:'Unknown action'});
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed'});
  const base=path.join(root,'dist',kind),file=path.resolve(base,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  if(!file.startsWith(base+path.sep))return json(res,403,{error:'Invalid path'});
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return json(res,404,{error:'File not found'});
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);
}catch(e){json(res,500,{error:e.message});}}).listen(ports[kind],kind==='public'?publicHost:'127.0.0.1',()=>console.log(`${kind}: ${origins[kind]}`));
