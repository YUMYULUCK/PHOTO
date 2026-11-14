import { loadProfile } from "./src/zip.js";
import { patch, selectProfile, UNSUPPORTED } from "./src/port.js";
import { discoverHeic } from "./src/heif.js";
import { addTexture, hasTexture } from "./src/texture.js";
import { decodeToRgb, loadLibheif } from "./src/decode.js";

import { identifyFormat } from "./src/file-format.js";

const $ = (id) => document.getElementById(id);
const els = {
  drop: $("dropZone"), library: $("libraryButton"), browse: $("browseButton"),
  libraryInput: $("libraryInput"), browseInput: $("browseInput"), queue: $("queue"),
  queueHead: $("queueHead"), queueCount: $("queueCount"), empty: $("emptyState"),
  clear: $("clearButton"), quality: $("qualityToggle"), lang: $("languageButton"),
  qualityHelp: $("qualityHelp"), qualityHelpText: $("qualityHelpText"),
  originalHelp: $("originalHelp"), updateNotice: $("updateNotice")
};

const COPY = {
  zh: {
    brandName:"照片调色盘",
    brandHome:"照片调色盘首页",
    documentTitle:"照片调色盘 · HEIC 摄影风格工具",
    dropHint:"也可拖入 HEIC 文件，一次加入多张照片。",
    eyebrow:"为你的照片而作",
    title:"旧照片。<br><em>新的表达。</em>",
    lede:"把 iPhone 摄影风格带回你的照片。<br>保留原片，让灵感继续。",
    workspaceTitle:"准备你的照片",
    libraryHint:"自动识别实际格式 · 支持批量",
    browseHint:"iPhone：照片 → 分享 → 选项 → 当前 → 存储到文件。",
    dropFootnote:"相册可能提供转换后的 JPG。我们会检查实际格式，仅处理兼容的 HEIC 原片。",
    queueKicker:"处理队列",
    detailsTitle:"使用说明与兼容范围",
    footerLocal:"照片不上传",
    footerOriginal:"保留原片",
    footerCopy:"输出副本",
    authorLabel:"作者",
    sourceLink:"源代码",
    creditsLink:"开源致谢",
    textureCompatibility:"iOS 27 才能看到质感 / 颗粒",
    guideNote:"已存到“文件”的 HEIC 原片，可直接从文件导入。",
    noscript:"照片调色盘需要启用 JavaScript 才能在本机处理 HEIC 文件。照片不会上传。",
    library:"从相册选择",
    browse:"从文件导入",
    phoneOne:"先点“从相册选择”尝试选择 HEIC 原片。",
    phoneTwo:"如果得到 JPG，按工作区“获取原始 HEIC 的方法”保存到文件，再用“从文件导入”重试。",
    statusJpeg:"当前照片以 JPG 格式导入",
    statusJpegHelp:"可能是 iPhone 在选择照片时进行了格式转换，也可能原片本来就是 JPG。本工具需要兼容的 HEIC 原片，当前文件未被处理。",
    statusPng:"当前照片以 PNG 格式导入",
    statusPngHelp:"PNG（例如截图）不包含本工具所需的 HEIC 结构，当前文件未被处理。请选择原始 HEIC 照片。",
    statusAvif:"当前文件是 AVIF，暂不支持",
    statusAvifHelp:"AVIF 与 HEIC 使用不同编码，不能进入 HEIC 摄影风格元数据处理流程。",
    statusIso:"当前文件是其他媒体容器，暂不支持",
    statusIsoHelp:"文件头未声明支持的 HEIC / HEIF 品牌，可能是视频或其他媒体文件。请选择原始 HEIC 照片。",
    statusMalformed:"文件头不完整或已损坏",
    statusMalformedHelp:"无法读取有效的 HEIC / HEIF 文件类型信息。请重新获取完整原片。",
    statusEmpty:"当前文件为空",
    statusEmptyHelp:"文件没有可读取的内容。请等待原片下载完成后重新导入。",
    statusBadTypeHelp:"文件内容未识别为 HEIC / HEIF、JPEG 或 PNG。仅支持兼容的 HEIC 原片，修改扩展名不会改变实际格式。",
    statusUnsupportedHelp:"已识别 HEIC / HEIF，但内部结构损坏或不在当前支持范围（例如 tile 布局、缩略图或元数据不匹配）。请尝试重新获取 iPhone 原片。",
    formatPending:"正在识别实际格式",
    formatUnknown:"无法识别",
    formatEmpty:"空文件",
    formatMalformed:"损坏的文件头",
    formatLabel:"实际格式",
    retryLibrary:"重新从相册选择",
    showOriginalHelp:"查看获取原始 HEIC 的方法",
    originalHelpTitle:"获取原始 HEIC 的方法",
    originalStep1:"打开 iPhone 照片 App。",
    originalStep2:"选择原始照片，点击分享。",
    originalStep3:"在分享“选项”中优先选择“当前”格式，而非“最兼容”。",
    originalStep4:"选择“存储到文件”，保存到“文件”App。",
    originalStep5:"返回 照片调色盘，点击下方“浏览文件”导入。",
    originalWarning:"如果仍得到 JPG，原片可能不是 HEIC。修改后缀无法恢复 HEIC 编码或摄影风格元数据；请保留原片。不同 iOS 版本的选项名称和位置可能不同。",
    browseOriginal:"浏览文件",
    updateAvailable:"新版已就绪。刷新后使用更新；刷新会清空当前队列，请先下载已完成的副本。",
    refreshApp:"刷新使用新版",
    localBadge:"仅在本机处理", navWorkspace:"工作区", navGuide:"使用说明", ribbonLocal:"照片留在设备", ribbonBatch:"支持批量", ribbonCopy:"只输出副本", ribbonOffline:"可离线打开", metaLocal:"本地处理", metaPixels:"不重编码像素", metaCopy:"保留原片", stepChoose:"选择", stepCheck:"检查", stepExport:"导出", dropTitle:"拖入 HEIC 照片", quality:"智能匹配光线与色调", qualityHelp:"首次开启会下载一个小型解码组件；照片仍只在本机读取。关闭后会使用中性设置，速度更快。", clear:"清空", empty:"还没有加入照片。你的文件不会被上传。", trustLocalTitle:"真正的本地处理", trustLocalBody:"照片字节不会发送到服务器。页面只在需要时加载解码组件。", trustPixelTitle:"保留图像像素", trustPixelBody:"工具改写 HEIC 元数据，尽量避免重新压缩主图像。", trustCopyTitle:"永远输出副本", trustCopyBody:"原片不会被覆盖。处理前请保留一份备份。", compatTitle:"先知道是否兼容", compatBody:"支持 iPhone 拍摄的 HEIC，以及两种常见的照片 tile 布局。没有内嵌缩略图、已转成 JPEG 或被其他 App 重存的文件可能会被拒绝。", phoneTitle:"在 iPhone 上", phoneThree:"完成后点“存储到照片”，再在照片 App 中打开副本。", limitsTitle:"你需要知道的限制", limitOne:"这是实验性、非 Apple 官方工具。", limitTwo:"只处理静态 HEIC，不包含实况照片的动态和声音。", limitThree:"输出效果可能和原生机型的微调不完全一致。", statusQueued:"等待处理", statusReading:"正在读取", statusChecking:"正在检查兼容性", statusDecoding:"正在分析光线", statusPatching:"正在准备副本", statusReady:"已完成", statusBadType:"这不是 HEIC / HEIF 文件", statusNoThumb:"没有内嵌缩略图，网页无法创建副本", statusNoThumbHelp:"这份 HEIC 缺少网页端创建副本所需的缩略图。请从 iPhone 照片 App 重新导出原片；如果仍失败，需要在电脑使用命令行版本。", statusTexture:"这张照片已经有质感与颗粒，无需重复处理", statusTextureHelp:"文件已经包含质感/颗粒数据，不需要重复处理。可直接使用原片，或换一张还没有处理过的 HEIC。", statusUnsupported:"暂不支持这张 HEIC（可能是机型布局或文件结构不匹配）", statusDecoder:"解码器加载失败，已改用中性设置", statusDone:"处理完成", detailNative:"保留原有摄影风格", detailTexture:"已添加质感与颗粒", detailMatched:"调色盘已匹配照片", detailNeutral:"已使用中性调色盘", detailDecoder:"解码器未加载，已使用中性设置", download:"下载副本", share:"存储到照片", shareBlocked:"无法打开共享菜单", processError:"处理失败，请保留原片并换一张原始 HEIC 重试", processErrorHelp:"请保留原片，先关闭“智能匹配光线与色调”再试；若仍失败，换用原始 HEIC。", queueCount:(n)=>`${n} 张照片` 
  },
  en: {
    brandName:"Photo Palette",
    brandHome:"Photo Palette home",
    documentTitle:"Photo Palette · HEIC Style Tool",
    dropHint:"Or drop HEIC files here. Add several at once.",
    eyebrow:"MADE FOR YOUR PHOTOS",
    title:"Old photos.<br><em>New possibilities.</em>",
    lede:"Bring iPhone Photographic Styles to your photos.<br>Keep the original. Keep creating.",
    workspaceTitle:"Prepare your photos",
    libraryHint:"Actual format detection · Batch ready",
    browseHint:"On iPhone: Photos → Share → Options → Current → Save to Files.",
    dropFootnote:"Photos may provide a converted JPG. We check the actual format and only process compatible original HEIC files.",
    queueKicker:"PROCESS QUEUE",
    detailsTitle:"Guide and compatibility",
    footerLocal:"Photos stay here",
    footerOriginal:"Originals preserved",
    footerCopy:"Copies only",
    authorLabel:"Author",
    sourceLink:"Source code",
    creditsLink:"Open-source credits",
    textureCompatibility:"Texture / Grain controls require iOS 27",
    guideNote:"Use Import from Files for an original HEIC already saved in Files.",
    noscript:"Enable JavaScript to process HEIC files on this device. Photos are never uploaded.",
    library:"Choose from Photos",
    browse:"Import from Files",
    phoneOne:"Try “Choose from Photos” to select an original HEIC.",
    phoneTwo:"If you receive a JPG, follow “How to get the original HEIC” in the workspace, save it to Files, then use “Import from Files”.",
    statusJpeg:"This photo was imported as JPG",
    statusJpegHelp:"iPhone may have converted the photo during selection, or the original may already be JPG. This tool requires a compatible original HEIC; this file has not been processed.",
    statusPng:"This photo was imported as PNG",
    statusPngHelp:"PNG files (such as screenshots) do not contain the HEIC structure this tool requires. This file has not been processed. Choose an original HEIC photo.",
    statusAvif:"This file is AVIF and is not supported",
    statusAvifHelp:"AVIF uses a different codec and cannot enter the HEIC Photographic Styles metadata pipeline.",
    statusIso:"This media container is not supported",
    statusIsoHelp:"The file header does not declare a supported HEIC / HEIF brand. It may be video or another media format. Choose an original HEIC photo.",
    statusMalformed:"The file header is incomplete or damaged",
    statusMalformedHelp:"No valid HEIC / HEIF file-type information could be read. Obtain the complete original again.",
    statusEmpty:"This file is empty",
    statusEmptyHelp:"There are no bytes to read. Wait for the original to finish downloading, then import it again.",
    statusBadTypeHelp:"The contents were not recognized as HEIC / HEIF, JPEG or PNG. Only compatible original HEIC files are supported. Changing the extension does not change the actual format.",
    statusUnsupportedHelp:"HEIC / HEIF was detected, but its structure is damaged or unsupported (for example tile layout, thumbnail or metadata). Try obtaining the iPhone original again.",
    formatPending:"Detecting actual format",
    formatUnknown:"Unrecognized",
    formatEmpty:"Empty file",
    formatMalformed:"Damaged header",
    formatLabel:"Actual format",
    retryLibrary:"Choose from Photos again",
    showOriginalHelp:"How to get the original HEIC",
    originalHelpTitle:"How to get the original HEIC",
    originalStep1:"Open the Photos app on iPhone.",
    originalStep2:"Select the original photo and tap Share.",
    originalStep3:"In sharing Options, prefer “Current” format instead of “Most Compatible”.",
    originalStep4:"Choose “Save to Files” and save it in the Files app.",
    originalStep5:"Return to Photo Palette and tap “Browse files” below to import it.",
    originalWarning:"If the file is still JPG, the original may not be HEIC. Renaming the extension cannot restore HEIC encoding or Photographic Styles metadata. Keep the original. Option names and locations may vary by iOS version.",
    browseOriginal:"Browse files",
    updateAvailable:"An update is ready. Refresh to use it; refreshing clears this queue, so download completed copies first.",
    refreshApp:"Refresh to update",
    localBadge:"Processed on this device", navWorkspace:"Workspace", navGuide:"Guide", ribbonLocal:"Photos stay here", ribbonBatch:"Batch ready", ribbonCopy:"Copies only", ribbonOffline:"Works offline", metaLocal:"Local first", metaPixels:"Pixels preserved", metaCopy:"Copy out", stepChoose:"Choose", stepCheck:"Check", stepExport:"Export", dropTitle:"Drop HEIC photos", quality:"Match light and tone intelligently", qualityHelp:"The first run downloads a small decoder. Photos are still read locally. Turn this off for a faster neutral pass.", clear:"Clear", empty:"No photos yet. Your files are never uploaded.", trustLocalTitle:"Actually local", trustLocalBody:"Photo bytes never go to a server. A decoder is loaded only when needed.", trustPixelTitle:"Pixels stay intact", trustPixelBody:"The tool rewrites HEIC metadata and avoids recompressing the main image.", trustCopyTitle:"Always exports a copy", trustCopyBody:"Originals are never overwritten. Keep a backup before processing.", compatTitle:"Know the limits first", compatBody:"Works with iPhone HEIC files and two common photo tile layouts. Missing thumbnails, JPEG conversions and re-saved copies may be rejected.", phoneTitle:"On iPhone", phoneThree:"When ready, choose “Save to Photos”, then open the copy in Photos.", limitsTitle:"A few limits", limitOne:"Experimental, unofficial software; it is not made by Apple.", limitTwo:"Still HEIC only. Live Photo motion and audio are not included.", limitThree:"Results may not match native model adjustments exactly.", statusQueued:"Waiting", statusReading:"Reading", statusChecking:"Checking compatibility", statusDecoding:"Analyzing light", statusPatching:"Preparing copy", statusReady:"Complete", statusBadType:"This is not a HEIC / HEIF file", statusNoThumb:"No embedded thumbnail; the web version cannot create a copy", statusNoThumbHelp:"This HEIC is missing the thumbnail needed by the web version. Export the original again from Photos; if it still fails, use the desktop command-line version.", statusTexture:"This photo already has Texture/Grain", statusTextureHelp:"This file already contains Texture/Grain data. Keep the original, or choose an HEIC that has not been processed yet.", statusUnsupported:"This HEIC is not supported yet", statusDecoder:"Decoder failed to load; used neutral settings", statusDone:"Processed", detailNative:"Native Photographic Styles preserved", detailTexture:"Texture/Grain added", detailMatched:"Palette matched to image", detailNeutral:"Neutral palette settings", detailDecoder:"Decoder unavailable; neutral settings used", download:"Download copy", share:"Save to Photos", shareBlocked:"Could not open sharing", processError:"Processing failed. Keep the original and try another HEIC", processErrorHelp:"Keep the original, turn off smart light matching, and try again. If it still fails, choose an original HEIC.", queueCount:(n)=>`${n} photo${n===1?"":"s"}`
  }
};
let lang = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "zh";
let profileIndex = null;
let decodeAvailable = null;
let processing = false;
const items = [];
const objectUrls = new Set();

function t(key, ...args) { const value = COPY[lang][key] ?? COPY.zh[key] ?? key; return typeof value === "function" ? value(...args) : value; }
function renderItemStatus(item) { renderItemFormat(item); const parts = item.statusParts?.length ? item.statusParts.map((key) => t(key)) : []; item.statusEl.textContent = item.statusDetail || [t(item.statusKey), ...parts].join(" · "); const helpKey = item.helpKey || `${item.statusKey}Help`; const help = COPY[lang][helpKey] ? t(helpKey) : ""; item.helpEl.textContent = help; item.helpEl.hidden = !help; }
function applyCopy() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = t("documentTitle");
  $("appManifest").href = (lang === "en" ? "manifest-en.webmanifest" : "manifest.webmanifest") + "?v=20261115-3";
  document.querySelector('meta[property="og:title"]').content = t("documentTitle");
  document.querySelector(".brand").setAttribute("aria-label", t("brandHome"));
  els.lang.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换到中文");
  document.querySelectorAll("[data-copy]").forEach((node) => { node.innerHTML = t(node.dataset.copy); });
  els.lang.textContent = lang === "zh" ? "EN" : "中文";
  els.queueCount.textContent = t("queueCount", items.length);
  items.forEach((item) => { renderItemStatus(item); if (item.download) item.download.textContent = t("download"); if (item.share) item.share.textContent = t("share"); });
}
function setStep(step) {
  document.querySelectorAll(".step").forEach((node, i) => node.classList.toggle("active", i < step));
}
function renderItemFormat(item) {
  const labels = { heic:"HEIC", heif:"HEIF", jpeg:"JPEG", png:"PNG", avif:"AVIF", iso:"ISO BMFF" };
  const key = { unknown:"formatUnknown", empty:"formatEmpty", malformed:"formatMalformed" }[item.format];
  item.chip.textContent = labels[item.format] || (item.format ? "?" : "…");
  item.formatEl.textContent = item.format ? `${t("formatLabel")}: ${labels[item.format] || t(key)}` : t("formatPending");
}
function showOriginalHelp() {
  els.originalHelp.open = true;
  els.originalHelp.scrollIntoView({ behavior:"smooth", block:"nearest" });
  els.originalHelp.querySelector("summary").focus({ preventScroll:true });
}
function addImportHelp(item) {
  for (const [key, onClick] of [["retryLibrary", () => els.libraryInput.click()], ["showOriginalHelp", showOriginalHelp]]) {
    const button = document.createElement("button");
    button.type = "button"; button.className = "share-button";
    button.dataset.copy = key; button.textContent = t(key);
    button.addEventListener("click", onClick); item.actions.append(button);
  }
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
  const chip = document.createElement("div"); chip.className = "file-chip"; chip.textContent = "…";
  const info = document.createElement("div"); info.className = "file-info";
  const name = document.createElement("div"); name.className = "file-name"; name.textContent = file.name;
  const formatEl = document.createElement("div"); formatEl.className = "file-format";
  const status = document.createElement("div"); status.className = "file-status";
  const help = document.createElement("div"); help.className = "file-help"; help.hidden = true;
  const progress = document.createElement("div"); progress.className = "item-progress";
  info.append(name, formatEl, status, help, progress);
  const actions = document.createElement("div"); actions.className = "file-actions";
  el.append(chip, info, actions); els.queue.append(el);
  const item = { file, el, chip, formatEl, format:null, cancelled:false, statusEl: status, helpEl: help, progress, actions, statusKey:"statusQueued", statusDetail:"", statusParts:[], helpKey:"", download:null, share:null, url:null };
  item.set = (key, detail = "", cls = "", parts = [], helpKey = "") => { item.statusKey = key; item.statusDetail = detail; item.statusParts = parts; item.helpKey = helpKey; renderItemStatus(item); status.className = `file-status ${cls}`; };
  item.setProgress = (value) => { progress.style.setProperty("--progress", `${value}%`); progress.classList.toggle("visible", value < 100); };
  item.addDownload = (blob, filename) => { item.url = URL.createObjectURL(blob); objectUrls.add(item.url); const a = document.createElement("a"); a.href = item.url; a.download = filename; a.className = "download-link"; a.textContent = t("download"); actions.append(a); item.download = a; };
  item.addShare = (fileToShare) => { const b = document.createElement("button"); b.type = "button"; b.className = "share-button"; b.textContent = t("share"); b.addEventListener("click", async () => { try { await navigator.share({ files:[fileToShare] }); } catch (error) { if (error.name !== "AbortError") b.textContent = t("shareBlocked"); } }); actions.append(b); item.share = b; };
  renderItemStatus(item);
  return item;
}
function refreshQueue() { els.queueHead.hidden = items.length === 0; els.empty.hidden = items.length > 0; els.queueCount.textContent = t("queueCount", items.length); }
async function processItem(item) {
  setStep(2); item.set("statusReading"); item.setProgress(15); await new Promise(requestAnimationFrame);
  try {
    const bytes = new Uint8Array(await item.file.arrayBuffer());
    if (item.cancelled) return;
    item.format = identifyFormat(bytes);
    renderItemFormat(item);
    if (item.format !== "heic" && item.format !== "heif") {
      const status = { jpeg:"statusJpeg", png:"statusPng", avif:"statusAvif", iso:"statusIso", malformed:"statusMalformed", empty:"statusEmpty" }[item.format] || "statusBadType";
      item.set(status, "", "error"); item.setProgress(100);
      addImportHelp(item); return;
    }
    item.set("statusChecking"); item.setProgress(28); let d;
    try { d = discoverHeic(bytes); }
    catch (error) { item.set("statusUnsupported", "", "error"); item.setProgress(100); return; }
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
    if (item.cancelled) return;
    const outputName = item.file.name.replace(/\.(heic|heif)$/i, "") + suffix;
    const outputFile = new File([data], outputName, { type:"image/heic" });
    if (navigator.canShare?.({ files:[outputFile] })) item.addShare(outputFile);
    item.addDownload(new Blob([data], { type:"image/heic" }), outputName);
    item.set("statusDone", "", "ok", details.filter(Boolean)); item.setProgress(100); setStep(3);
} catch (error) { if (item.cancelled) return; console.error(error); item.set(error.message === UNSUPPORTED ? "statusUnsupported" : "processError", "", "error"); item.setProgress(100); }
}
async function runQueue() {
  if (processing) return; processing = true;
  try {
    let next;
    while ((next = items.find((item) => item.statusKey === "statusQueued"))) await processItem(next);
  } finally {
    processing = false;
    setStep(items.some((item) => item.statusKey === "statusDone") ? 3 : 1);
  }
}
function addFiles(fileList) {
  const fresh = [...fileList].filter((file) => !items.some((item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified));
  fresh.forEach((file) => items.push(makeItem(file))); refreshQueue(); if (fresh.length) runQueue();
}
function clearQueue() { items.splice(0).forEach((item) => { item.cancelled = true; if (item.url) { URL.revokeObjectURL(item.url); objectUrls.delete(item.url); } item.el.remove(); }); refreshQueue(); setStep(1); }

els.library.addEventListener("click", () => els.libraryInput.click());
els.browse.addEventListener("click", () => els.browseInput.click());
els.libraryInput.addEventListener("change", () => { addFiles(els.libraryInput.files); els.libraryInput.value = ""; });
els.browseInput.addEventListener("change", () => { addFiles(els.browseInput.files); els.browseInput.value = ""; });
els.drop.addEventListener("click", (event) => { if (event.target.closest("button")) return; els.browseInput.click(); });
els.drop.addEventListener("keydown", (event) => { if (event.target !== els.drop) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); els.browseInput.click(); } });
els.drop.addEventListener("dragover", (event) => { event.preventDefault(); els.drop.classList.add("over"); });
els.drop.addEventListener("dragleave", () => els.drop.classList.remove("over"));
els.drop.addEventListener("drop", (event) => { event.preventDefault(); els.drop.classList.remove("over"); addFiles(event.dataTransfer.files); });
$("helpBrowseButton").addEventListener("click", () => els.browseInput.click());
$("refreshButton").addEventListener("click", () => window.location.reload());
els.clear.addEventListener("click", clearQueue);
els.qualityHelp.addEventListener("click", () => { const open = els.qualityHelpText.hidden; els.qualityHelpText.hidden = !open; els.qualityHelp.setAttribute("aria-expanded", String(open)); });
els.lang.addEventListener("click", () => { lang = lang === "zh" ? "en" : "zh"; applyCopy(); });
window.addEventListener("beforeunload", () => objectUrls.forEach((url) => URL.revokeObjectURL(url)));

applyCopy();
fetch("profiles/index.json").then((response) => response.json()).then((value) => { profileIndex = value; }).catch((error) => console.warn("profiles unavailable", error));
if ("serviceWorker" in navigator) {
  const wasControlled = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!wasControlled || refreshing) return;
    if (items.length) { els.updateNotice.hidden = false; return; }
    refreshing = true; window.location.reload();
  });
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache:"none" });
      registration.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });
    } catch (error) { console.warn("offline cache unavailable", error); }
  });
}



