# 照片调色盘 · Photo Palette

一个在设备本机为兼容 iPhone HEIC 原片准备摄影风格与质感/颗粒元数据的网站。原片不覆盖，照片字节不上传，结果始终作为副本下载或分享。

- 中文界面显示「照片调色盘」，英文界面显示「Photo Palette」。
- 白色留白界面、蓝色操作按钮与通透相框主视觉。
- 相册选择、文件导入、拖拽、多文件队列、下载与支持时的系统分享。
- 通过文件内容识别 HEIC/HEIF、JPEG、PNG；不依赖文件后缀或 MIME。
- JPEG/PNG 不进入 HEIC 元数据处理流程，不会改后缀伪造成功。
- 保留现有摄影风格、质感/颗粒与智能匹配功能；没有添加普通滤镜系统。

## 本地运行

在仓库根目录执行：

```sh
python -m http.server 8000
```

然后打开 `http://localhost:8000/`。需要 HTTP 服务，不能直接双击 HTML。通过 `?lang=en` 可直接打开英文界面。

## 从 iPhone 获取 HEIC 原片

先尝试「从相册选择」。文件选择器的 `accept` 仅是类型提示，无法保证 iOS 不转换格式。

如果实际收到 JPG：

1. 打开照片 App，选择原片并分享。
2. 在「选项」中优先选择「当前」，避免「最兼容」。
3. 存储到「文件」App。
4. 返回网站，使用「从文件导入」。

如果仍是 JPG，原片可能本来就不是 HEIC。改后缀无法恢复 HEIC 编码或摄影风格元数据。

## 兼容性与隐私

HEIC 识别通过不代表内部布局受支持。原有 tile/HDR、内嵌缩略图、元数据结构要求保持不变；缺少所需结构的照片会明确拒绝。仅处理静态照片，不包含 Live Photo 动态和声音。

首次智能匹配可能从 CDN 下载解码组件，但照片只在本机读取。核心页面和 profile 支持离线；解码组件首次加载需要联网，离线时可关闭智能匹配使用中性设置。

这是实验性、非 Apple 官方工具。请保留原片，并在真实 iPhone 的照片 App 中确认输出副本的摄影风格和质感控件。

## GitHub Pages 与缓存

仓库通过现有 GitHub Pages 分支发布流程部署。整套文件无需构建，保留 `.nojekyll`、`src/`、`profiles/`、图标及许可证即可。

当前版本标记为 `20261115-4`，Worker 缓存为 `photo-palette-v6-picker-1`。每次发布应同步更新缓存名称和 HTML 中的 JS/CSS 版本参数。Worker 预缓存全部核心资源后才切换，确保页面、模块和 profile 属于同一版本。

已有队列时更新提示用户先下载再刷新；空队列可以自动刷新。首次从旧版升级时需要重新加载页面。不要先清除站点数据来验收升级，以免绕过旧缓存迁移流程。

标签页图标采用叠影相框 SVG，并提供 16/32px PNG 回退；iPhone 主屏幕图标使用 180px PNG，其他安装入口提供 192/512px PNG。图标链接附带版本号，以便更新旧缓存。

## 验证与致谢

验证结果与真实设备验收步骤见 [docs/VALIDATION.md](docs/VALIDATION.md)。核心模块及 donor profiles 来自 MIT 许可的 [nathanatgit/Shalielie](https://github.com/nathanatgit/Shalielie)，详细归属和许可证见 [NOTICE.md](NOTICE.md)、[UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt)。

网站作者：[YUMYULUCK](https://github.com/YUMYULUCK)

## 相册选择与旧照片排查

主相册入口使用 `image/*`，JPEG 提示中保留一个 HEIC 专用选择器供重试。WebKit 的部分配置仅在接受通用图像或无类型限制时请求 Current 表示；另一些配置仍固定请求 Compatible。网页无权控制该系统标志，不能保证任何一种 accept 都能拿到原片。参考 [WebKit 选择器源码](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm)。

收到 JPEG 时仍严格拒绝进入 HEIC 处理流程。存储到文件不是格式转换：如果原片是 JPEG，它仍然是 JPEG。先用照片 App 的信息面板核对原片，再判断是系统转码还是源格式限制。旧照片没有按年份被禁用；真正 HEIC 的内部布局、HDR、缩略图限制仍按原有规则检查。

Live Photo 包含静态照片与配对视频。本网页仍只导出静态 HEIC 副本，不保留配对视频、动态和声音。此次没有添加 JPEG 转 HEIC、普通滤镜，也没有引入未经验证的旧 HEIC 处理分支。

必须在真实 iPhone（用户反馈为 iPhone 17 Pro）上分别测试：通用相册入口、HEIC 专用重试、文件导入。记录 iOS 版本、照片 App 中的源格式与页面收到的实际格式。自动化测试能确认字节分流和按钮行为，无法代替系统相册测试，也不能据此宣称相册原片问题已彻底解决。
