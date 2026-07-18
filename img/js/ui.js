import { eotf, rgbToOklab } from './color.js';
import { buildGamutLut, gamutMax, isGamutReady } from './gamut.js';
import { histogram, capHist, fitChannel, lutLookup, PI_4 } from './histogram.js';
import { processImage, genNoise } from './pipeline.js';
import { applyDither, applyQuantize } from './postprocess.js';

const MAX_DIM=1400;
let srcPixels=null,procW=0,procH=0;
let origOffscreen=null;
let lastDst=null,postDst=null;
let splitMode=false,splitPos=.5,draggingSplit=false;
let pickingColor=false;
let debounce=null;

const canvas=document.getElementById('canvas-main');
const ctx=canvas.getContext('2d',{colorSpace:'srgb'});
const canvasArea=document.getElementById('canvas-area');
const dropHint=document.getElementById('drop-hint');
const overlay=document.getElementById('overlay');
const procDot=document.getElementById('proc-dot');

function showOverlay(msg){overlay.textContent=msg;overlay.style.display='flex';}
function hideOverlay(){overlay.style.display='none';}

function renderCanvas(){
  if(!lastDst)return;
  const active=postDst||lastDst;
  if(splitMode&&origOffscreen){
    ctx.putImageData(new ImageData(new Uint8ClampedArray(active),procW,procH),0,0);
    const sx=Math.round(procW*splitPos);
    ctx.drawImage(origOffscreen,0,0,sx,procH,0,0,sx,procH);
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,procH);ctx.stroke();
    const cy2=procH/2;
    ctx.beginPath();ctx.arc(sx,cy2,14,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,.9)';ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#444';ctx.font='bold 11px sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('◀▶',sx,cy2);
    ctx.restore();
  }else{
    ctx.putImageData(new ImageData(new Uint8ClampedArray(active),procW,procH),0,0);
  }
}

function hexToRgb(hex){const h=hex.slice(1);return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function getSeedColors(){return[...document.querySelectorAll('#seed-row input[type=color]')].map(el=>hexToRgb(el.value));}

function applyPostProcess(src){
  const mode=document.querySelector('[name=outmode]:checked').value;
  if(mode==='none')return null;
  const dst=new Uint8ClampedArray(src);
  if(mode==='dither'){
    applyDither(dst,procW,procH,document.getElementById('dither-algo').value);
  }else if(mode==='quantize'){
    const nc=parseInt(document.getElementById('qColors').value);
    const qd=document.querySelector('[name=qdither]:checked').value;
    applyQuantize(dst,procW,procH,nc,qd,getSeedColors());
  }
  return dst;
}

function scheduleUpdate(){clearTimeout(debounce);debounce=setTimeout(runUpdate,80);}

function runUpdate(){
  if(!srcPixels)return;
  procDot.classList.add('on');
  setTimeout(()=>{
    lastDst=processImage(srcPixels,procW,procH,getParams());
    postDst=lastDst?applyPostProcess(lastDst):null;
    renderCanvas();
    procDot.classList.remove('on');
  },0);
}

function getParams(){
  const g=id=>parseFloat(document.getElementById(id).value);
  return{
    capL:g('capL'),tL:g('tL'),sL:g('sL'),cL:g('cL'),gL:g('gL'),blackL:g('blackL'),whiteL:g('whiteL'),
    capC:g('capC'),tC:g('tC'),sC:g('sC'),cC:g('cC'),gC:g('gC'),blackC:g('blackC'),whiteC:g('whiteC'),
    shAngle:g('shAngle'),shStr:g('shStr'),midAngle:g('midAngle'),midStr:g('midStr'),hiAngle:g('hiAngle'),hiStr:g('hiStr'),
    grainAmt:g('grainAmt'),vigAmt:g('vigAmt'),vigFall:g('vigFall')
  };
}

function updateVal(el){
  const ve=document.getElementById('v-'+el.id);if(!ve)return;
  const v=parseFloat(el.value);
  ve.textContent=el.id.includes('Angle')?Math.round(v):v.toFixed(3);
}

function setSlider(id,val){
  const el=document.getElementById(id);if(!el)return;
  el.value=val;updateVal(el);
}

const DEFAULTS={
  capL:1,tL:PI_4,sL:PI_4,cL:.5,gL:PI_4,blackL:0,whiteL:0,
  capC:1,tC:PI_4,sC:PI_4,cC:.5,gC:PI_4,blackC:0,whiteC:0,
  shAngle:0,shStr:0,midAngle:0,midStr:0,hiAngle:0,hiStr:0,
  grainAmt:0,vigAmt:0,vigFall:2
};

document.querySelectorAll('input[type=range]').forEach(el=>{
  updateVal(el);el.addEventListener('input',()=>{updateVal(el);scheduleUpdate();});
});

// Image loading
function loadImage(file){
  if(!isGamutReady()){showOverlay('Initialising…');return;}
  const url=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{
    let w=img.naturalWidth,h=img.naturalHeight;
    if(Math.max(w,h)>MAX_DIM){const sc=MAX_DIM/Math.max(w,h);w=Math.round(w*sc);h=Math.round(h*sc);}
    procW=w;procH=h;canvas.width=w;canvas.height=h;
    ctx.drawImage(img,0,0,w,h);
    srcPixels=ctx.getImageData(0,0,w,h).data;
    origOffscreen=document.createElement('canvas');
    origOffscreen.width=w;origOffscreen.height=h;
    origOffscreen.getContext('2d').drawImage(img,0,0,w,h);
    dropHint.style.display='none';canvas.style.display='block';
    URL.revokeObjectURL(url);
    runUpdate();
  };
  img.onerror=()=>{
    URL.revokeObjectURL(url);
    const isHeic=/\.hei[cf]$/i.test(file.name)||/heic|heif/.test(file.type);
    showOverlay(isHeic?'HEIC not supported by this browser.\nConvert to JPEG/PNG first, or open in Safari.':'Could not load image.');
    setTimeout(hideOverlay,4000);
  };
  img.src=url;
}

// Seed color helpers
function addSeedColor(hex){
  const row=document.getElementById('seed-row');
  if(row.children.length>=6)return;
  const wrap=document.createElement('div');wrap.className='seed-swatch';
  const inp=document.createElement('input');inp.type='color';inp.value=hex;
  inp.addEventListener('input',scheduleUpdate);
  const rm=document.createElement('button');rm.className='rm';rm.textContent='×';
  rm.addEventListener('click',()=>{wrap.remove();scheduleUpdate();});
  wrap.append(inp,rm);
  row.append(wrap);
  scheduleUpdate();
}
function enterPickMode(){
  if(!lastDst)return;
  pickingColor=true;
  canvas.classList.add('picking');
  document.getElementById('btn-seed-add').classList.add('on');
  // show full-colour processed image so the pick target matches what will be quantized
  ctx.putImageData(new ImageData(new Uint8ClampedArray(lastDst),procW,procH),0,0);
}
function exitPickMode(){
  pickingColor=false;
  canvas.classList.remove('picking');
  canvas.style.cursor=splitMode?'ew-resize':'default';
  document.getElementById('btn-seed-add').classList.remove('on');
  renderCanvas();
}

// Split view
function canvasNormX(cssX){const r=canvas.getBoundingClientRect();return(cssX-r.left)/r.width;}
canvas.addEventListener('mousedown',e=>{if(pickingColor)return;if(!splitMode)return;if(Math.abs(canvasNormX(e.clientX)-splitPos)<.06){draggingSplit=true;e.preventDefault();}});
canvas.addEventListener('mousemove',e=>{if(pickingColor)return;if(!splitMode)return;canvas.style.cursor=Math.abs(canvasNormX(e.clientX)-splitPos)<.06?'ew-resize':'default';});
canvas.addEventListener('click',e=>{
  if(!pickingColor||!lastDst)return;
  const rect=canvas.getBoundingClientRect();
  const x=Math.max(0,Math.min(procW-1,Math.round((e.clientX-rect.left)/rect.width*procW)));
  const y=Math.max(0,Math.min(procH-1,Math.round((e.clientY-rect.top)/rect.height*procH)));
  const i=(y*procW+x)*4;
  const hex='#'+[lastDst[i],lastDst[i+1],lastDst[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');
  addSeedColor(hex);
  exitPickMode();
});
window.addEventListener('mousemove',e=>{if(!draggingSplit)return;splitPos=Math.min(.95,Math.max(.05,canvasNormX(e.clientX)));renderCanvas();});
window.addEventListener('mouseup',()=>{draggingSplit=false;});
canvas.addEventListener('touchstart',e=>{if(!splitMode)return;if(Math.abs(canvasNormX(e.touches[0].clientX)-splitPos)<.08){draggingSplit=true;e.preventDefault();}},{passive:false});
window.addEventListener('touchmove',e=>{if(!draggingSplit)return;splitPos=Math.min(.95,Math.max(.05,canvasNormX(e.touches[0].clientX)));renderCanvas();},{passive:true});
window.addEventListener('touchend',()=>{draggingSplit=false;});

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
  });
});

// Output mode
document.querySelectorAll('[name=outmode]').forEach(r=>{
  r.addEventListener('change',()=>{
    document.getElementById('out-dither').hidden=r.value!=='dither';
    document.getElementById('out-quantize').hidden=r.value!=='quantize';
    scheduleUpdate();
  });
});
document.getElementById('dither-algo').addEventListener('change',scheduleUpdate);
document.getElementById('qColors').addEventListener('input',e=>{document.getElementById('v-qColors').textContent=e.target.value;scheduleUpdate();});
document.querySelectorAll('[name=qdither]').forEach(r=>r.addEventListener('change',scheduleUpdate));

document.getElementById('btn-seed-add').addEventListener('click',()=>{enterPickMode();});

// Buttons
document.getElementById('btn-open').addEventListener('click',()=>document.getElementById('file-input').click());
document.getElementById('file-input').addEventListener('change',e=>{if(e.target.files[0])loadImage(e.target.files[0]);});

document.getElementById('btn-save').addEventListener('click',()=>{
  if(!lastDst)return;
  const toSave=postDst||lastDst;
  const tmp=document.createElement('canvas');tmp.width=procW;tmp.height=procH;
  tmp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(toSave),procW,procH),0,0);
  tmp.toBlob(blob=>{
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='img-out.png';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  },'image/png');
});

document.getElementById('btn-reset').addEventListener('click',()=>{
  Object.keys(DEFAULTS).forEach(k=>setSlider(k,DEFAULTS[k]));
  document.querySelector('[name=outmode][value=none]').checked=true;
  document.getElementById('out-dither').hidden=true;
  document.getElementById('out-quantize').hidden=true;
  scheduleUpdate();
});

document.getElementById('btn-split').addEventListener('click',()=>{
  splitMode=!splitMode;splitPos=.5;
  document.getElementById('btn-split').classList.toggle('on',splitMode);
  canvas.style.cursor=splitMode?'ew-resize':'default';
  renderCanvas();
});

document.getElementById('btn-fitL').addEventListener('click',()=>{
  if(!srcPixels||!isGamutReady())return;
  showOverlay('Fitting L…');
  setTimeout(()=>{
    const n=procW*procH,vals=new Float32Array(n);
    for(let i=0;i<n;i++){const p=i*4;vals[i]=rgbToOklab(eotf(srcPixels[p]/255),eotf(srcPixels[p+1]/255),eotf(srcPixels[p+2]/255))[0];}
    const fit=fitChannel(capHist(histogram(vals,n),parseFloat(document.getElementById('capL').value)));
    setSlider('tL',fit.t);setSlider('sL',fit.s);setSlider('cL',fit.c);setSlider('gL',fit.g);
    setSlider('blackL',fit.xLo);setSlider('whiteL',fit.xHi-1);
    hideOverlay();scheduleUpdate();
  },10);
});

document.getElementById('btn-fitC').addEventListener('click',()=>{
  if(!srcPixels||!isGamutReady())return;
  showOverlay('Fitting C…');
  setTimeout(()=>{
    const n=procW*procH,vals=new Float32Array(n);
    const TWO_PI=2*Math.PI;
    for(let i=0;i<n;i++){
      const p=i*4;
      const[L,a,b]=rgbToOklab(eotf(srcPixels[p]/255),eotf(srcPixels[p+1]/255),eotf(srcPixels[p+2]/255));
      const C=Math.sqrt(a*a+b*b),h=((Math.atan2(b,a)%TWO_PI)+TWO_PI)%TWO_PI;
      const Cm=gamutMax(L,h);vals[i]=Cm>1e-10?Math.min(1,C/Cm):0;
    }
    const fit=fitChannel(capHist(histogram(vals,n),parseFloat(document.getElementById('capC').value)));
    setSlider('tC',fit.t);setSlider('sC',fit.s);setSlider('cC',fit.c);setSlider('gC',fit.g);
    setSlider('blackC',fit.xLo);setSlider('whiteC',fit.xHi-1);
    hideOverlay();scheduleUpdate();
  },10);
});

document.getElementById('btn-dice').addEventListener('click',()=>{
  if(!isGamutReady())return;
  const rnd=(lo,hi)=>lo+Math.random()*(hi-lo);
  setSlider('capL',rnd(.15,.65));setSlider('tL',rnd(.4,1.2));setSlider('sL',rnd(.3,1.3));
  setSlider('cL',rnd(.3,.7));setSlider('gL',rnd(.4,1.1));
  setSlider('blackL',rnd(0,.15));setSlider('whiteL',rnd(-.15,0));
  setSlider('capC',rnd(.2,.8));setSlider('tC',rnd(.5,1.2));setSlider('sC',rnd(.3,1.3));
  setSlider('cC',rnd(.3,.7));setSlider('gC',rnd(.4,1.1));
  setSlider('blackC',rnd(0,.1));setSlider('whiteC',rnd(-.1,0));
  setSlider('shAngle',rnd(0,360));setSlider('shStr',rnd(0,.12));
  setSlider('midAngle',rnd(0,360));setSlider('midStr',rnd(0,.06));
  setSlider('hiAngle',rnd(0,360));setSlider('hiStr',rnd(0,.1));
  setSlider('grainAmt',rnd(0,.04));setSlider('vigAmt',rnd(0,2));setSlider('vigFall',rnd(1,3.5));
  genNoise();scheduleUpdate();
});

// Drag & drop + paste
canvasArea.addEventListener('dragover',e=>{e.preventDefault();canvasArea.classList.add('drag-over');});
canvasArea.addEventListener('dragleave',()=>canvasArea.classList.remove('drag-over'));
canvasArea.addEventListener('drop',e=>{e.preventDefault();canvasArea.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f)loadImage(f);});
document.addEventListener('paste',e=>{const item=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));if(item)loadImage(item.getAsFile());});

// Keyboard
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&pickingColor)exitPickMode();
  if((e.key==='s'||e.key==='S')&&!pickingColor)document.getElementById('btn-split').click();
});

// Boot
showOverlay('Building gamut LUT…');
genNoise();
setTimeout(()=>{buildGamutLut();hideOverlay();},20);
