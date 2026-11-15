// SPDX-License-Identifier: GPL-2.0-or-later
// Pinned FFmpeg/x265 WebAssembly, used ONLY for one small auxiliary image.
// No source photograph or pixel data is sent to the CDN. See NOTICE.md.
const BASE='https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd/';
const HASH={
  'ffmpeg-core.js':'62f5f5f468a37861da12c4581c321bb5ca8ba2f7b776377e08dd2ab72de293f9',
  'ffmpeg-core.worker.js':'97322a227c5f3d5ccfd0d0825890a6deeba137106a09b633ca75cadf49ddd2cb',
  'ffmpeg-core.wasm':'be2c97605366b78f3f13e21b52e81a55a79e1f29c133b03a68ec187b1a2ec41a',
};
async function asset(name) {
  const r=await fetch(BASE+name,{credentials:'omit',cache:'force-cache'});
  if(!r.ok)throw Error('compat-network');
  const b=new Uint8Array(await r.arrayBuffer());
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',b));
  if(Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('')!==HASH[name])throw Error('compat-component');
  return b;
}
function rawLinear(rgb,w,h,space) {
  if(rgb.length!==w*h*3||w%2||h%2)throw Error('compat-encode');
  const y=new Float32Array(w*h),cb=new Float32Array(w*h),cr=new Float32Array(w*h);
  const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
  for(let i=0;i<w*h;i++) {
    let r=linear(rgb[i*3]),g=linear(rgb[i*3+1]),b=linear(rgb[i*3+2]);
    if(space==='srgb') [r,g,b]=[.82259287*r+.17753395*g,.03319951*r+.96678350*g,.01708535*r+.07239572*g+.91030148*b];
    const l=.299*r+.587*g+.114*b;y[i]=l;cb[i]=(b-l)/1.772;cr[i]=(r-l)/1.402;
  }
  const out=new Uint8Array(w*h*3),view=new DataView(out.buffer);let pos=0;
  const put=v=>{view.setUint16(pos,Math.max(0,Math.min(1023,Math.floor(v+.5))),true);pos+=2;};
  for(const v of y)put(1023*v);
  for(const plane of [cb,cr])for(let row=0;row<h;row+=2)for(let x=0;x<w;x+=2) {
    const i=row*w+x;put(512+1023*(plane[i]+plane[i+1]+plane[i+w]+plane[i+w+1])/4);
  }
  return out;
}
self.onmessage=async({data})=>{
  const urls=[];
  try {
    if(!self.crossOriginIsolated||!self.SharedArrayBuffer)throw Error('compat-refresh');
    self.postMessage({stage:'statusCompatLoading'});
    const [js,thread,wasm]=await Promise.all(['ffmpeg-core.js','ffmpeg-core.worker.js','ffmpeg-core.wasm'].map(asset));
    // This exact pinned binary imports a 1 GiB minimum although its static data
    // fit below 32 MiB. Lower ONLY that memory-import limit to 256 MiB, matching
    // the bounded supplied memory. No instructions or codec constants change.
    if(wasm[3457]!==0x80||wasm[3458]!==0x80||wasm[3459]!==1)throw Error('compat-component');
    wasm.set([0x80,0xa0,0],3457);
    if(!WebAssembly.validate(wasm))throw Error('compat-component');
    const blob=b=>{const u=URL.createObjectURL(new Blob([b],{type:'text/javascript'}));urls.push(u);return u;};
    const coreURL=blob(js),workerURL=blob(thread);
    importScripts(coreURL);
    const core=await self.createFFmpegCore({
      mainScriptUrlOrBlob:coreURL+'#'+btoa(JSON.stringify({wasmURL:BASE+'ffmpeg-core.wasm',workerURL})),
      wasmBinary:wasm,INITIAL_MEMORY:268435456,
      wasmMemory:new WebAssembly.Memory({initial:4096,maximum:4096,shared:true}),
    });
    core.setLogger(()=>{});core.setTimeout(90000);
    self.postMessage({stage:'statusCompatEncoding'});
    core.FS.writeFile('aux.yuv',rawLinear(data.rgb,data.width,data.height,data.space));
    core.exec('-y','-v','error','-threads','1','-f','rawvideo','-pixel_format','yuv420p10le',
      '-video_size',`${data.width}x${data.height}`,'-color_range','pc','-colorspace','6',
      '-color_primaries','12','-color_trc','8','-i','aux.yuv','-frames:v','1','-c:v','libx265',
      '-pix_fmt','yuv420p10le','-profile:v','main10','-tag:v','hvc1','-crf','14',
      '-color_primaries','12','-color_trc','8','-colorspace','6','-color_range','pc',
      '-x265-params','info=0:pools=none:frame-threads=1:wpp=0:colorprim=12:transfer=8:colormatrix=6:range=full:log-level=error',
      '-movflags','+faststart','aux.mp4');
    if(core.ret!==0)throw Error('compat-encode');
    const mp4=core.FS.readFile('aux.mp4').slice();
    core.FS.unlink('aux.yuv');core.FS.unlink('aux.mp4');core.reset();
    self.postMessage({mp4},[mp4.buffer]);
  } catch(error) { self.postMessage({error:/^compat-/.test(error.message)?error.message:'compat-encode'}); }
  finally { for(const u of urls)URL.revokeObjectURL(u); }
};
