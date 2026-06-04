# SSST

个人工具箱，采用 monorepo 架构，包含 Web PWA 应用与 Rust CLI 调试工具。

- **apps/web**: 基于 **Astro + SolidJS** 构建的渐进式 Web 应用（PWA），目前集成图像标注工具。
- **apps/ssst-cli**: 基于 **Rust + btleplug + ratatui** 的 TUI CLI，用于 BLE 蓝牙调试（Serial 支持规划中）。

## 功能特性

### Web PWA
- 🏠 **首页导航** — 清晰的功能入口，点击卡片进入对应工具
- 🖼️ **图像标注** — 支持 LabelMe 格式的点标注、类别管理
- ✂️ **图片裁剪** — 支持网格分割导出，可自定义瓦片尺寸与重叠区域
- 🔄 **离线可用** — PWA 支持，可安装到桌面，离线使用
- 📱 **响应式设计** — 适配桌面和移动设备

### ssst-cli（BLE 调试）
- 🔍 **设备扫描** — 实时发现附近 BLE 设备，显示信号强度
- 🔌 **一键连接** — Enter 连接选中设备，自动发现 GATT 服务与特征
- 📊 **三面板 TUI** — 设备列表 / 服务树 / 特征属性，支持键盘导航
- 📡 **GATT 操作** — 支持读、写、Notify 订阅（read/write/notify 已预留接口）

## 技术栈

### Web
- **前端框架**: [Astro](https://astro.build/) + [SolidJS](https://www.solidjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **图形绘制**: [Konva](https://konvajs.org/)
- **PWA**: [@vite-pwa/astro](https://vite-pwa-org.netlify.app/)
- **部署**: [Netlify](https://www.netlify.com/)

### CLI
- **语言**: [Rust](https://www.rust-lang.org/)
- **BLE**: [btleplug](https://github.com/deviceplug/btleplug)
- **TUI**: [ratatui](https://github.com/ratatui/ratatui) + [crossterm](https://github.com/crossterm-rs/crossterm)
- **异步运行时**: [tokio](https://tokio.rs/)
- **CLI 解析**: [clap](https://github.com/clap-rs/clap)

## 开发环境

- **Web**: [Node.js](https://nodejs.org/) 20+ 或 [bun](https://bun.sh/)
- **CLI**: [Rust](https://www.rust-lang.org/tools/install) 1.78+

## 快速开始

### 安装依赖

```bash
# Web 依赖（Bun workspace）
bun install

# CLI 依赖（Rust）
cd apps/ssst-cli && cargo build
```

### Web 开发

```bash
# 启动开发服务器
bun run dev:web

# 构建生产版本
bun run build:web
```

### CLI 使用

```bash
cd apps/ssst-cli

# 扫描附近 BLE 设备
cargo run -- scan --duration 10

# 启动交互式 TUI
cargo run -- interactive
```

**TUI 快捷键：**

| 按键 | 功能 |
|------|------|
| `↑` / `↓` | 导航 |
| `Enter` | 连接设备 / 进入服务 / 选中特征 |
| `d` | 断开连接 |
| `q` / `Esc` | 返回上一级 / 退出 |

## 项目结构

```
├── apps/
│   ├── web/                  # Astro PWA 应用
│   │   ├── src/
│   │   │   ├── components/   # 可复用组件
│   │   │   ├── islands/      # 交互式岛屿组件
│   │   │   │   └── image-labeler/
│   │   │   ├── layouts/      # 页面布局
│   │   │   ├── pages/        # 页面路由
│   │   │   └── styles/
│   │   ├── public/           # 静态资源
│   │   ├── astro.config.mjs
│   │   └── package.json
│   └── ssst-cli/             # Rust CLI 工具
│       ├── src/
│       │   ├── main.rs       # CLI 入口
│       │   ├── app.rs        # TUI 状态
│       │   ├── scanner.rs    # BLE 扫描
│       │   ├── gatt.rs       # GATT 操作
│       │   ├── ui.rs         # ratatui 布局
│       │   └── event.rs      # 事件处理
│       └── Cargo.toml
├── Cargo.toml                # Rust workspace
├── package.json              # Bun workspace
└── netlify.toml              # 部署配置
```

## 页面路由（Web）

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 功能导航入口，展示所有可用工具 |
| `/labeler` | 图像标注 | 图片标注工具主页面 |
| `/docs` | 文档中心 | 使用指南与帮助文档 |

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
- 导出为 ZIP 压缩包

**输出格式：**

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

## 浏览器支持

- Chrome / Edge（推荐，完整支持 File System Access API）
- Firefox（基础功能支持）
- Safari（基础功能支持）
