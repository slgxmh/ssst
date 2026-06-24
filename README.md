# SSST

个人工具箱，采用 Tauri v2 构建的桌面应用，集成图像标注与 BLE 调试能力。

- **apps/desktop**: 基于 **Vite + SolidJS + Tauri** 的桌面应用，包含图像标注工具和 BLE 调试面板。

## 功能特性

### 图像标注
- 🖼️ **图像标注** — 支持 LabelMe 格式的点标注、类别管理
- ✂️ **图片裁剪** — 支持网格分割导出，可自定义瓦片尺寸与重叠区域
- 📁 **目录管理** — 选择本地图片目录，自动加载同目录 JSON 标注并保存
- 🎨 **类别管理** — 自定义类别名称与颜色，自动分配编号

### BLE 调试
- 🔍 **设备扫描** — 实时发现附近 BLE 设备，显示信号强度
- 🔌 **一键连接** — 连接选中设备并发现 GATT 服务与特征
- 📡 **GATT 操作** — 支持读、写、Notify 订阅

## 技术栈

- **前端框架**: [SolidJS](https://www.solidjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **桌面壳**: [Tauri v2](https://tauri.app/)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **图形绘制**: [Konva](https://konvajs.org/)
- **BLE**: [btleplug](https://github.com/deviceplug/btleplug)
- **异步运行时**: [tokio](https://tokio.rs/)

## 开发环境

- [Node.js](https://nodejs.org/) 20+ 或 [bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install) 1.78+
- macOS / Windows / Linux 桌面平台

## 快速开始

### 安装依赖

```bash
bun install
```

### 开发模式

```bash
bun run dev
```

### 构建前端

```bash
bun run build
```

### 构建桌面应用

```bash
bun run build:desktop
```

## 项目结构

```
├── apps/
│   └── desktop/              # Tauri 桌面应用
│       ├── src/
│       │   ├── components/   # 页面级组件
│       │   ├── features/     # 功能模块
│       │   │   └── image-labeler/
│       │   ├── services/     # Tauri 调用服务
│       │   ├── App.tsx       # 顶层标签页路由
│       │   ├── index.tsx     # 入口
│       │   └── styles/
│       ├── public/           # 静态资源
│       ├── src-tauri/        # Rust 后端
│       │   ├── src/
│       │   │   ├── ble/      # BLE 扫描与 GATT 操作
│       │   │   ├── lib.rs
│       │   │   └── main.rs
│       │   ├── icons/        # 应用图标
│       │   └── tauri.conf.json
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
├── Cargo.toml                # Rust workspace
├── package.json              # Bun workspace
└── README.md
```

## 已有模块

### 🔖 图像标注

兼容 [LabelMe](https://github.com/wkentaro/labelme) 格式的点标注工具，支持类别管理与颜色区分。

**核心功能：**

- ✅ 点标注 — 点击画布添加标注点，支持拖拽调整位置
- 🏷️ 类别管理 — 自定义类别名称与颜色，自动分配编号
- 💾 自动保存 — 标注数据以 LabelMe JSON 格式存储，与原图同目录
- ✂️ 网格裁剪 — 将大图按设定尺寸分割为瓦片，自动过滤并转换标注坐标
- 📁 目录管理 — 支持选择整个图片目录，批量切换图片

**裁剪导出功能：**

- 自定义瓦片宽度/高度（默认 512×512）
- 设置重叠像素（默认 128px），避免标注被切分
- 实时预览分割网格
- 自动筛选瓦片内标注，转换为相对坐标
- 导出为独立 PNG 与 JSON 文件

**输出格式：**

```json
{
  "version": "5.0",
  "flags": {},
  "shapes": [
    {
      "label": "cat",
      "points": [[10, 10]],
      "group_id": null,
      "shape_type": "point",
      "flags": {}
    }
  ],
  "imagePath": "example.jpg",
  "imageHeight": 1080,
  "imageWidth": 1920,
  "categories": []
}
```

### 🔍 BLE 调试

基于 btleplug 的 BLE 调试面板，提供设备扫描、连接、服务发现、特征读写与 Notify 订阅。

**注意事项：**

- macOS 上需要授予应用蓝牙权限
- 发布版本需要签名/公证才能正常访问 Bluetooth

## 平台支持

- macOS（Apple Silicon / Intel）
- Windows
- Linux
