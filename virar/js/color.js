export const M1=[.4122214708,.5363325363,.0514459929,.2119034982,.6806995451,.1073969566,.0883024619,.2817188376,.6299787005];
export const M2=[.2104542553,.7936177850,-.0040720468,1.9779984951,-2.4285922050,.4505937099,.0259040371,.7827717662,-.8086757660];
export const M2I=[1,.3963377774,.2158037573,1,-.1055613458,-.0638541728,1,-.0894841775,-1.2914855480];
export const M1I=[4.0767416621,-3.3077115913,.2309699292,-1.2684380046,2.6097574011,-.3413193965,-.0041960863,-.7034186147,1.7076147010];

export function eotf(v){return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}
export function oetf(v){return v<=.0031308?12.92*v:1.055*Math.pow(Math.max(0,v),1/2.4)-.055;}
export function rgbToOklab(r,g,b){
  const l0=M1[0]*r+M1[1]*g+M1[2]*b,m0=M1[3]*r+M1[4]*g+M1[5]*b,s0=M1[6]*r+M1[7]*g+M1[8]*b;
  const l=Math.cbrt(l0),m=Math.cbrt(m0),s=Math.cbrt(s0);
  return[M2[0]*l+M2[1]*m+M2[2]*s,M2[3]*l+M2[4]*m+M2[5]*s,M2[6]*l+M2[7]*m+M2[8]*s];
}
export function oklabToRgb(L,a,b){
  const lg=M2I[0]*L+M2I[1]*a+M2I[2]*b,mg=M2I[3]*L+M2I[4]*a+M2I[5]*b,sg=M2I[6]*L+M2I[7]*a+M2I[8]*b;
  const l=lg*lg*lg,m=mg*mg*mg,s=sg*sg*sg;
  return[M1I[0]*l+M1I[1]*m+M1I[2]*s,M1I[3]*l+M1I[4]*m+M1I[5]*s,M1I[6]*l+M1I[7]*m+M1I[8]*s];
}
