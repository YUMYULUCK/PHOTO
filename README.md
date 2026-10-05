# Luma Port

一个中文优先的本地 HEIC 风格工具站首版。把整个 `heic-style-studio` 文件夹放到任意静态网站托管即可运行。

## 本地预览

```bash
python -m http.server 8000 --directory heic-style-studio
```

然后打开 `http://localhost:8000/`。需要通过 HTTP 服务打开，直接双击 HTML 会阻止 ES module 和本地资源加载。

## 这版包含

- 照片图库 / 浏览文件双入口
- 拖拽和多文件队列
- HEIC 魔数检查和兼容性错误说明
- 本地处理进度、下载副本、移动端分享
- 智能光线分析开关
- 中英文切换、深色界面、PWA 离线缓存
- 无 JavaScript 时的说明 fallback

这是实验性工具，请保留原片。`NOTICE.md` 说明了上游 HEIC 解析模块的来源和许可证。
