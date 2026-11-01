// Restore appearance synchronously, before the app waits for IndexedDB or Firebase.
(()=>{
 const body=document.body;
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem('BM4_APPEARANCE_BOOT'));}catch{}
 const appearance=['dark','light'].includes(saved?.appearance)?saved.appearance:saved?.appearance==='system'&&saved.appearanceChosen===true?'system':'dark';
 const mode=appearance==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):appearance;
 Object.assign(body.dataset,{theme:saved?.theme||'prism',mode,appearance,colourway:saved?.colourway||'digital-dream',finish:saved?.finish||'y2k',cycle:saved?.cycle||'on'});
 // The live colour cycle starts at Digital Dream. Restore that same first
 // palette, rather than briefly painting a cached mid-cycle colour.
 const cycling=body.dataset.theme==='prism'&&body.dataset.cycle==='on';
 body.style.setProperty('--prism-h',String(!cycling&&Number.isFinite(saved?.h)?saved.h:235));
 body.style.setProperty('--prism-h2',String(!cycling&&Number.isFinite(saved?.h2)?saved.h2:310));
 if(!body.classList.contains('studio')){const root=document.documentElement;Object.assign(root.dataset,{pageTheme:body.dataset.theme,pageMode:mode,pageFinish:body.dataset.finish});root.style.setProperty('--page-h',body.style.getPropertyValue('--prism-h'));root.style.setProperty('--page-h2',body.style.getPropertyValue('--prism-h2'));}
 document.documentElement.style.colorScheme=mode;
 document.documentElement.style.backgroundColor=mode==='dark'?'#101023':'#f4f2fa';
})();
