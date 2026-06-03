# SSST

一个基于 **Astro + SolidJS** 构建的**个人工具箱**渐进式 Web 应用（PWA）。采用模块化架构，目前集成了图像标注工具，未来将持续扩展更多实用功能模块。

## 功能特性

- 🏠 **首页导航** — 清晰的功能入口，点击卡片进入对应工具
- 🖼️ **图像标注** — 支持 LabelMe 格式的点标注、类别管理
- ✂️ **图片裁剪** — 支持网格分割导出，可自定义瓦片尺寸与重叠区域
- 🔄 **离线可用** — PWA 支持，可安装到桌面，离线使用
- 📱 **响应式设计** — 适配桌面和移动设备

## 技术栈

- **前端框架**: [Astro](https://astro.build/) + [SolidJS](https://www.solidjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **图形绘制**: [Konva](https://konvajs.org/)
- **PWA**: [@vite-pwa/astro](https://vite-pwa-org.netlify.app/)
- **部署**: [Netlify](https://www.netlify.com/)

## 开发环境

- [Node.js](https://nodejs.org/) 20+ 或 [bun](https://bun.sh/)

## 快速开始

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build

# 预览生产构建
bun run preview
```

## 项目结构

```
├── src/
│   ├── components/         # 可复用组件
│   │   └── HomePage.tsx    # 首页组件
│   ├── islands/            # 交互式岛屿组件
│   │   └── image-labeler/  # 图像标注模块
│   │       ├── components/ # 子组件
│   │       ├── hooks/      # 状态管理
│   │       ├── utils/      # 工具函数
│   │       └── ImageLabeler.tsx
│   ├── layouts/            # 页面布局
│   │   └── Layout.astro    # 全局布局
│   ├── pages/              # 页面路由
│   │   ├── index.astro     # 首页
│   │   ├── labeler.astro   # 图像标注工具
│   │   └── docs.astro      # 文档中心
│   └── styles/
│       └── global.css      # 全局样式
├── public/                 # 静态资源
│   ├── manifest.json       # PWA 清单
│   └── icons/              # 应用图标
├── astro.config.mjs        # Astro 配置
├── netlify.toml            # Netlify 部署配置
└── .github/workflows/      # CI/CD 自动发布
```

## 页面路由

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
