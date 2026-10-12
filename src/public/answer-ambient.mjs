// Adapted from React Bits Grainient by David Haz.
// Source: https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/Grainient/Grainient.jsx
// Licence: ./shared/grainient-LICENSE.txt
const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uLightMode;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);} 
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);} 
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);} 
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);
  if(uLightMode>0.5){
    float energy=max(max(col.r,col.g),col.b);
    vec3 hue=col/max(energy,0.001);
    float chroma=length(col-vec3(dot(col,vec3(0.333333))));
    float coverage=clamp(0.12+chroma*1.15+energy*0.18,0.0,0.88);
    col=mix(vec3(1.0),clamp(hue*0.58+col*0.18,0.0,1.0),coverage);
  }

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;

// One small shared GPU surface; visible cards receive a decorative 2D copy.
let engine,failed=false,cleanup=()=>{};
const motion=matchMedia('(prefers-reduced-motion: reduce)');
export function clearAnswerAmbient(){cleanup();cleanup=()=>{};}
function renderer(){
 if(engine||failed)return engine;
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false});
 if(!gl){failed=true;return null;}
 const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 try{
  const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
  gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
  gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Grainient link failed');
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniform=name=>gl.getUniformLocation(program,name);
  for(const [name,value]of Object.entries({uTimeSpeed:.25,uColorBalance:0,uWarpStrength:1,uWarpFrequency:5,uWarpSpeed:2,uWarpAmplitude:50,uBlendAngle:0,uBlendSoftness:.05,uRotationAmount:500,uNoiseScale:2,uGrainAmount:.1,uGrainScale:2,uGrainAnimated:0,uContrast:1.5,uGamma:1,uSaturation:1,uZoom:.9}))gl.uniform1f(uniform(name),value);
  gl.uniform2f(uniform('uCenterOffset'),0,0);
  const sampler=document.createElement('canvas');sampler.width=sampler.height=1;
  const ctx=sampler.getContext('2d',{willReadFrequently:true});
  const rgb=colour=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=colour;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3).map(n=>n/255);};
  engine={canvas,gl,uniform,rgb};
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;cleanup();});
  return engine;
 }catch{gl.getExtension('WEBGL_lose_context')?.loseContext();failed=true;return null;}
}
export function bindAnswerAmbient(){
 clearAnswerAmbient();
 const cards=[...document.querySelectorAll('.session-layout>article.panel')];
 if(!cards.length)return;
 const e=renderer();if(!e||failed)return;
 const {canvas,gl,uniform,rgb}=e,visible=new Set();
 let timer=0,elapsed=0,last=performance.now(),lastColours=0,disposed=false;
 for(const card of cards){
  card.classList.add('ambient-answer-card');
  canvas.className='answer-ambient';canvas.setAttribute('aria-hidden','true');card.prepend(canvas);
 }
 function paint(){
  if(disposed||document.hidden||!visible.size)return;
  const now=performance.now();if(!motion.matches)elapsed+=Math.min(now-last,100);last=now;
  if(now-lastColours>=200||!lastColours){
   const style=getComputedStyle(document.body),prism=document.body.dataset.theme==='prism';
   const colours=[style.getPropertyValue('--accent').trim(),prism?'hsl('+style.getPropertyValue('--prism-h2')+' 75% 60%)':style.getPropertyValue('--muted').trim(),style.getPropertyValue('--surface').trim()];
   gl.uniform3fv(uniform('uColor1'),rgb(colours[0]));gl.uniform3fv(uniform('uColor2'),rgb(colours[1]));gl.uniform3fv(uniform('uColor3'),rgb(colours[2]));canvas.dataset.palette=colours.join('|');
   gl.uniform1f(uniform('uLightMode'),document.body.dataset.mode==='light'?1:0);lastColours=now;
  }
  gl.uniform1f(uniform('iTime'),elapsed/1000);
  for(const card of visible){
   const rect=card.getBoundingClientRect(),scale=Math.min(.55,420/Math.max(rect.width,rect.height));
   const w=Math.max(1,Math.round(rect.width*scale)),h=Math.max(1,Math.round(rect.height*scale));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   gl.viewport(0,0,w,h);gl.uniform2f(uniform('iResolution'),w,h);gl.drawArrays(gl.TRIANGLES,0,3);canvas.dataset.frameTime=elapsed.toFixed(1);
  }
 }
 function schedule(){
  clearTimeout(timer);timer=0;
  if(disposed||document.hidden||!visible.size)return;
  paint();if(!motion.matches)timer=setTimeout(schedule,80);
 }
 const observer=new IntersectionObserver(entries=>{for(const item of entries)item.isIntersecting?visible.add(item.target):visible.delete(item.target);last=performance.now();schedule();});
 cards.forEach(card=>observer.observe(card));
 const theme=new MutationObserver(()=>{if(motion.matches)paint();});
 theme.observe(document.body,{attributes:true,attributeFilter:['data-theme','data-mode','data-colourway','style']});
 const resize=new ResizeObserver(()=>paint());cards.forEach(card=>resize.observe(card));
 document.addEventListener('visibilitychange',schedule);motion.addEventListener('change',schedule);
 cleanup=()=>{disposed=true;clearTimeout(timer);observer.disconnect();theme.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',schedule);motion.removeEventListener('change',schedule);canvas.remove();for(const card of cards)card.classList.remove('ambient-answer-card');visible.clear();};
}
