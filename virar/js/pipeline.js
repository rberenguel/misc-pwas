import { eotf, oetf, rgbToOklab, oklabToRgb } from './color.js';
import { gamutMax } from './gamut.js';
import { histogram, capHist, buildTransferLut, lutLookup } from './histogram.js';

const BINS=256;
const Z_LO=1/3,Z_HI=2/3,Z_HW=1/4;

function ss(t){t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);}
function zoneW(lOut,cdfLut){
  const u=lutLookup(cdfLut,lOut),iw=1/(2*Z_HW);
  const t1=ss((u-(Z_LO-Z_HW))*iw),t2=ss((u-(Z_HI-Z_HW))*iw);
  return[1-t1,t1-t2,t2];
}

let noiseTex=null;
const NTEX=1024;
export function genNoise(){
  const t=new Float32Array(NTEX*NTEX);
  for(let i=0;i<t.length;i++)t[i]=Math.random()*2-1;
  noiseTex=t;
}
function sampleNoise(x,y){
  const xi=((x%NTEX)+NTEX)%NTEX,yi=((y%NTEX)+NTEX)%NTEX;
  return noiseTex[yi*NTEX+xi];
}

export function processImage(srcPixels,procW,procH,params){
  const n=procW*procH;
  const Lv=new Float32Array(n),Cv=new Float32Array(n),Hv=new Float32Array(n);
  const TWO_PI=2*Math.PI;
  const cx=procW*.5,cy=procH*.5,normR=Math.sqrt(cx*cx+cy*cy);

  for(let y=0;y<procH;y++){
    for(let x=0;x<procW;x++){
      const i=y*procW+x,p=i*4;
      let r=eotf(srcPixels[p]/255),g=eotf(srcPixels[p+1]/255),b=eotf(srcPixels[p+2]/255);
      if(params.vigAmt>0){
        const dx=(x+.5-cx)/normR,dy=(y+.5-cy)/normR,r2=Math.min(1,dx*dx+dy*dy);
        const fall=Math.pow(r2,params.vigFall*.5);
        const luma=.2126*srcPixels[p]/255+.7152*srcPixels[p+1]/255+.0722*srcPixels[p+2]/255;
        const gain=Math.pow(2,-params.vigAmt*fall*(1-Math.pow(luma,4)));
        r*=gain;g*=gain;b*=gain;
      }
      const[L,a,bk]=rgbToOklab(r,g,b);
      Lv[i]=L;
      const C=Math.sqrt(a*a+bk*bk);
      let h=Math.atan2(bk,a);if(h<0)h+=TWO_PI;
      Hv[i]=h;
      const Cm=gamutMax(L,h);
      Cv[i]=Cm>1e-10?Math.min(1,C/Cm):0;
    }
  }

  const histL=capHist(histogram(Lv,n),params.capL);
  const histC=capHist(histogram(Cv,n),params.capC);
  const trL=buildTransferLut(histL,params.tL,params.sL,params.cL,params.gL,params.blackL,params.whiteL);
  const trC=buildTransferLut(histC,params.tC,params.sC,params.cC,params.gC,params.blackC,params.whiteC);
  const spL=1+params.whiteL-params.blackL,spC=1+params.whiteC-params.blackC;

  const outH=new Float64Array(BINS);
  for(let i=0;i<n;i++){
    const lo=Math.min(1,Math.max(0,params.blackL+lutLookup(trL,Lv[i])*spL));
    outH[Math.min(Math.floor(lo*BINS),BINS-1)]++;
  }
  const cdfLut=new Float32Array(BINS);let csum=0;
  for(let i=0;i<BINS;i++){csum+=outH[i];cdfLut[i]=csum/n;}

  const d2r=Math.PI/180;
  const daS=params.shStr*Math.cos(params.shAngle*d2r),dbS=params.shStr*Math.sin(params.shAngle*d2r);
  const daM=params.midStr*Math.cos(params.midAngle*d2r),dbM=params.midStr*Math.sin(params.midAngle*d2r);
  const daH=params.hiStr*Math.cos(params.hiAngle*d2r),dbH=params.hiStr*Math.sin(params.hiAngle*d2r);

  const dst=new Uint8ClampedArray(n*4);
  for(let y=0;y<procH;y++){
    for(let x=0;x<procW;x++){
      const i=y*procW+x,h=Hv[i];
      let lOut=Math.min(1,Math.max(0,params.blackL+lutLookup(trL,Lv[i])*spL));
      const cRelOut=Math.min(1,Math.max(0,params.blackC+lutLookup(trC,Cv[i])*spC));
      const Cm2=gamutMax(lOut,h);
      let a2=cRelOut*Cm2*Math.cos(h),b2=cRelOut*Cm2*Math.sin(h);
      const[wS,wM,wH]=zoneW(lOut,cdfLut);
      a2+=wS*daS+wM*daM+wH*daH;b2+=wS*dbS+wM*dbM+wH*dbH;
      if(params.grainAmt>0){
        const mid=Math.min(1,Math.max(0,4*lOut*(1-lOut)));
        lOut=Math.min(1,Math.max(0,lOut+params.grainAmt*(.15+.85*mid)*sampleNoise(x,y)));
      }
      const cPost=Math.sqrt(a2*a2+b2*b2);
      if(cPost>1e-10){const maxC=gamutMax(lOut,h);if(cPost>maxC){const sc=maxC/cPost;a2*=sc;b2*=sc;}}
      const[r,g,b]=oklabToRgb(lOut,a2,b2);
      const p=i*4;
      dst[p]=Math.round(Math.min(1,Math.max(0,oetf(r)))*255);
      dst[p+1]=Math.round(Math.min(1,Math.max(0,oetf(g)))*255);
      dst[p+2]=Math.round(Math.min(1,Math.max(0,oetf(b)))*255);
      dst[p+3]=255;
    }
  }
  return dst;
}
