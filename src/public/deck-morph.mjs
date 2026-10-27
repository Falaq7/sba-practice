import './anime.umd.min.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let overlay=null,animations=[],receiving=null,generation=0;
export function clearDeckMorph(){
 generation++;animations.forEach(a=>a.cancel());animations=[];overlay?.remove();overlay=null;
 receiving?.classList.remove('receiving');receiving=null;
}
function textLayer(element,rect,origin,style){
 const node=element.cloneNode(true);node.removeAttribute('id');
 Object.assign(node.style,{position:'absolute',left:rect.left-origin.left-1+'px',top:rect.top-origin.top-1+'px',width:rect.width+'px',height:rect.height+'px',minWidth:'0',maxWidth:'none',boxSizing:'border-box',padding:'0',border:'0',margin:'0',display:'block',fontFamily:style.fontFamily,fontWeight:style.fontWeight,fontStyle:style.fontStyle,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,fontSize:style.fontSize,color:style.color,whiteSpace:style.whiteSpace,overflowWrap:style.overflowWrap,wordBreak:style.wordBreak,textOverflow:style.textOverflow,overflow:style.overflow,textTransform:style.textTransform,fontFeatureSettings:style.fontFeatureSettings,fontVariationSettings:style.fontVariationSettings,transformOrigin:'top left'});
 return node;
}
export function morphDeck(source,target){
 clearDeckMorph();if(reduced.matches)return;
 const b=target.getBoundingClientRect();if(b.top<0||b.top>innerHeight)return;
 const token=generation,a=source.getBoundingClientRect(),style=getComputedStyle(target),shell=document.createElement('div');
 shell.className='main-deck-transfer';shell.setAttribute('aria-hidden','true');
 Object.assign(shell.style,{left:a.left+'px',top:a.top+'px',width:a.width+'px',height:a.height+'px',backgroundColor:'#29243d',borderRadius:getComputedStyle(source).borderRadius});
 const pairs=[[source.querySelector('strong'),target.querySelector('#home-selected-title')],[source.querySelector('.home-bank-year'),target.querySelector('#home-selected-year')],[source.querySelector('.home-bank-count'),target.querySelector('#home-selected-count')],[source.querySelector('.home-bank-icon svg'),target.querySelector('.deck-number svg')]];
 const animate=(node,props)=>{const motion=globalThis.anime.animate(node,{ease:'out(4)',...props});animations.push(motion);};
 document.body.append(shell);overlay=shell;receiving=target;target.classList.add('receiving');
 for(const [from,to] of pairs){
  if(!from||!to)continue;
  const r=from.getBoundingClientRect(),z=to.getBoundingClientRect(),ts=getComputedStyle(to),fs=getComputedStyle(from),end={left:z.left-b.left-1,top:z.top-b.top-1};
  if(to.tagName.toLowerCase()==='svg'){
   const node=document.createElement('div'),svg=to.cloneNode(true);svg.removeAttribute('id');
   Object.assign(node.style,{position:'absolute',left:r.left-a.left-1+'px',top:r.top-a.top-1+'px',width:z.width+'px',height:z.height+'px',color:ts.color,transformOrigin:'top left'});
   Object.assign(svg.style,{width:'100%',height:'100%',display:'block'});node.append(svg);shell.append(node);
   animate(node,{...end,scaleX:[r.width/z.width,1],scaleY:[r.height/z.height,1],duration:520});continue;
  }
  // Keep both line layouts fixed. Reflowing width/font-size mid-flight makes
  // words jump between lines; a short overlap lets the wrapped layout settle.
  const outgoing=textLayer(from,r,a,fs),incoming=textLayer(to,z,b,ts);
  Object.assign(incoming.style,{left:r.left-a.left-1+'px',top:r.top-a.top-1+'px',opacity:'0'});
  shell.append(outgoing,incoming);
  const fontRatio=parseFloat(fs.fontSize)/parseFloat(ts.fontSize)||1;
  animate(outgoing,{...end,scale:[1,1/fontRatio],color:ts.color,duration:520});
  animate(outgoing,{opacity:[1,0],duration:220});
  animate(incoming,{...end,scale:[fontRatio,1],duration:520});
  animate(incoming,{opacity:[0,1],delay:70,duration:260});
 }
 animate(shell,{left:b.left,top:b.top,width:b.width,height:b.height,backgroundColor:style.backgroundColor,borderColor:style.borderColor,borderRadius:style.borderRadius,duration:520,onComplete:()=>{if(token===generation)clearDeckMorph();}});
}
addEventListener('resize',clearDeckMorph);addEventListener('scroll',clearDeckMorph,{passive:true});reduced.addEventListener('change',clearDeckMorph);
