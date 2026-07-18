function pseudoblue(){
  const xmix=(x,y)=>((x*212281+y*384817)&0x5555555)*.003257328990228013;
  const ymix=(x,y)=>((x*484829+y*112279)&0x5555555)*.002004008016032064;
  const s=6;
  return(x,y)=>{let v=0,a,b;for(let i=0;i<s;++i){b=y;a=1&(x^xmix((x>>=1),(y>>=1)));b=1&(b^ymix(x,y));v=(v<<2)|(a+(b<<1)+1)%4;}return v/(1<<(s<<1));};
}
const bayer4=[[1,9,3,11],[13,5,15,7],[4,12,2,10],[16,8,14,6]];

export function applyDither(data,w,h,algo){
  const n=w*h;
  for(let i=0;i<n;i++){const p=i*4,gray=Math.round(.2126*data[p]+.7152*data[p+1]+.0722*data[p+2]);data[p]=data[p+1]=data[p+2]=gray;}
  if(algo==='threshold'){
    for(let i=0;i<n;i++){const p=i*4,v=data[p]<128?0:255;data[p]=data[p+1]=data[p+2]=v;}
  }else if(algo==='bayer'){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4,mv=bayer4[x%4][y%4]*17,v=(data[p]+(mv-128))<128?0:255;data[p]=data[p+1]=data[p+2]=v;}
  }else if(algo==='bluenoise'){
    const blu=pseudoblue();
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4,v=data[p]>blu(x,y)*255?255:0;data[p]=data[p+1]=data[p+2]=v;}
  }else if(algo==='atkinson'){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const idx=(y*w+x)*4,old=data[idx],nw=old<128?0:255;data[idx]=data[idx+1]=data[idx+2]=nw;
      const qe=Math.floor((old-nw)/8);if(!qe)continue;
      const dist=(dx,dy)=>{if(x+dx>=0&&x+dx<w&&y+dy<h){const ni=((y+dy)*w+(x+dx))*4;data[ni]+=qe;}};
      dist(1,0);dist(2,0);dist(-1,1);dist(0,1);dist(1,1);dist(0,2);
    }
  }else{
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const idx=(y*w+x)*4,old=data[idx],nw=old<128?0:255;data[idx]=data[idx+1]=data[idx+2]=nw;
      const qe=old-nw;
      if(x+1<w)data[idx+4]+=(qe*7)/16;
      if(x-1>=0&&y+1<h)data[idx+w*4-4]+=(qe*3)/16;
      if(y+1<h)data[idx+w*4]+=(qe*5)/16;
      if(x+1<w&&y+1<h)data[idx+w*4+4]+=(qe*1)/16;
    }
  }
}

const bayer8=[[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]];

const SEED_PULL=500; // phantom pixels per seed — attracts centroid without pinning it

function kmeansColors(src,n,k,seeds=[]){
  const rate=Math.max(1,Math.floor(n/50000));
  const samples=[];
  for(let i=0;i<n;i+=rate){const p=i*4;samples.push([src[p],src[p+1],src[p+2]]);}
  // inject phantom pixels so each seed has gravitational pull toward its color
  for(const s of seeds)for(let i=0;i<SEED_PULL;i++)samples.push([s[0],s[1],s[2]]);
  // initialize: seed centroids first at seed colors, then spread remaining across samples
  const ns=Math.min(seeds.length,k);
  const free=k-ns;
  const base=Math.floor((samples.length-seeds.length*SEED_PULL)/Math.max(1,free));
  let cents=seeds.slice(0,ns).map(s=>[s[0],s[1],s[2]]);
  for(let i=0;i<free;i++)cents.push([...samples[Math.min(i*base,samples.length-seeds.length*SEED_PULL-1)]]);
  for(let it=0;it<15;it++){
    const sums=Array.from({length:k},()=>[0,0,0]),counts=new Array(k).fill(0);
    for(const px of samples){
      let best=0,bd=Infinity;
      for(let j=0;j<k;j++){const d=(px[0]-cents[j][0])**2+(px[1]-cents[j][1])**2+(px[2]-cents[j][2])**2;if(d<bd){bd=d;best=j;}}
      sums[best][0]+=px[0];sums[best][1]+=px[1];sums[best][2]+=px[2];counts[best]++;
    }
    for(let j=0;j<k;j++)if(counts[j]>0)cents[j]=[sums[j][0]/counts[j],sums[j][1]/counts[j],sums[j][2]/counts[j]];
  }
  return cents.map(c=>[Math.round(c[0]),Math.round(c[1]),Math.round(c[2])]);
}

function nearest(r,g,b,pal){
  let best=pal[0],bd=Infinity;
  for(const p of pal){const d=(r-p[0])**2+(g-p[1])**2+(b-p[2])**2;if(d<bd){bd=d;best=p;}}
  return best;
}

export function applyQuantize(data,w,h,numColors,ditherMode,seeds=[]){
  const n=w*h,pal=kmeansColors(data,n,numColors,seeds);
  const DF=32;
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const p=(y*w+x)*4;
      let r=data[p],g=data[p+1],b=data[p+2];
      if(ditherMode==='bayer'){const d=(bayer8[y%8][x%8]/64-.5)*DF;r+=d;g+=d;b+=d;}
      const nc=nearest(r,g,b,pal);
      if(ditherMode==='floyd'){
        const er=r-nc[0],eg=g-nc[1],eb=b-nc[2];
        const spread=(dx,dy,f)=>{if(x+dx>=0&&x+dx<w&&y+dy<h){const ni=((y+dy)*w+(x+dx))*4;data[ni]+=er*f;data[ni+1]+=eg*f;data[ni+2]+=eb*f;}};
        spread(1,0,7/16);spread(-1,1,3/16);spread(0,1,5/16);spread(1,1,1/16);
      }
      data[p]=nc[0];data[p+1]=nc[1];data[p+2]=nc[2];
    }
  }
}
