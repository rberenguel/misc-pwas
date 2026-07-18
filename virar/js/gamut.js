import { oklabToRgb } from './color.js';

const NL=256,NH=360;
let gamutLut=null;

export function buildGamutLut(){
  const ch=new Float32Array(NH),sh=new Float32Array(NH);
  for(let j=0;j<NH;j++){const h=j*2*Math.PI/NH;ch[j]=Math.cos(h);sh[j]=Math.sin(h);}
  const lo=new Float32Array(NL*NH),hi=new Float32Array(NL*NH).fill(.5);
  for(let it=0;it<20;it++){
    for(let i=0;i<NL;i++){
      const L=i/(NL-1),row=i*NH;
      for(let j=0;j<NH;j++){
        const k=row+j,mid=(lo[k]+hi[k])*.5;
        const[r,g,b]=oklabToRgb(L,mid*ch[j],mid*sh[j]);
        if(r>=-1e-6&&r<=1+1e-6&&g>=-1e-6&&g<=1+1e-6&&b>=-1e-6&&b<=1+1e-6)lo[k]=mid;else hi[k]=mid;
      }
    }
  }
  gamutLut=lo;
}

export function isGamutReady(){return gamutLut!==null;}

export function gamutMax(L,h){
  const liF=Math.min(Math.max(L,0),1)*(NL-1),hiF=h*NH/(2*Math.PI);
  const li0=Math.min(Math.floor(liF),NL-2),li1=li0+1,fl=liF-li0;
  let hi0=((Math.floor(hiF)%NH)+NH)%NH;const hi1=(hi0+1)%NH,fh=hiF-Math.floor(hiF);
  const r0=li0*NH,r1=li1*NH;
  return gamutLut[r0+hi0]*(1-fl)*(1-fh)+gamutLut[r0+hi1]*(1-fl)*fh+gamutLut[r1+hi0]*fl*(1-fh)+gamutLut[r1+hi1]*fl*fh;
}
