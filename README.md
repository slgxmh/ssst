# ssst

一个基于 Tauri + SolidJS 构建的**个人工具箱**桌面应用。采用插件化架构，目前集成了图像标注工具，未来将持续扩展更多实用功能模块。

## 功能特性

- 🧰 **模块化工具箱** — 侧边栏切换不同功能模块
- 🖼️ **图像标注** — 支持 LabelMe 格式的点标注、类别管理
- 🔄 **自动更新** — 内置更新检测，一键升级

## 技术栈

- **前端框架**: [SolidJS](https://www.solidjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **图形绘制**: [Konva](https://konvajs.org/)
- **桌面端**: [Tauri v2](https://tauri.app/)

## 开发环境

- [Rust](https://www.rust-lang.org/)
- [bun](https://bun.sh/)

## 快速开始

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run tauri dev

# 构建生产版本
bun run tauri build
```

## 项目结构

```
├── src/
│   ├── features/
│   │   └── image-labeler/  # 图像标注模块（更多模块接入中）
│   ├── App.tsx             # 工具箱主框架
│   └── index.tsx
├── src-tauri/              # Tauri / Rust 后端
│   ├── src/
│   ├── Cargo.toml
│   └── tauri.conf.json
└── .github/workflows/      # CI/CD 自动发布
```

## 自动更新

应用已集成 Tauri Updater，发布新版本后会自动检测并提示更新。

发布流程由 GitHub Actions 自动处理：推送 `v*` 标签即可触发全平台构建。

```bash
git tag v0.X.X
git push origin v0.X.X
```

## 已有模块

### 🔖 图像标注

兼容 [LabelMe](https://github.com/wkentaro/labelme) 格式的多边形标注工具，支持类别管理与颜色区分。

输出格式：

```json
{
  "version": "5.0",
  "flags": {},
  "shapes": [
    {
      "label": "cat",
      "points": [[10, 10], [100, 10], [100, 100], [10, 100]],
      "group_id": null,
      "shape_type": "polygon",
      "flags": {}
    }
  ],
  "imagePath": "example.jpg",
  "imageHeight": 1080,
  "imageWidth": 1920,
  "categories": []
}
```
