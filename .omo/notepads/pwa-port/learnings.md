
## Wave 1: Remove Tauri Dependencies

### Changes Made
- **package.json**: Already clean — no Tauri dependencies found. Scripts `start` and `dev` were already using `vite` directly.
- **vite.config.ts**: Already clean — no Tauri-specific config (port 1420, strictPort, HMR) present.
- **src-tauri/**: Directory did not exist — already removed or never present.
- **scripts/bump-version.mjs**: Removed references to `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` since Tauri backend is gone.

### Verification
- `bun install` completed successfully (no changes needed)
- `bun run dev` starts Vite dev server on standard port 5173
- Server responds with HTTP 200

### Notes
- The project appears to have already been partially migrated away from Tauri
- Only remaining Tauri reference was in `scripts/bump-version.mjs` which has been cleaned up
- All non-Tauri dependencies preserved
- `src/` frontend code untouched

# PWA 迁移学习笔记

## Wave 1 - PWA 基础设置

### 已完成
- `vite-plugin-pwa` 已安装 (v0.21.0)
- `vite.config.ts` 已配置:
  - `registerType: "autoUpdate"` — 自动更新 Service Worker
  - `workbox.runtimeCaching` — 对静态资源使用 `CacheFirst` 策略
  - `globPatterns` — 预缓存 js/css/html/ico/png/svg/json 文件
- `public/manifest.json` 已创建:
  - name: "SSST - 图像标注工具"
  - short_name: "SSST"
  - start_url: "/"
  - display: "standalone"
  - theme_color: "#000000"
  - icons: 192x192 和 512x512 PNG 图标
- `index.html` 已添加:
  - `<link rel="manifest" href="/manifest.json">`
  - `<meta name="theme-color" content="#000000">`
  - `<link rel="apple-touch-icon" href="/icons/icon-192x192.png">`

### 关键决策
- 使用 Workbox 自动生成 Service Worker，不手写 sw.js
- 静态资源缓存策略为 `CacheFirst`，缓存 30 天/最多 100 个条目
- 不配置离线图片缓存（超出 Wave 1 范围）
- 图标使用现有 public/icons/ 下的 PNG 文件

### 注意事项
- PWA 需要 HTTPS 或 localhost 环境才能正常工作
- 当前 Vite 配置仍保留 Tauri 相关设置（port 1420），Task 3 会处理迁移
- `bun run build` 会生成 `sw.js` 和 `workbox-*.js` 到 dist 目录

# PWA Port Learnings

## Wave 1

### Task 1: 文件系统抽象层 (src/utils/fileSystem.ts)

**完成时间**: 2026-06-01

**关键决策**:
- 使用原生 Web File API 替代 Tauri 的文件操作
- 安装 `@types/wicg-file-system-access` 获取 File System Access API 的类型定义
- 实现了完整的权限错误处理和浏览器兼容性检查

**API 使用**:
- `selectImageFile()`: 使用 `<input type="file">` 选择图片，兼容性最好
- `readImageAsDataURL()`: 使用 FileReader 读取为 base64
- `loadAnnotationFile()`: 优先使用 `showOpenFilePicker`，降级到 input
- `saveAnnotationFile()`: 使用 `showSaveFilePicker` 保存 JSON
- `selectDirectory()`: 使用 `showDirectoryPicker` 选择目录
- `writeFileToDirectory()`: 使用 `getFileHandle` + `createWritable` 写入

**兼容性注意事项**:
- File System Access API 仅在 Chrome/Edge 86+ 可用
- 非 Chrome/Edge 浏览器显示 console.warn 警告
- 权限拒绝时抛出带有友好中文消息的 Error
- `showOpenFilePicker` 不支持 `suggestedName` 参数（与 `showSaveFilePicker` 不同）

**错误处理模式**:
- `AbortError`: 用户取消操作
- `NotAllowedError`: 权限被拒绝
- `SecurityError`: 安全限制（非 HTTPS/localhost）
