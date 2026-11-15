# Photo Palette attribution

This standalone front end is an independent redesign built for this request.

The HEIC parsing and metadata-patching modules under `src/` and the donor profiles under `profiles/` are derived from the MIT-licensed project **Shalielie** by nathanatgit:
https://github.com/nathanatgit/Shalielie

The upstream license text is included in `UPSTREAM-LICENSE.txt`. Photo Palette's interface, copy, layout, and queue experience are original additions in this deliverable. This tool is experimental and is not affiliated with, authorized by, or endorsed by Apple Inc. Keep your originals and work on copies.

## Optional local HEVC encoder

The compatibility worker downloads the published assets of `@ffmpeg/core-mt@0.12.10` from jsDelivr, verifies their SHA-256 hashes, and executes them locally. The package is licensed GPL-2.0-or-later and contains FFmpeg 5.1.4 with the GPL x265 encoder. The license is included as `licenses/FFMPEG-GPL-2.0.txt`. Only the small auxiliary image is encoded in the browser; original primary and HDR streams are preserved. No photograph is uploaded.

Package and corresponding build source:

- https://www.npmjs.com/package/@ffmpeg/core-mt/v/0.12.10
- https://github.com/ffmpegwasm/ffmpeg.wasm/tree/63ea4ccb6c58e127cc1767f88c508371936178c2
- https://github.com/FFmpeg/FFmpeg/tree/n5.1.4
- https://bitbucket.org/multicoreware/x265_git/src/3.4/

The worker changes only the verified WebAssembly memory-import minimum in memory, from 16384 pages (1 GiB) to 4096 pages (256 MiB). Its source in `src/compat-encoder-worker.js` documents the three-byte patch and validates the modified module. No codec instructions or color tables change; no modified codec binary is distributed here. The integration sources `src/compat-encoder-worker.js` and `src/compat-encoder.js` are provided under GPL-2.0-or-later for this integration.

Pinned SHA-256 values:

```text
ffmpeg-core.js         62f5f5f468a37861da12c4581c321bb5ca8ba2f7b776377e08dd2ab72de293f9
ffmpeg-core.worker.js  97322a227c5f3d5ccfd0d0825890a6deeba137106a09b633ca75cadf49ddd2cb
ffmpeg-core.wasm       be2c97605366b78f3f13e21b52e81a55a79e1f29c133b03a68ec187b1a2ec41a
```

The optional decoder is `libheif-js@1.18.2` (LGPL-3.0); package/source: https://github.com/catdad-experiments/libheif-js and https://github.com/strukturag/libheif. It is also downloaded for local execution. See upstream repositories for licenses and dependency notices.

