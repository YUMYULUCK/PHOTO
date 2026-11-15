import { loadLibheif } from './decode.js';
import { dimensionsForItem, propertyBoxBytes, irotAngleForItem, imirAxisForItem } from './heif.js';
import { u } from './box.js';

function sourceSpace(data,d) {
  const c=propertyBoxBytes(data,d.props,d.primary,'colr')||propertyBoxBytes(data,d.props,d.primaryTiles[0],'colr');
  if(!c)throw Error('compat-color');
  const type=String.fromCharCode(...c.subarray(8,12));
  if(type==='nclx') { const prim=u(c,12,2),transfer=u(c,14,2);if(transfer!==13&&transfer!==1)throw Error('compat-color');if(prim===12)return 'display-p3';if(prim===1)return 'srgb'; }
  if(type==='prof'||type==='rICC') {
    // ICC descriptions are labels, not executable instructions. Accept only the
    // two RGB spaces implemented by the auxiliary encoder.
    const text=Array.from(c,x=>x?String.fromCharCode(x):'').join('').toLowerCase();
    if(text.includes('display p3')||text.includes('displayp3'))return 'display-p3';
    if(text.includes('srgb'))return 'srgb';
  }
  throw Error('compat-color');
}

export async function createCompatDecoder(data,d,{signal}={}) {
  const [pw,ph]=dimensionsForItem(d.props,d.primary);
  if(!pw||!ph||pw*ph>24_500_000)throw Error('compat-unsupported');
  let canvas,space;
  try {
    space=sourceSpace(data,d);
    const lib=await loadLibheif();if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const decoder=new lib.HeifDecoder(),images=decoder.decode(data);
    if(!images?.length)throw Error('decode');
    try {
      const image=images[0],w=image.get_width(),h=image.get_height();
      if(w*h>24_500_000)throw Error('decode');
      canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{willReadFrequently:true}),pixels=ctx.createImageData(w,h);
      const out=await new Promise((resolve,reject)=>image.display(pixels,x=>x?resolve(x):reject(Error('decode'))));
      ctx.putImageData(out,0,0);
    } finally { for(const image of images)image.free?.(); }
  } catch(error) {
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    // Native Safari decoding is an alternative if libheif cannot decode a newer
    // camera file. Canvas colour-manages to sRGB; the encoder converts to P3.
    const url=URL.createObjectURL(new Blob([data],{type:'image/heic'}));
    try {
      const image=new Image();image.src=url;await image.decode();
      if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>24_500_000)throw Error('decode');
      canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      canvas.getContext('2d',{willReadFrequently:true}).drawImage(image,0,0);space='srgb';
    } catch { throw Error('compat-decode'); }
    finally { URL.revokeObjectURL(url); }
  }
  const angle=irotAngleForItem(data,d.props,d.primary),mirror=imirAxisForItem(data,d.props,d.primary);
  return {
    space,
    async sample(width,height,stored=false) {
      if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
      const out=document.createElement('canvas');out.width=width;out.height=height;
      const ctx=out.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      if(stored) {
        const swap=angle===90||angle===270,sw=swap?canvas.height:canvas.width,sh=swap?canvas.width:canvas.height;
        ctx.scale(width/sw,height/sh);ctx.translate(sw/2,sh/2);
        if(mirror===0)ctx.scale(-1,1);else if(mirror===1)ctx.scale(1,-1);
        ctx.rotate(angle*Math.PI/180);ctx.drawImage(canvas,-canvas.width/2,-canvas.height/2);
      } else ctx.drawImage(canvas,0,0,width,height);
      const pixels=ctx.getImageData(0,0,width,height).data,rgb=new Uint8Array(width*height*3);
      for(let i=0,j=0;i<pixels.length;i+=4){rgb[j++]=pixels[i];rgb[j++]=pixels[i+1];rgb[j++]=pixels[i+2];}
      return rgb;
    },
    dispose(){canvas.width=canvas.height=1;canvas=null;},
  };
}
