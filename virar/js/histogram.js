const BINS=256,TRIM_EPS=5e-3;
export const PI_4=Math.PI/4;
const TARGET_X=new Float64Array(4096).map((_,i)=>i/4095);

export function histogram(vals,n){
  const h=new Float64Array(BINS);
  for(let i=0;i<n;i++){const v=vals[i];if(v>=0&&v<=1)h[Math.min(Math.floor(v*BINS),BINS-1)]++;}
  return h;
}

export function capHist(hist,frac){
  const mx=Math.max(...hist);
  if(frac>=1||mx<=0)return new Float64Array(hist);
  const cap=frac*mx,out=new Float64Array(hist);
  for(let i=0;i<BINS;i++){
    if(out[i]<=cap)continue;
    let surplus=out[i]-cap;out[i]=cap;
    let lo=i-1,hi=i+1;
    while(surplus>1e-12&&(lo>=0||hi<BINS)){
      const rL=lo>=0&&out[lo]<cap?cap-out[lo]:0,rH=hi<BINS&&out[hi]<cap?cap-out[hi]:0,tot=rL+rH;
      if(tot>0){const p=Math.min(surplus,tot);if(lo>=0)out[lo]+=p*rL/tot;if(hi<BINS)out[hi]+=p*rH/tot;surplus-=p;}
      lo--;hi++;
    }
  }
  return out;
}

function targetCdf(x,t,s,c,g){
  const te=Math.tan(t),se=1/Math.tan(s),ge=Math.tan(g);
  const alpha=se*c/(se*c+te*(1-c)),beta=1-alpha;
  const out=new Float64Array(x.length);
  for(let i=0;i<x.length;i++){
    const xi=x[i];
    const h=xi<=c?alpha*Math.pow(Math.max(0,xi/c),te):1-beta*Math.pow(Math.max(0,(1-xi)/(1-c)),se);
    out[i]=Math.min(1,Math.max(0,Math.pow(Math.max(0,h),ge)));
  }
  return out;
}

function interpInv(sortedY,xArr,v){
  const n=sortedY.length;
  if(v<=sortedY[0])return xArr[0];if(v>=sortedY[n-1])return xArr[n-1];
  let lo=0,hi=n-1;
  while(lo<hi-1){const m=(lo+hi)>>1;if(sortedY[m]<=v)lo=m;else hi=m;}
  return xArr[lo]+(v-sortedY[lo])/(sortedY[hi]-sortedY[lo])*(xArr[hi]-xArr[lo]);
}

export function lutLookup(lut,v){
  const f=Math.min(Math.max(v,0),1)*(BINS-1),lo=Math.min(Math.floor(f),BINS-2);
  return lut[lo]+(f-lo)*(lut[lo+1]-lut[lo]);
}

export function buildTransferLut(cappedHist,t,s,c,g,black,white){
  const span=1+white-black,ty=targetCdf(TARGET_X,t,s,c,g);
  const cdf=new Float64Array(BINS);let cs=0;
  for(let i=0;i<BINS;i++){cs+=cappedHist[i];cdf[i]=cs;}
  if(cs>0)for(let i=0;i<BINS;i++)cdf[i]/=cs;
  const tr=new Float32Array(BINS);
  for(let i=0;i<BINS;i++)tr[i]=interpInv(ty,TARGET_X,cdf[i]);
  let first=-1,last=-1;
  for(let i=0;i<BINS;i++){if(cdf[i]>TRIM_EPS){first=i;break;}}
  for(let i=BINS-1;i>=0;i--){if(cdf[i]<1-TRIM_EPS){last=i;break;}}
  if(first>=0&&last>=0&&Math.abs(span)>1e-10){
    const loT=-black/span,hiT=(1-black)/span;
    for(let j=0;j<first;j++)tr[j]=loT+(tr[first]-loT)*j/first;
    const nu=BINS-1-last;for(let j=1;j<=nu;j++)tr[last+j]=tr[last]+(hiT-tr[last])*j/nu;
  }
  return tr;
}

export function fitChannel(cappedHist){
  const cdf=new Float64Array(BINS);let cs=0;
  for(let i=0;i<BINS;i++){cs+=cappedHist[i];cdf[i]=cs;}
  if(cs>0)for(let i=0;i<BINS;i++)cdf[i]/=cs;
  let first=-1,last=-1;
  for(let i=0;i<BINS;i++){if(cdf[i]>TRIM_EPS){first=i;break;}}
  for(let i=BINS-1;i>=0;i--){if(cdf[i]<1-TRIM_EPS){last=i;break;}}
  const xLo=first>=0?first/(BINS-1):0,xHi=last>=0?last/(BINS-1):1;
  if(first<0||last<=first)return{t:PI_4,s:PI_4,c:.5,g:PI_4,xLo,xHi};
  const trimmed=cdf.slice(first,last+1);
  const lo0=trimmed[0],hi0=trimmed[trimmed.length-1];
  if(hi0>lo0)for(let i=0;i<trimmed.length;i++)trimmed[i]=(trimmed[i]-lo0)/(hi0-lo0);
  const nb=trimmed.length,x=new Float64Array(nb).map((_,i)=>i/Math.max(nb-1,1));
  const bounds={t:[.01,1.37],s:[.20,1.56],c:[.01,.99],g:[.10,1.25]};
  let t=PI_4,s=PI_4,c=.5,g=PI_4;
  let mt=0,ms=0,mc=0,mg=0,vt=0,vs=0,vc=0,vg=0;
  const lr=.01,b1=.9,b2=.999,eps=1e-8,dh=1e-5,steps=500;
  const cl=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  function mse(pt,ps,pc,pg){
    const pred=targetCdf(x,pt,ps,pc,pg);let sum=0;
    for(let i=0;i<nb;i++){const d=pred[i]-trimmed[i];sum+=d*d;}return sum/nb;
  }
  for(let step=1;step<=steps;step++){
    const base=mse(t,s,c,g);
    const gt=(mse(cl(t+dh,...bounds.t),s,c,g)-base)/dh;
    const gs=(mse(t,cl(s+dh,...bounds.s),c,g)-base)/dh;
    const gc=(mse(t,s,cl(c+dh,...bounds.c),g)-base)/dh;
    const gg=(mse(t,s,c,cl(g+dh,...bounds.g))-base)/dh;
    mt=b1*mt+(1-b1)*gt;ms=b1*ms+(1-b1)*gs;mc=b1*mc+(1-b1)*gc;mg=b1*mg+(1-b1)*gg;
    vt=b2*vt+(1-b2)*gt*gt;vs=b2*vs+(1-b2)*gs*gs;vc=b2*vc+(1-b2)*gc*gc;vg=b2*vg+(1-b2)*gg*gg;
    const bc1=1-b1**step,bc2=1-b2**step;
    t=cl(t-lr*(mt/bc1)/(Math.sqrt(vt/bc2)+eps),...bounds.t);
    s=cl(s-lr*(ms/bc1)/(Math.sqrt(vs/bc2)+eps),...bounds.s);
    c=cl(c-lr*(mc/bc1)/(Math.sqrt(vc/bc2)+eps),...bounds.c);
    g=cl(g-lr*(mg/bc1)/(Math.sqrt(vg/bc2)+eps),...bounds.g);
  }
  return{t,s,c,g,xLo,xHi};
}
