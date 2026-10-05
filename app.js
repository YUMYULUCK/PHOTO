import { loadProfile } from "./src/zip.js";
import { patch, selectProfile, VERSION } from "./src/port.js";
import { discoverHeic } from "./src/heif.js";
import { addTexture, hasTexture } from "./src/texture.js";
import { decodeToRgb, loadLibheif } from "./src/decode.js";

const $ = (id) => document.getElementById(id);
const els = {
  drop: $("dropZone"), library: $("libraryButton"), browse: $("browseButton"),
  libraryInput: $("libraryInput"), browseInput: $("browseInput"), queue: $("queue"),
  queueHead: $("queueHead"), queueCount: $("queueCount"), empty: $("emptyState"),
  clear: $("clearButton"), quality: $("qualityToggle"), lang: $("languageButton"),
  qualityHelp: $("qualityHelp"), qualityHelpText: $("qualityHelpText")
};

const COPY = {
  zh: {
    localBadge:"仅在本机处理", navWorkspace:"工作区", navGuide:"使用说明", ribbonLocal:"照片留在设备", ribbonBatch:"支持批量", ribbonCopy:"只输出副本", ribbonOffline:"可离线打开", eyebrow:"给旧照片一个新的编辑入口", title:"把 iPhone 的<br><em>风格调色盘</em>带回旧照片", lede:"选择一张兼容的 HEIC，Photo Palette 会在你的设备上准备好摄影风格与质感颗粒数据。原片不离开设备，输出始终是副本。", metaLocal:"本地处理", metaPixels:"不重编码像素", metaCopy:"保留原片", workspaceTitle:"准备你的照片", stepChoose:"选择", stepCheck:"检查", stepExport:"导出", dropTitle:"拖入 HEIC 照片", dropHint:"或者选择来源。你可以一次加入多张照片。", library:"照片图库", browse:"浏览文件", dropFootnote:"建议使用原始 HEIC 文件；截图、JPEG 和部分 App 导出的副本无法处理。", quality:"智能匹配光线与色调", qualityHelp:"首次开启会下载一个小型解码组件；照片仍只在本机读取。关闭后会使用中性设置，速度更快。", queueKicker:"PROCESS QUEUE", clear:"清空", empty:"还没有加入照片。你的文件不会被上传。", trustLocalTitle:"真正的本地处理", trustLocalBody:"照片字节不会发送到服务器。页面只在需要时加载解码组件。", trustPixelTitle:"保留图像像素", trustPixelBody:"工具改写 HEIC 元数据，尽量避免重新压缩主图像。", trustCopyTitle:"永远输出副本", trustCopyBody:"原片不会被覆盖。处理前请保留一份备份。", compatTitle:"先知道是否兼容", compatBody:"支持 iPhone 拍摄的 HEIC，以及两种常见的照片 tile 布局。没有内嵌缩略图、已转成 JPEG 或被其他 App 重存的文件可能会被拒绝。", phoneTitle:"在 iPhone 上", phoneOne:"先点“照片图库”尝试选择原片。", phoneTwo:"如果被识别成非 HEIC，请从“分享 → 存储到文件”后改用“浏览文件”。", phoneThree:"完成后点“存储到照片”，再在照片 App 中打开副本。", limitsTitle:"你需要知道的限制", limitOne:"这是实验性、非 Apple 官方工具。", limitTwo:"只处理静态 HEIC，不包含实况照片的动态和声音。", limitThree:"输出效果可能和原生机型的微调不完全一致。", statusQueued:"等待处理", statusReading:"正在读取", statusChecking:"正在检查兼容性", statusDecoding:"正在分析光线", statusPatching:"正在准备副本", statusReady:"已完成", statusBadType:"这不是 HEIC / HEIF 文件", statusNoThumb:"没有内嵌缩略图，网页版无法创建；请使用命令行版本", statusTexture:"这张照片已经有质感与颗粒，无需重复处理", statusUnsupported:"暂不支持这张 HEIC（可能是机型布局或文件结构不匹配）", statusDecoder:"解码器加载失败，已改用中性设置", statusDone:"处理完成", detailNative:"保留原有摄影风格", detailTexture:"已添加质感与颗粒", detailMatched:"调色盘已匹配照片", detailNeutral:"已使用中性调色盘", detailDecoder:"解码器未加载，已使用中性设置", download:"下载副本", share:"存储到照片", shareBlocked:"无法打开共享菜单", processError:"处理失败，请保留原片并换一张原始 HEIC 重试", queueCount:(n)=>`${n} 张照片` 
  },
  en: {
    localBadge:"Processed on this device", navWorkspace:"Workspace", navGuide:"Guide", ribbonLocal:"Photos stay here", ribbonBatch:"Batch ready", ribbonCopy:"Copies only", ribbonOffline:"Works offline", eyebrow:"A new edit path for older photos", title:"Bring the iPhone<br><em>style palette</em> to older photos", lede:"Choose a compatible HEIC. Photo Palette prepares Photographic Styles and Texture/Grain data on your device. Originals stay untouched and outputs are always copies.", metaLocal:"Local first", metaPixels:"Pixels preserved", metaCopy:"Copy out", workspaceTitle:"Prepare your photos", stepChoose:"Choose", stepCheck:"Check", stepExport:"Export", dropTitle:"Drop HEIC photos", dropHint:"Or choose a source. You can add multiple photos at once.", library:"Photo Library", browse:"Browse files", dropFootnote:"Use original HEIC files when possible. Screenshots, JPEGs and re-saved copies may be rejected.", quality:"Match light and tone intelligently", qualityHelp:"The first run downloads a small decoder. Photos are still read locally. Turn this off for a faster neutral pass.", queueKicker:"PROCESS QUEUE", clear:"Clear", empty:"No photos yet. Your files are never uploaded.", trustLocalTitle:"Actually local", trustLocalBody:"Photo bytes never go to a server. A decoder is loaded only when needed.", trustPixelTitle:"Pixels stay intact", trustPixelBody:"The tool rewrites HEIC metadata and avoids recompressing the main image.", trustCopyTitle:"Always exports a copy", trustCopyBody:"Originals are never overwritten. Keep a backup before processing.", compatTitle:"Know the limits first", compatBody:"Works with iPhone HEIC files and two common photo tile layouts. Missing thumbnails, JPEG conversions and re-saved copies may be rejected.", phoneTitle:"On iPhone", phoneOne:"Try “Photo Library” first to select the original.", phoneTwo:"If it is detected as non-HEIC, use Share → Save to Files, then choose “Browse files”.", phoneThree:"When ready, choose “Save to Photos”, then open the copy in Photos.", limitsTitle:"A few limits", limitOne:"Experimental, unofficial software; it is not made by Apple.", limitTwo:"Still HEIC only. Live Photo motion and audio are not included.", limitThree:"Results may not match native model adjustments exactly.", statusQueued:"Waiting", statusReading:"Reading", statusChecking:"Checking compatibility", statusDecoding:"Analyzing light", statusPatching:"Preparing copy", statusReady:"Complete", statusBadType:"This is not a HEIC / HEIF file", statusNoThumb:"No embedded thumbnail; the web version cannot create one", statusTexture:"This photo already has Texture/Grain", statusUnsupported:"This HEIC is not supported yet", statusDecoder:"Decoder failed to load; used neutral settings", statusDone:"Processed", detailNative:"Native Photographic Styles preserved", detailTexture:"Texture/Grain added", detailMatched:"Palette matched to image", detailNeutral:"Neutral palette settings", detailDecoder:"Decoder unavailable; neutral settings used", download:"Download copy", share:"Save to Photos", shareBlocked:"Could not open sharing", processError:"Processing failed. Keep the original and try another HEIC", queueCount:(n)=>`${n} photo${n===1?"":"s"}`
  }
};
let lang = "zh";
let profileIndex = null;
let decodeAvailable = null;
let processing = false;
const items = [];
const objectUrls = new Set();

function t(key, ...args) { const value = COPY[lang][key] ?? COPY.zh[key] ?? key; return typeof value === "function" ? value(...args) : value; }
function renderItemStatus(item) { const parts = item.statusParts?.length ? item.statusParts.map((key) => t(key)) : []; item.statusEl.textContent = item.statusDetail || [t(item.statusKey), ...parts].join(" · "); }
function applyCopy() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = lang === "zh" ? "Photo Palette · HEIC 风格工具" : "Photo Palette · HEIC Style Tool";
  document.querySelectorAll("[data-copy]").forEach((node) => { node.innerHTML = t(node.dataset.copy); });
  els.lang.textContent = lang === "zh" ? "EN" : "中文";
  els.queueCount.textContent = t("queueCount", items.length);
  items.forEach((item) => { renderItemStatus(item); if (item.download) item.download.textContent = t("download"); if (item.share) item.share.textContent = t("share"); });
}
function setStep(step) {
  document.querySelectorAll(".step").forEach((node, i) => node.classList.toggle("active", i < step));
}
function sniff(bytes) {
  if (bytes.length > 11 && String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) === "ftyp") {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return /^(hei|mif|msf|avi)/.test(brand) ? "heic" : "iso";
  }
  return "unknown";
}
async function ensureDecode(bytes) {
  if (decodeAvailable !== null) return decodeAvailable;
  try { await loadLibheif(); await decodeToRgb(bytes, { width: 8, height: 8 }); decodeAvailable = true; }
  catch (error) { console.warn("decoder unavailable", error); decodeAvailable = false; }
  return decodeAvailable;
}
async function getProfile(name) {
  if (!profileIndex) profileIndex = await (await fetch("profiles/index.json")).json();
  const entry = profileIndex[name];
  if (!entry) throw new Error("profile unavailable");
  const response = await fetch(`profiles/${entry.file}`);
  if (!response.ok) throw new Error("profile unavailable");
  return loadProfile(new Uint8Array(await response.arrayBuffer()));
}
function makeItem(file) {
  const el = document.createElement("article"); el.className = "queue-item";
  const chip = document.createElement("div"); chip.className = "file-chip"; chip.textContent = "HEIC";
  const info = document.createElement("div"); info.className = "file-info";
  const name = document.createElement("div"); name.className = "file-name"; name.textContent = file.name;
  const status = document.createElement("div"); status.className = "file-status";
  const progress = document.createElement("div"); progress.className = "item-progress";
  info.append(name, status, progress);
  const actions = document.createElement("div"); actions.className = "file-actions";
  el.append(chip, info, actions); els.queue.append(el);
  const item = { file, el, statusEl: status, progress, actions, statusKey:"statusQueued", statusDetail:"", statusParts:[], download:null, share:null, url:null };
  item.set = (key, detail = "", cls = "", parts = []) => { item.statusKey = key; item.statusDetail = detail; item.statusParts = parts; renderItemStatus(item); status.className = `file-status ${cls}`; };
  item.setProgress = (value) => { progress.style.setProperty("--progress", `${value}%`); progress.classList.toggle("visible", value < 100); };
  item.addDownload = (blob, filename) => { item.url = URL.createObjectURL(blob); objectUrls.add(item.url); const a = document.createElement("a"); a.href = item.url; a.download = filename; a.className = "download-link"; a.textContent = t("download"); actions.append(a); item.download = a; };
  item.addShare = (fileToShare) => { const b = document.createElement("button"); b.type = "button"; b.className = "share-button"; b.textContent = t("share"); b.addEventListener("click", async () => { try { await navigator.share({ files:[fileToShare] }); } catch (error) { if (error.name !== "AbortError") b.textContent = t("shareBlocked"); } }); actions.append(b); item.share = b; };
  return item;
}
function refreshQueue() { els.queueHead.hidden = items.length === 0; els.empty.hidden = items.length > 0; els.queueCount.textContent = t("queueCount", items.length); }
async function processItem(item) {
  setStep(2); item.set("statusReading"); item.setProgress(15); await new Promise(requestAnimationFrame);
  try {
    const bytes = new Uint8Array(await item.file.arrayBuffer());
    if (sniff(bytes) !== "heic") { item.set("statusBadType", "", "error"); item.setProgress(100); return; }
    item.set("statusChecking"); item.setProgress(28); const d = discoverHeic(bytes);
    let data, suffix = "_LumaPort.HEIC", details = [];
    if (d.stylesItem !== null) {
      if (hasTexture(d.infos)) { item.set("statusTexture", "", "error"); item.setProgress(100); return; }
      item.set("statusPatching"); item.setProgress(58); ({ data } = addTexture(bytes)); details = ["detailNative", "detailTexture"];
    } else {
      if (d.thumbnail === null) { item.set("statusNoThumb", "", "error"); item.setProgress(100); return; }
      if (!profileIndex) { profileIndex = await (await fetch("profiles/index.json")).json(); }
      const profileName = selectProfile(profileIndex, d.primaryTiles.length, d.hdrTiles.length);
      const profile = await getProfile(profileName);
      const canDecode = els.quality.checked ? await ensureDecode(bytes) : false;
      item.set(canDecode ? "statusDecoding" : "statusPatching"); item.setProgress(canDecode ? 47 : 58); await new Promise(requestAnimationFrame);
      const opts = canDecode ? { decode: decodeToRgb, sceneStats:"target", lightMaps:"target" } : { sceneStats:"donor" };
      const result = await patch(bytes, profile, opts); data = result.data;
      details = [result.report?.decoded ? "detailMatched" : "detailNeutral", result.report?.texture !== "off" ? "detailTexture" : ""];
      details = details.filter(Boolean);
      if (result.report?.decodeError && canDecode) details.push("detailDecoder");
    }
    item.setProgress(88); await new Promise(requestAnimationFrame);
    const outputName = item.file.name.replace(/\.(heic|heif)$/i, "") + suffix;
    const outputFile = new File([data], outputName, { type:"image/heic" });
    if (navigator.canShare?.({ files:[outputFile] })) item.addShare(outputFile);
    item.addDownload(new Blob([data], { type:"image/heic" }), outputName);
    item.set("statusDone", "", "ok", details.filter(Boolean)); item.setProgress(100); setStep(3);
  } catch (error) { console.error(error); item.set("statusUnsupported", "", "error"); item.setProgress(100); }
}
async function runQueue() {
  if (processing) return; processing = true;
  for (const item of items) { if (item.statusKey !== "statusQueued") continue; await processItem(item); }
  processing = false; if (!items.some((item) => item.statusKey === "statusQueued")) setStep(items.some((item) => item.statusKey === "statusDone") ? 3 : 1);
}
function addFiles(fileList) {
  const fresh = [...fileList].filter((file) => !items.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified));
  fresh.forEach((file) => items.push(makeItem(file))); refreshQueue(); if (fresh.length) runQueue();
}
function clearQueue() { items.splice(0).forEach((item) => { if (item.url) { URL.revokeObjectURL(item.url); objectUrls.delete(item.url); } item.el.remove(); }); refreshQueue(); setStep(1); }

els.library.addEventListener("click", () => els.libraryInput.click());
els.browse.addEventListener("click", () => els.browseInput.click());
els.libraryInput.addEventListener("change", () => { addFiles(els.libraryInput.files); els.libraryInput.value = ""; });
els.browseInput.addEventListener("change", () => { addFiles(els.browseInput.files); els.browseInput.value = ""; });
els.drop.addEventListener("click", (event) => { if (event.target.closest("button")) return; els.browseInput.click(); });
els.drop.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); els.browseInput.click(); } });
els.drop.addEventListener("dragover", (event) => { event.preventDefault(); els.drop.classList.add("over"); });
els.drop.addEventListener("dragleave", () => els.drop.classList.remove("over"));
els.drop.addEventListener("drop", (event) => { event.preventDefault(); els.drop.classList.remove("over"); addFiles(event.dataTransfer.files); });
els.clear.addEventListener("click", clearQueue);
els.qualityHelp.addEventListener("click", () => { const open = els.qualityHelpText.hidden; els.qualityHelpText.hidden = !open; els.qualityHelp.setAttribute("aria-expanded", String(open)); });
els.lang.addEventListener("click", () => { lang = lang === "zh" ? "en" : "zh"; applyCopy(); });
window.addEventListener("beforeunload", () => objectUrls.forEach((url) => URL.revokeObjectURL(url)));

applyCopy();
fetch("profiles/index.json").then((response) => response.json()).then((value) => { profileIndex = value; }).catch((error) => console.warn("profiles unavailable", error));
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));



