// Brysbaert concreteness joined with Lancaster sensorimotor norms in words.js
function h(s){let x=2166136261;for(const c of s)x=Math.imul(x^c.charCodeAt(0),16777619);return x>>>0}
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let off=0,cur;
function show(){
  const d=new Date();d.setDate(d.getDate()+off);const k=ymd(d),r=rng(h(k));
  let seen=[];try{seen=JSON.parse(localStorage.getItem('dd:'+k))||[]}catch(e){}
  ['objects','scenes','qualities'].forEach((l,i)=>{const a=W[l];document.getElementById('w'+i).textContent=a[Math.floor(r()*a.length)];document.querySelectorAll('.l')[i].classList.toggle('on',seen.includes(i))});
  cur=k;
  document.getElementById('d').textContent=off?k:k+' · today';
}
p.onclick=()=>{off--;show()};n.onclick=()=>{off++;show()};d.onclick=()=>{off=0;show()};
document.querySelectorAll('.l').forEach((el,i)=>el.onclick=()=>{const on=el.classList.toggle('on');let s=[];try{s=JSON.parse(localStorage.getItem('dd:'+cur))||[]}catch(e){}s=s.filter(x=>x!==i);if(on)s.push(i);try{localStorage.setItem('dd:'+cur,JSON.stringify(s))}catch(e){}});
f.textContent=`${W.objects.length} · ${W.scenes.length} · ${W.qualities.length}`;
show();
