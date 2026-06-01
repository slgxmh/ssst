# SSST → PWA 移植计划

## TL;DR

> **Quick Summary**: 将现有的 Tauri+SolidJS 图像标注桌面应用移植为 Chrome/Edge 纯 Web PWA，使用 Web APIs（File System Access API、Canvas API）替代所有 Tauri 后端调用，保持前端组件结构和标注数据格式不变。
> 
> **Deliverables**: 
> - 文件系统抽象层（`src/utils/fileSystem.ts`）
> - PWA 配置文件（manifest、service worker）
> - 替换 Tauri API 调用的前端代码
> - Canvas 实现的图片裁剪功能
> - 移除 Tauri 依赖和 `src-tauri/` 目录
> 
> **Estimated Effort**: Medium（3-5 天）
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Wave 1（文件系统抽象层）→ Wave 2（核心功能替换）→ Wave 3（裁剪功能）→ Wave 4（PWA 配置）→ Final Verification

---

## Context

### Original Request
用户希望将基于 Tauri + SolidJS 构建的图像标注桌面应用移植为纯 Web PWA 应用。

### Interview Summary
**Key Discussions**:
- **浏览器支持**: Chrome/Edge only，不支持 Safari/Firefox 降级
- **导出方式**: 使用 File System Access API 的 `showDirectoryPicker` 进行目录选择
- **文件关联**: 用户选择图片时，自动加载同目录同名 JSON 标注文件
- **前端改动**: 保留 SolidJS，保持文件结构不变，允许修改内部 hook/component 逻辑
- **默认导出目录**: 记住上次选择的目录（通过 File System Access API 句柄）
- **Service Worker**: 使用 `vite-plugin-pwa` 内置 Workbox

**Research Findings**:
- 当前 Tauri 后端提供 4 个命令：`read_image`、`save_labels`、`load_labels`、`crop_image`
- 前端使用 `@tauri-apps/api/core`（`invoke()`）和 `@tauri-apps/plugin-dialog`（`open()`）
- 所有功能均可通过 Web APIs 替代
- Rust 裁剪逻辑（stride 计算、边缘瓦片处理、坐标转换）可完全用 Canvas API 复现

### Metis Review
**Identified Gaps** (addressed):
- 权限拒绝处理：在文件系统抽象层中统一处理
- 大图片内存问题：添加图片尺寸验证和警告
- 裁剪像素级一致性：QA 场景包含对比验证
- PWA 更新机制：使用 `vite-plugin-pwa` 自动处理

---

## Work Objectives

### Core Objective
将 Tauri 后端完全替换为 Web APIs，使应用成为可在 Chrome/Edge 中运行的 PWA，保持所有现有功能不变。

### Concrete Deliverables
- `src/utils/fileSystem.ts` - 文件系统抽象层
- `public/manifest.json` - PWA 配置
- 修改后的 `useImageLabeler.ts` - 使用 Web APIs
- 修改后的 `CropModal.tsx` - 使用目录选择器
- Canvas 实现的裁剪功能
- 移除 Tauri 相关代码和依赖

### Definition of Done
- [ ] 所有 Tauri `invoke()` 调用被替换
- [ ] 应用可在 Chrome/Edge 中完整运行
- [ ] 可作为 PWA 安装
- [ ] 标注 JSON 格式与现有版本兼容
- [ ] 裁剪输出与 Rust 版本功能一致

### Must Have
- 文件系统抽象层封装所有文件操作
- 图片加载和显示
- 标注的保存和加载
- 裁剪导出功能
- PWA 可安装性
- Chrome/Edge 兼容性

### Must NOT Have (Guardrails)
- Safari/Firefox 支持
- 移动端适配
- 离线图片缓存
- 新增标注功能
- UI 重新设计
- 后端服务器
- 数据库
- 组件文件重组

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO（当前无测试框架）
- **Automated tests**: NO（Agent QA only）
- **Framework**: None
- **Agent-Executed QA**: ALWAYS（每个任务包含详细 QA 场景）

### QA Policy
每个任务 MUST 包含 agent-executed QA scenarios：
- **Frontend**: Playwright 打开浏览器，操作文件选择，验证 DOM 和截图
- **File System**: 验证文件读写正确性
- **PWA**: Lighthouse 审计验证可安装性

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 可立即开始):
├── Task 1: 文件系统抽象层实现
├── Task 2: PWA 基础配置 (manifest + vite-plugin-pwa)
└── Task 3: 移除 Tauri 依赖和代码

Wave 2 (Core Features - 依赖 Wave 1):
├── Task 4: 替换图片加载功能
├── Task 5: 替换标注保存/加载功能
└── Task 6: 修改文件选择 UI

Wave 3 (Crop Feature - 依赖 Wave 2):
├── Task 7: Canvas 裁剪实现
└── Task 8: 修改裁剪导出 UI

Wave 4 (Integration - 依赖 Wave 3):
├── Task 9: 集成测试和 Bug 修复
└── Task 10: PWA 安装性验证

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review
├── Task F3: Real manual QA
└── Task F4: Scope fidelity check
```

### Dependency Matrix
- **Task 1**: None → Blocks: Task 4, 5, 7
- **Task 2**: None → Blocks: Task 10
- **Task 3**: None → Blocks: Tasks 4, 5, 6 (Wave 2 需等待 Tauri 依赖移除完成)
- **Task 4**: 1 → Blocks: Task 9
- **Task 5**: 1 → Blocks: Task 9
- **Task 6**: 1, 3 → Blocks: None
- **Task 7**: 1 → Blocks: Task 9
- **Task 8**: 7 → Blocks: Task 9
- **Task 9**: 4, 5, 7, 8 → Blocks: Task 10
- **Task 10**: 2, 9 → Blocks: F1-F4

### Agent Dispatch Summary
- **Wave 1**: Task 1 → `quick`, Task 2 → `quick`, Task 3 → `quick`
- **Wave 2**: Task 4 → `unspecified-high`, Task 5 → `unspecified-high`, Task 6 → `quick`
- **Wave 3**: Task 7 → `deep`, Task 8 → `unspecified-high`
- **Wave 4**: Task 9 → `unspecified-high`, Task 10 → `quick`
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. 文件系统抽象层实现

  **What to do**:
  - 创建 `src/utils/fileSystem.ts`
  - 封装 File System Access API：
    - `selectImageFile(): Promise<File>` - 使用 `<input type="file">` 选择图片
    - `readImageAsDataURL(file: File): Promise<string>` - FileReader 读取为 base64
    - `loadAnnotationFile(imageFile: File): Promise<LabelMeAnnotation | null>` - 查找并读取同名 JSON
    - `saveAnnotationFile(annotation: LabelMeAnnotation, suggestedName: string): Promise<void>` - showSaveFilePicker 保存 JSON
    - `selectDirectory(): Promise<FileSystemDirectoryHandle>` - showDirectoryPicker 选择目录
    - `writeFileToDirectory(dirHandle: FileSystemDirectoryHandle, filename: string, content: Blob): Promise<void>` - 向目录写入文件
  - 添加权限错误处理（用户拒绝时的友好提示）
  - 添加浏览器兼容性检查（非 Chrome/Edge 时显示警告）

  **Must NOT do**:
  - 不要实现裁剪功能（在 Task 7 中处理）
  - 不要修改任何组件文件
  - 不要添加 IndexedDB 或本地存储

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 主要是 API 封装，逻辑清晰
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 7
  - **Blocked By**: None

  **References**:
  - `src/features/image-labeler/types.ts` - 使用 LabelMeAnnotation 类型
  - MDN: `https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API`
  - MDN: `https://developer.mozilla.org/en-US/docs/Web/API/FileReader`

  **Acceptance Criteria**:
  - [ ] 文件 `src/utils/fileSystem.ts` 存在且导出所有函数
  - [ ] 每个函数有正确的 TypeScript 类型签名
  - [ ] 权限拒绝时返回友好的错误信息

  **QA Scenarios**:

  ```
  Scenario: 选择图片文件
    Tool: Playwright
    Preconditions: 应用已加载
    Steps:
      1. 点击"选择图片"按钮
      2. 在文件选择器中选择 test.jpg
      3. 验证图片显示在画布上
    Expected Result: 图片正确加载并显示
    Evidence: .omo/evidence/task-1-select-image.png

  Scenario: 保存标注文件
    Tool: Playwright
    Preconditions: 已加载图片并添加标注
    Steps:
      1. 点击"保存 JSON"按钮
      2. 在保存对话框中选择保存位置
      3. 验证文件内容正确
    Expected Result: JSON 文件正确保存
    Evidence: .omo/evidence/task-1-save-labels.json
  ```

  **Commit**: YES
  - Message: `feat: add file system abstraction layer`
  - Files: `src/utils/fileSystem.ts`

- [x] 2. PWA 基础配置

  **What to do**:
  - 安装 `vite-plugin-pwa`
  - 修改 `vite.config.ts` 添加 PWA 配置：
    - 注册策略：`autoUpdate`
    - 包含的静态资源：`**/*.{js,css,html,ico,png,svg}`
    - Workbox 策略：CacheFirst for static assets
  - 创建 `public/manifest.json`：
    - `name`: "SSST - 图像标注工具"
    - `short_name`: "SSST"
    - `start_url`: "/"
    - `display`: "standalone"
    - `theme_color`: "#000000"
    - `icons`: 使用现有 logo（如有）或生成基础图标
  - 修改 `index.html` 添加 manifest 链接和 theme-color meta
  - 确保 Service Worker 正确注册

  **Must NOT do**:
  - 不要配置离线图片缓存（超出范围）
  - 不要添加推送通知
  - 不要修改应用逻辑代码

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准配置任务
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - `vite.config.ts` - 当前 Vite 配置
  - `index.html` - 当前 HTML 入口
  - `vite-plugin-pwa` docs: `https://vite-pwa-org.netlify.app/`

  **Acceptance Criteria**:
  - [ ] `vite-plugin-pwa` 安装成功
  - [ ] `vite build` 成功生成 SW
  - [ ] manifest.json 包含所有必需字段

  **QA Scenarios**:

  ```
  Scenario: PWA 可安装性
    Tool: Playwright + Lighthouse
    Preconditions: 应用已构建并运行
    Steps:
      1. 运行 Lighthouse PWA 审计
      2. 验证所有 PWA 检查项通过
    Expected Result: Lighthouse PWA 分数 100
    Evidence: .omo/evidence/task-2-lighthouse-report.html
  ```

  **Commit**: YES
  - Message: `feat: add PWA configuration`
  - Files: `vite.config.ts`, `public/manifest.json`, `index.html`, `package.json`

- [x] 3. 移除 Tauri 依赖和代码

  **What to do**:
  - 修改 `package.json`：
    - 移除 `@tauri-apps/api`
    - 移除 `@tauri-apps/plugin-dialog`
    - 移除 `@tauri-apps/plugin-opener`
    - 移除 `@tauri-apps/cli` (devDependencies)
  - 删除 `src-tauri/` 整个目录
  - 修改 `vite.config.ts`：
    - 移除 Tauri 相关配置（port 1420, strictPort, HMR config）
    - 恢复为标准 Vite 配置
  - 修改 `package.json` scripts：
    - 移除 `tauri` 相关脚本
    - 更新 `start`/`dev` 为纯 Vite 命令
  - 运行 `bun install` 更新依赖

  **Must NOT do**:
  - 不要删除或修改 `src/` 下的前端代码（后续任务处理）
  - 不要删除其他非 Tauri 相关依赖

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 清理任务，直接删除和修改配置
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `package.json` - 当前依赖列表
  - `vite.config.ts` - 当前 Vite 配置
  - `src-tauri/` - Tauri 项目目录

  **Acceptance Criteria**:
  - [ ] `package.json` 无 Tauri 相关依赖
  - [ ] `src-tauri/` 目录已删除
  - [ ] `vite.config.ts` 为标准配置
  - [ ] `bun install` 成功执行

  **QA Scenarios**:

  ```
  Scenario: 验证 Tauri 已完全移除
    Tool: Bash
    Preconditions: 无
    Steps:
      1. 检查 package.json 无 @tauri-apps 依赖
      2. 检查 src-tauri 目录不存在
      3. 运行 bun install 无错误
    Expected Result: 所有 Tauri 痕迹已清除
    Evidence: .omo/evidence/task-3-cleanup.log
  ```

  **Commit**: YES
  - Message: `chore: remove Tauri dependencies and code`
  - Files: `package.json`, `vite.config.ts`, `src-tauri/` (deleted)

- [x] 4. 替换图片加载功能

  **What to do**:
  - 修改 `src/features/image-labeler/hooks/useImageLabeler.ts`：
    - 替换 `pickImage()` 函数：
      - 使用 `selectImageFile()` 获取 File 对象
      - 使用 `readImageAsDataURL()` 读取为 base64 URL
      - 使用 `loadAnnotationFile()` 自动加载同名 JSON
      - 更新 `imagePath` signal 为文件名（而非完整路径）
    - 移除 `import { invoke } from "@tauri-apps/api/core"`
    - 移除 `import { open } from "@tauri-apps/plugin-dialog"`
    - 添加 `import { selectImageFile, readImageAsDataURL, loadAnnotationFile } from "../../../utils/fileSystem"`
  - 更新 `imagePath` 的语义：从完整文件路径变为文件名（用于显示和 JSON 中的 imagePath 字段）

  **Must NOT do**:
  - 不要修改标注保存逻辑（Task 5 处理）
  - 不要修改裁剪导出逻辑（Task 7 处理）
  - 不要修改 UI 组件

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要仔细处理文件路径语义变化
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 1

  **References**:
  - `src/features/image-labeler/hooks/useImageLabeler.ts` - 当前实现
  - `src/utils/fileSystem.ts` - Task 1 实现的抽象层

  **Acceptance Criteria**:
  - [ ] 可选择图片并显示
  - [ ] 自动加载同名 JSON 标注
  - [ ] 无 Tauri API 导入

  **QA Scenarios**:

  ```
  Scenario: 加载图片和标注
    Tool: Playwright
    Preconditions: 准备 test.jpg 和 test.json
    Steps:
      1. 点击"选择图片"
      2. 选择 test.jpg
      3. 验证图片显示
      4. 验证标注点正确渲染
    Expected Result: 图片和标注都正确加载
    Evidence: .omo/evidence/task-4-load-image.png

  Scenario: 无标注文件时正常加载
    Tool: Playwright
    Preconditions: 准备无同名 JSON 的图片
    Steps:
      1. 选择无标注的图片
      2. 验证图片正常显示
      3. 验证标注列表为空
    Expected Result: 正常加载，无错误
    Evidence: .omo/evidence/task-4-no-labels.png
  ```

  **Commit**: YES
  - Message: `feat: replace image loading with Web File API`
  - Files: `src/features/image-labeler/hooks/useImageLabeler.ts`

- [x] 5. 替换标注保存/加载功能

  **What to do**:
  - 修改 `src/features/image-labeler/hooks/useImageLabeler.ts`：
    - 替换 `saveLabels()` 函数：
      - 使用 `saveAnnotationFile()` 替代 `invoke("save_labels")`
      - 构造 LabelMeAnnotation 对象（与现有逻辑相同）
      - 使用当前图片文件名作为建议文件名
    - 移除所有剩余的 `invoke()` 调用
  - 确保保存的 JSON 格式与现有版本完全兼容

  **Must NOT do**:
  - 不要修改 LabelMe JSON 格式
  - 不要修改标注数据结构

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要确保数据格式兼容性
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 1

  **References**:
  - `src/features/image-labeler/hooks/useImageLabeler.ts` - 当前 saveLabels 实现
  - `src-tauri/src/features/image_labeler.rs` - Rust 保存逻辑参考
  - `src/utils/fileSystem.ts` - Task 1 实现的抽象层

  **Acceptance Criteria**:
  - [ ] 可保存标注为 JSON
  - [ ] 保存的 JSON 可被现有 Tauri 版本正确读取
  - [ ] 无剩余 invoke() 调用

  **QA Scenarios**:

  ```
  Scenario: 保存和重新加载标注
    Tool: Playwright
    Preconditions: 已加载图片并添加标注
    Steps:
      1. 点击"保存 JSON"
      2. 保存到 test.json
      3. 刷新页面
      4. 重新选择 test.jpg
      5. 验证标注自动加载
    Expected Result: 标注正确保存和加载
    Evidence: .omo/evidence/task-5-save-reload.json
  ```

  **Commit**: YES
  - Message: `feat: replace label save/load with Web File API`
  - Files: `src/features/image-labeler/hooks/useImageLabeler.ts`

- [x] 6. 修改文件选择 UI

  **What to do**:
  - 修改 `src/features/image-labeler/components/CropModal.tsx`：
    - 替换 `pickOutputDir()` 函数：
      - 使用 `selectDirectory()` 替代 `@tauri-apps/plugin-dialog` 的 `open()`
      - 保存目录句柄到 signal（不修改 handleExport）
    - 移除 `import { open } from "@tauri-apps/plugin-dialog"`
    - 添加 `import { selectDirectory } from "../../utils/fileSystem"`
  - **注意**: 此任务只修改目录选择部分，`handleExport` 的修改在 Task 8 中处理

  **Must NOT do**:
  - 不要修改 `handleExport()` 函数（Task 8 处理）
  - 不要修改裁剪逻辑本身（Task 7 处理）
  - 不要修改 UI 布局

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 主要是导入替换和函数调用调整
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4, 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `src/features/image-labeler/components/CropModal.tsx` - 当前目录选择实现
  - `src/utils/fileSystem.ts` - Task 1 实现的抽象层

  **Acceptance Criteria**:
  - [ ] 可选择输出目录
  - [ ] 无 Tauri dialog 导入
  - [ ] `handleExport` 未被修改

  **QA Scenarios**:

  ```
  Scenario: 选择输出目录
    Tool: Playwright
    Preconditions: 打开裁剪导出对话框
    Steps:
      1. 点击"选择"按钮选择目录
      2. 验证目录路径显示在输入框
    Expected Result: 目录正确选择
    Evidence: .omo/evidence/task-6-select-dir.png
  ```

  **Commit**: YES
  - Message: `feat: replace directory picker with File System Access API`
  - Files: `src/features/image-labeler/components/CropModal.tsx`

- [x] 7. Canvas 裁剪实现

  **What to do**:
  - 创建 `src/utils/cropImage.ts`：
    - 实现 `cropImage()` 函数，参数与 Rust 版本一致：
      - `imageFile: File` - 原图文件
      - `outputDir: FileSystemDirectoryHandle` - 输出目录句柄
      - `config: CropConfig` - 裁剪配置
    - 使用 Canvas API 进行图片裁剪：
      - 加载图片到 Image 对象
      - 计算网格（stride = tile_size - overlap）
      - 对每个瓦片：
        - 创建 canvas 并绘制对应区域
        - 导出为 Blob
        - 使用 `writeFileToDirectory()` 保存
        - 筛选并转换标注坐标
        - 生成对应的 JSON 文件
    - 返回 CropResult（totalTiles, tilesWithLabels, outputDir）
  - 确保裁剪逻辑与 Rust 版本一致：
    - 边缘瓦片处理（不足 tile_size 时取剩余部分）
    - 标注坐标转换（减去 crop_x/crop_y）
    - 文件命名格式：`{base_name}_crop_r{row}_c{col}.{ext}`

  **Must NOT do**:
  - 不要修改裁剪算法逻辑（保持与 Rust 一致）
  - 不要添加新的导出格式

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要精确复现 Rust 裁剪逻辑，涉及复杂坐标计算
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8, 9
  - **Blocked By**: Task 1

  **References**:
  - `src-tauri/src/features/crop.rs` - Rust 裁剪实现（参考逻辑）
  - `src/features/image-labeler/types.ts` - CropConfig, CropResult 类型
  - `src/utils/fileSystem.ts` - writeFileToDirectory 函数

  **Acceptance Criteria**:
  - [ ] 裁剪输出与 Rust 版本功能一致
  - [ ] 瓦片数量计算正确
  - [ ] 标注筛选和坐标转换正确

  **QA Scenarios**:

  ```
  Scenario: 裁剪导出验证
    Tool: Playwright
    Preconditions: 已加载带标注的图片
    Steps:
      1. 打开裁剪对话框
      2. 设置 tileWidth=512, tileHeight=512, overlap=128
      3. 选择输出目录
      4. 点击"确认导出"
      5. 验证目录中文件数量和命名
      6. 验证 JSON 标注坐标正确
    Expected Result: 生成正确数量的瓦片和对应标注
    Evidence: .omo/evidence/task-7-crop-output/

  Scenario: 边缘瓦片处理
    Tool: Playwright
    Preconditions: 图片尺寸不是 tile_size 的整数倍
    Steps:
      1. 使用 1024x768 图片，512x512 瓦片
      2. 验证边缘瓦片尺寸正确（非 512x512）
    Expected Result: 边缘瓦片正确裁剪为剩余尺寸
    Evidence: .omo/evidence/task-7-edge-tiles.png
  ```

  **Commit**: YES
  - Message: `feat: implement image cropping with Canvas API`
  - Files: `src/utils/cropImage.ts`

- [x] 8. 修改裁剪导出 UI

  **What to do**:
  - 修改 `src/features/image-labeler/hooks/useImageLabeler.ts`：
    - 更新 `exportCrops()` 函数：
      - 使用新的 `cropImage()` 函数（Task 7）
      - 传递 File 对象和目录句柄
      - 移除 `invoke("crop_image")` 调用
  - 修改 `src/features/image-labeler/components/CropModal.tsx`：
    - 更新 `handleExport()` 以使用新的导出流程（连接 Task 6 的目录选择）
    - 确保进度和错误处理正常工作
  - **注意**: 此任务修改 Task 6 中未触及的 `handleExport()` 部分

  **Must NOT do**:
  - 不要修改 UI 布局或样式
  - 不要修改裁剪配置界面
  - 不要修改 `pickOutputDir()`（Task 6 已处理）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要连接 UI 和新的裁剪实现
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Task 7

  **References**:
  - `src/features/image-labeler/hooks/useImageLabeler.ts` - exportCrops 当前实现
  - `src/features/image-labeler/components/CropModal.tsx` - 导出 UI
  - `src/utils/cropImage.ts` - Task 7 实现的裁剪函数

  **Acceptance Criteria**:
  - [ ] 导出流程完整工作
  - [ ] 进度提示正常显示
  - [ ] 错误处理正常工作

  **QA Scenarios**:

  ```
  Scenario: 完整导出流程
    Tool: Playwright
    Preconditions: 已加载带标注的图片
    Steps:
      1. 打开裁剪对话框
      2. 配置参数
      3. 选择目录
      4. 导出
      5. 验证成功提示
    Expected Result: 导出成功，显示正确统计信息
    Evidence: .omo/evidence/task-8-export-flow.png
  ```

  **Commit**: YES
  - Message: `feat: integrate Canvas crop with export UI`
  - Files: `src/features/image-labeler/hooks/useImageLabeler.ts`, `src/features/image-labeler/components/CropModal.tsx`

- [x] 9. 集成测试和 Bug 修复

  **What to do**:
  - 运行完整应用，测试所有功能：
    - 图片加载和显示
    - 标注添加、编辑、删除
    - 标注保存和重新加载
    - 裁剪导出
    - 视图操作（缩放、平移）
  - 修复发现的任何问题
  - 确保无控制台错误
  - 验证所有 Tauri 引用已清除

  **Must NOT do**:
  - 不要添加新功能
  - 不要进行性能优化（除非有严重问题）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要全面测试和调试
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 4, 5, 7, 8

  **References**:
  - 所有已修改的文件

  **Acceptance Criteria**:
  - [ ] 所有功能正常工作
  - [ ] 无控制台错误
  - [ ] 无 Tauri 残留引用

  **QA Scenarios**:

  ```
  Scenario: 完整工作流测试
    Tool: Playwright
    Preconditions: 应用已构建
    Steps:
      1. 选择图片
      2. 添加多个标注
      3. 保存标注
      4. 裁剪导出
      5. 验证所有步骤无错误
    Expected Result: 完整工作流成功
    Evidence: .omo/evidence/task-9-full-workflow.png
  ```

  **Commit**: YES
  - Message: `fix: integration testing and bug fixes`
  - Files: 所有需要修复的文件

- [x] 10. PWA 安装性验证

  **What to do**:
  - 运行 `bun run build` 生产构建
  - 使用 `bun run preview` 预览生产版本
  - 运行 Lighthouse PWA 审计
  - 验证：
    - 可安装性（Installable）
    - Service Worker 注册
    - 离线可用性（基本静态资源）
    - Manifest 有效性
  - 修复任何 PWA 相关问题

  **Must NOT do**:
  - 不要添加离线图片缓存
  - 不要修改应用功能代码

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 验证任务，使用标准工具
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 2, 9

  **References**:
  - `public/manifest.json`
  - `vite.config.ts`

  **Acceptance Criteria**:
  - [ ] Lighthouse PWA 分数 ≥ 90
  - [ ] 应用可安装
  - [ ] Service Worker 正常工作

  **QA Scenarios**:

  ```
  Scenario: PWA 安装测试
    Tool: Playwright + Lighthouse
    Preconditions: 生产构建已部署
    Steps:
      1. 打开应用
      2. 验证安装提示出现
      3. 运行 Lighthouse PWA 审计
      4. 验证分数 ≥ 90
    Expected Result: PWA 所有检查通过
    Evidence: .omo/evidence/task-10-pwa-audit.html
  ```

  **Commit**: YES
  - Message: `feat: verify PWA installability`
  - Files: 如有修复则包含

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `bun run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, unused imports. Check no Tauri references remain.
  Output: `Build [PASS/FAIL] | Type Check [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: empty image, no annotations, large image.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Task 1**: `feat: add file system abstraction layer`
- **Task 2**: `feat: add PWA configuration`
- **Task 3**: `chore: remove Tauri dependencies and code`
- **Task 4**: `feat: replace image loading with Web File API`
- **Task 5**: `feat: replace label save/load with Web File API`
- **Task 6**: `feat: replace directory picker with File System Access API`
- **Task 7**: `feat: implement image cropping with Canvas API`
- **Task 8**: `feat: integrate Canvas crop with export UI`
- **Task 9**: `fix: integration testing and bug fixes`
- **Task 10**: `feat: verify PWA installability`

---

## Success Criteria

### Verification Commands
```bash
# 构建生产版本
bun run build

# 预览生产版本
bun run preview

# 类型检查
npx tsc --noEmit
```

### Final Checklist
- [ ] 所有 "Must Have" 已实现
- [ ] 所有 "Must NOT Have" 未出现
- [ ] 无 Tauri 依赖残留
- [ ] 无控制台错误
- [ ] Lighthouse PWA 分数 ≥ 90
- [ ] 标注 JSON 格式与现有版本兼容
- [ ] 裁剪功能与 Rust 版本功能一致

