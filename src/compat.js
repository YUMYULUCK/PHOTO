// HEIC compatibility graft: preserve the source graph and all primary/HDR bytes.
// Adapted from Shalielie graft_style_graph (MIT). This path is never used for JPG.
import { box, boxes, topBox, metaChildren, concat, be, u, bytesEqual } from './box.js';
import { discoverHeic, parseIloc, parseIpcoIpma, propertyForItem, propertyBoxBytes,
  dimensionsForItem, extractItem, findItemsByType, irotAngleForItem, imirAxisForItem,
  appendIpcoProperty, addItems, ispeBox, auxcBox, MATTE_URIS, auxUriForItem,
  URI_LINEAR_THUMB, URI_STYLE_DELTA, URI_STYLES } from './heif.js';
import { injectAppleMakerNoteTag } from './exif.js';
import { addTextureItems } from './texture.js';
import { parseBplist, buildBplist } from './bplist.js';
import { applySceneStatistics, applyLightMaps, linearLumaFromRgb, packFloat16LE,
  LIGHTMAP_FLOOR, C_MAP_SLOPE, C_MAP_INTERCEPT, D_MAP_SLOPE, D_MAP_INTERCEPT } from './styles.js';
import { LINEAR_COLR, PIXI10, DELTA_HVCC, DELTA_SAMPLE,
  EMPTY_HVCC, EMPTY_SAMPLE, EMPTY_ISPE, EMPTY_PIXI } from './compat-assets.js';
import { identifyFormat } from './file-format.js';

export const COMPAT_UNSUPPORTED = 'compat-unsupported';
const fail = () => { throw new Error(COMPAT_UNSUPPORTED); };
const refBox = (type, from, to) => box(type, concat([be(from,2),be(to.length,2),...to.map(i=>be(i,2))]));
const utf8 = s => new TextEncoder().encode(s);
const SEMANTIC_XMP = utf8('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:s="http://ns.apple.com/semanticSegmentationMatte/1.0/"><s:SemanticSegmentationMatteVersion>65536</s:SemanticSegmentationMatteVersion></rdf:Description></rdf:RDF></x:xmpmeta>');
const PORTRAIT_XMP = utf8('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:a="http://ns.apple.com/pixeldatainfo/1.0/" xmlns:p="http://ns.apple.com/portraitEffectsMatte/1.0/"><a:AuxiliaryImageSubType>portraiteffectsmatte</a:AuxiliaryImageSubType><a:NativeFormat>1278226488</a:NativeFormat><a:AuxiliaryImageType>depth</a:AuxiliaryImageType><a:StoredFormat>1278226488</a:StoredFormat><p:PortraitEffectsMatteVersion>65537</p:PortraitEffectsMatteVersion></rdf:Description></rdf:RDF></x:xmpmeta>');

export function compatibleGeometry(d) {
  const [w,h] = dimensionsForItem(d.props,d.primary);
  if (!w || !h || w*h>24_500_000 || !d.hdrTiles.length || d.exifItem===null) return null;
  const ratio=Math.max(w,h)/Math.min(w,h);
  if (ratio<1.30 || ratio>1.37 || d.primaryTiles.length>100 || d.hdrTiles.length>32) return null;
  // Use calibrated native geometries, including the portrait geometry that
  // corrected the broad green cast in the user's nonstandard 2045x2729 sample.
  const long=Math.max(w,h);
  const geometry=long>4032?[4096,3072]:[2880,2160];
  return w>=h?geometry:geometry.slice().reverse();
}

export function canRebuild(data,d=discoverHeic(data)) {
  if (!['heic','heif'].includes(identifyFormat(data)) || d.stylesItem!==null) return false;
  const l=d.iloc;
  return !!compatibleGeometry(d) && l.version===1 && l.offsetSize===4 && l.lengthSize===4 &&
    l.baseOffsetSize===0 && l.indexSize===0 && !(d.props.flags&1) &&
    d.primaryTiles.every(i=>d.infos.get(i)?.type==='hvc1') && d.hdrTiles.every(i=>d.infos.get(i)?.type==='hvc1') &&
    [...l.items.values()].every(i=>i.constructionMethod===0||i.constructionMethod===1);
}

function appendReference(meta,type,from,to) {
  const m=topBox(meta,'meta');
  const children=metaChildren(meta,m);const r=children.find(b=>b.type==='iref');
  if(!r||meta[r.off+r.hdr]!==0)fail();
  return box('meta',concat([meta.subarray(m.off+m.hdr,m.off+m.hdr+4),...children.map(b=>
    b.type==='iref'?box('iref',concat([meta.subarray(r.off+r.hdr,r.off+r.size),refBox(type,from,to)])):meta.subarray(b.off,b.off+b.size))]));
}

function gridInIdat(meta,iid,payload) {
  const m=topBox(meta,'meta');const idat=metaChildren(meta,m).find(b=>b.type==='idat');
  const l=parseIloc(meta,m);const item=l.items.get(iid);
  if(!idat||idat.hdr!==8||m.hdr!==8||item.constructionMethod!==0||item.extents.length!==1)fail();
  const e=item.extents[0];const out=meta.slice();
  // New addItems entries use the verified v1 narrow ID/one-extent layout.
  out[e.offsetPos-5]=1;
  out.set(be(idat.size-idat.hdr,4),e.offsetPos);out.set(be(payload.length,4),e.lengthPos);
  const end=idat.off+idat.size;
  const result=concat([out.subarray(0,end),payload,out.subarray(end)]);
  result.set(be(idat.size+payload.length,4),idat.off);result.set(be(m.size+payload.length,4),m.off);
  return result;
}

function styleBrands(data) {
  const f=topBox(data,'ftyp');if(f.off!==0)fail();
  const brands=[];for(let i=f.off+16;i<f.off+f.size;i+=4)brands.push(String.fromCharCode(...data.subarray(i,i+4)));
  for(const b of ['MiHA','heix'])if(!brands.includes(b))brands.push(b);
  return box('ftyp',concat([data.subarray(8,16),...brands.map(utf8)]));
}

export function rebuildPreserving(data,d,ftyp,meta,payloads) {
  const f=topBox(data,'ftyp'),m=d.meta;
  if(f.off!==0||m.off<f.size)fail();
  const head=concat([ftyp,data.subarray(f.size,m.off)]),tail=data.subarray(m.off+m.size);
  const shift=(ftyp.length-f.size)+(meta.length-m.size);
  const out=meta.slice(),nl=parseIloc(out,topBox(out,'meta'));
  let cursor=head.length+out.length+tail.length+8;const extra=[];
  for(const [iid,it] of nl.items) {
    if(it.constructionMethod!==0||!it.extents.length)continue;
    if(payloads.has(iid)) {
      if(it.extents.length!==1)fail();const p=payloads.get(iid),e=it.extents[0];
      out.set(be(cursor,4),e.offsetPos);out.set(be(p.length,4),e.lengthPos);extra.push(p);cursor+=p.length;
    } else {
      const old=d.iloc.items.get(iid);if(!old)fail();
      old.extents.forEach((e,i)=>{if(e.offset<m.off+m.size)fail();out.set(be(e.offset+shift,4),it.extents[i].offsetPos);});
    }
  }
  if(cursor>=2**32)fail();
  const result=concat([head,out,tail,box('mdat',concat(extra))]);
  const check=discoverHeic(result);
  for(const [iid,it] of d.iloc.items)if(it.constructionMethod===0&&!payloads.has(iid))
    if(!bytesEqual(extractItem(data,d.iloc,iid),extractItem(result,check.iloc,iid)))throw Error('compat-integrity');
  for(const [iid,p] of payloads)if(!bytesEqual(p,extractItem(result,check.iloc,iid)))throw Error('compat-integrity');
  return result;
}

/** decode(width,height,stored) returns RGB numbers in the source/display colour space.
 * encode returns a real Main10 length-prefixed HEVC sample plus its hvcC.
 * Only the small auxiliary image is encoded. Source primary/HDR are never encoded.
 */
export async function rebuildStyles(data,profile,{decode,encode,quality=true,onProgress=()=>{},signal}={}) {
  const d=discoverHeic(data);if(!canRebuild(data,d))fail();
  const abort=()=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError');};abort();
  const [pw,ph]=dimensionsForItem(d.props,d.primary),portrait=pw<ph;
  const width=portrait?768:1024,height=portrait?1024:768;
  onProgress('statusCompatDecoding');const rgb=await decode(width,height,true);abort();
  onProgress('statusCompatEncoding');const linear=await encode(rgb,width,height);abort();
  if(!linear?.sample?.length||!linear?.hvcC?.length)throw Error('compat-encode');
  const [dw,dh]=compatibleGeometry(d),cols=Math.ceil(dw/512),rows=Math.ceil(dh/512);
  let meta=data.slice(d.meta.off,d.meta.off+d.meta.size);const payloads=new Map();
  const targets=[d.primary,...findItemsByType(d.infos,'tmap').slice(0,1)];
  const rotation=propertyForItem(d.props,d.primary,'irot');const rot=rotation?[[rotation.index,true]]:[];
  const append=b=>{let i;[meta,i]=appendIpcoProperty(meta,b);return i;};
  const colr=append(LINEAR_COLR),pixi=append(PIXI10),deltaIspe=append(ispeBox(dw,dh));
  const deltaAux=append(auxcBox(URI_STYLE_DELTA)),tileIspe=append(ispeBox(512,512)),deltaHvcc=append(DELTA_HVCC);
  const ltIspe=append(ispeBox(width,height)),ltAux=append(auxcBox(URI_LINEAR_THUMB)),ltHvcc=append(linear.hvcC);
  let lt,tiles,grid,styles;
  [meta,lt]=addItems(meta,[{key:'lt',refType:'auxl',refTo:targets,reuse:[[colr,true],[ltIspe,false],[pixi,false],[ltAux,true],[ltHvcc,true],...rot]}]);
  [meta,tiles]=addItems(meta,Array.from({length:rows*cols},(_,i)=>({key:`tile${i}`,reuse:[[tileIspe,true],[colr,true],[deltaHvcc,true]]})));
  [meta,grid]=addItems(meta,[{key:'grid',itemType:'grid',refType:'auxl',refTo:targets,reuse:[[colr,true],[deltaIspe,false],[pixi,false],[deltaAux,true],...rot]}]);
  const gids=[...tiles.values()];meta=appendReference(meta,'dimg',grid.get('grid'),gids);
  meta=gridInIdat(meta,grid.get('grid'),concat([new Uint8Array([0,0,rows-1,cols-1]),be(dw,2),be(dh,2)]));
  [meta,styles]=addItems(meta,[{key:'styles',itemType:'uri ',itemName:'metadata',contentType:URI_STYLES,refType:'cdsc',refTo:targets}]);
  payloads.set(lt.get('lt'),linear.sample);gids.forEach(i=>payloads.set(i,DELTA_SAMPLE));
  let blob=profile.retained.get(Number(profile.manifest.donor_styles_item));
  if(!blob)fail();
  if(quality) {
    onProgress('statusDecoding');
    const sorted=Array.from(linearLumaFromRgb(await decode(256,192,false))).sort((a,b)=>a-b);abort();
    [blob]=applySceneStatistics(blob,'target',sorted);
    const luma=linearLumaFromRgb(await decode(32,32,true));abort();
    // Native maps follow stored orientation; keep the older donor pipeline's
    // calibrated behaviour unchanged and correct orientation only on this path.
    const map=(s,i)=>packFloat16LE(Array.from(luma,v=>Math.max(LIGHTMAP_FLOOR,Math.min(1,s*v+i))));
    [blob]=applyLightMaps(blob,map(C_MAP_SLOPE,C_MAP_INTERCEPT),map(D_MAP_SLOPE,D_MAP_INTERCEPT));
  }
  const pl=parseBplist(blob);pl.set('0',16);pl.set('k',false);blob=buildBplist(pl);
  payloads.set(styles.get('styles'),blob);
  payloads.set(d.exifItem,injectAppleMakerNoteTag(extractItem(data,d.iloc,d.exifItem),profile.mn54,0x54,Number(profile.manifest.smartstyle_makernote_type??7)));
  let texture,newPayloads;[meta,newPayloads,texture]=addTextureItems(meta,d.primary);
  for(const [i,p] of newPayloads)payloads.set(i,p);

  // Native style graphs have these legacy slots even when no subject is known.
  // Supply verified empty masks, not another photo's masks or invented people.
  const missing=[MATTE_URIS.semanticskymatte,MATTE_URIS.semanticskinmatte,MATTE_URIS.portraiteffectsmatte]
    .filter(uri=>![...d.infos.keys()].some(i=>auxUriForItem(d.props,i)===uri));
  if(missing.length) {
    const mi=append(EMPTY_ISPE),mp=append(EMPTY_PIXI),mh=append(EMPTY_HVCC);
    const specs=missing.map(uri=>{const a=append(auxcBox(uri));return{key:uri,refType:'auxl',refTo:targets,reuse:[[mi,false],[mp,false],[a,true],[mh,true],...rot]};});
    let masks,sides;[meta,masks]=addItems(meta,specs);
    for(const i of masks.values())payloads.set(i,EMPTY_SAMPLE);
    [meta,sides]=addItems(meta,missing.map(uri=>({key:uri,itemType:'mime',contentType:'application/rdf+xml',refType:'cdsc',refTo:[masks.get(uri)]})));
    for(const [uri,i] of sides)payloads.set(i,uri===MATTE_URIS.portraiteffectsmatte?PORTRAIT_XMP:SEMANTIC_XMP);
  }
  abort();onProgress('statusCompatAssembling');
  const result=rebuildPreserving(data,d,styleBrands(data),meta,payloads);
  return {data:result,report:{mode:'compatibility',primaryReencoded:false,hdrReencoded:false,texture,sceneMatched:quality,neutralLegacyMasks:missing.length,deltaSize:[dw,dh],edgeCaution:(pw%2!==0||ph%2!==0)}};
}
