// SPDX-License-Identifier: GPL-2.0-or-later
import { topBox, boxes } from './box.js';

function configuration(mp4) {
  // Find hvcC only inside the video sample entry, not by matching arbitrary bytes.
  const moov=topBox(mp4,'moov');
  const children=b=>[...boxes(mp4,b.off+b.hdr,b.off+b.size)];
  for(const trak of children(moov).filter(b=>b.type==='trak')) {
    const mdia=children(trak).find(b=>b.type==='mdia');if(!mdia)continue;
    const minf=children(mdia).find(b=>b.type==='minf');if(!minf)continue;
    const stbl=children(minf).find(b=>b.type==='stbl');if(!stbl)continue;
    const stsd=children(stbl).find(b=>b.type==='stsd');if(!stsd)continue;
    for(const entry of boxes(mp4,stsd.off+stsd.hdr+8,stsd.off+stsd.size))if(entry.type==='hvc1') {
      for(const b of boxes(mp4,entry.off+entry.hdr+78,entry.off+entry.size))if(b.type==='hvcC')return mp4.slice(b.off,b.off+b.size);
    }
  }
  throw Error('compat-encode');
}

export function encodeAuxiliary(rgb,width,height,space,{signal,onProgress=()=>{}}={}) {
  if(!globalThis.crossOriginIsolated||!globalThis.SharedArrayBuffer)return Promise.reject(Error('compat-refresh'));
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./compat-encoder-worker.js',import.meta.url));
    let done=false;
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value);};
    const abort=()=>finish(new DOMException('Cancelled','AbortError'));
    const timer=setTimeout(()=>finish(Error('compat-timeout')),180000);
    worker.onerror=()=>finish(Error('compat-encode'));
    worker.onmessage=({data})=>{
      if(data.stage){onProgress(data.stage);return;}
      if(data.error){finish(Error(data.error));return;}
      try {
        const mp4=data.mp4,hvcC=configuration(mp4),mdat=topBox(mp4,'mdat');
        if((hvcC[9]&31)!==2||(hvcC[25]&7)!==2||(hvcC[26]&7)!==2)throw Error('compat-encode');
        const sample=mp4.slice(mdat.off+mdat.hdr,mdat.off+mdat.size);if(!sample.length)throw Error('compat-encode');
        finish(null,{sample,hvcC});
      } catch(error){finish(error);}
    };
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
    const copy=rgb.slice();worker.postMessage({rgb:copy,width,height,space},[copy.buffer]);
  });
}
