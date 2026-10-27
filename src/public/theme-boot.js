// Restore appearance synchronously, before the app waits for IndexedDB or Firebase.
(()=>{
 const body=document.body;
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem('BM4_APPEARANCE_BOOT'));}catch{}
 const appearance=['dark','light','system'].includes(saved?.appearance)?saved.appearance:'dark';
 const mode=appearance==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):appearance;
 Object.assign(body.dataset,{theme:saved?.theme||'prism',mode,appearance,colourway:saved?.colourway||'digital-dream',finish:saved?.finish||'y2k',cycle:saved?.cycle||'on'});
 body.style.setProperty('--prism-h',String(Number.isFinite(saved?.h)?saved.h:235));
 body.style.setProperty('--prism-h2',String(Number.isFinite(saved?.h2)?saved.h2:310));
 document.documentElement.style.colorScheme=mode;
 document.documentElement.style.backgroundColor=mode==='dark'?'#101023':'#f4f2fa';
})();
