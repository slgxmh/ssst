# ssst

一个基于 SolidJS 构建的**个人工具箱**渐进式 Web 应用（PWA）。采用插件化架构，目前集成了图像标注工具，未来将持续扩展更多实用功能模块。

## 功能特性

- 🧰 **模块化工具箱** — 侧边栏切换不同功能模块
- 🖼️ **图像标注** — 支持 LabelMe 格式的点标注、类别管理
- ✂️ **图片裁剪** — 支持网格分割导出，可自定义瓦片尺寸与重叠区域
- 🔄 **离线可用** — PWA 支持，可安装到桌面，离线使用

## 技术栈

- **前端框架**: [SolidJS](https://www.solidjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **图形绘制**: [Konva](https://konvajs.org/)
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

## 开发环境

- [Node.js](https://nodejs.org/) 或 [bun](https://bun.sh/)

## 快速开始

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build
```

## 项目结构

```
├── src/
│   ├── features/
│   │   └── image-labeler/  # 图像标注模块（更多模块接入中）
│   ├── App.tsx             # 工具箱主框架
│   └── index.tsx
├── public/                 # 静态资源
│   ├── manifest.json       # PWA 清单
│   └── icons/              # 应用图标
└── .github/workflows/      # CI/CD 自动发布
```

## 已有模块

### 🔖 图像标注

兼容 [LabelMe](https://github.com/wkentaro/labelme) 格式的点标注工具，支持类别管理与颜色区分。

**核心功能：**

- ✅ 点标注 — 点击画布添加标注点，支持拖拽调整位置
- 🏷️ 类别管理 — 自定义类别名称与颜色，自动分配编号
- 💾 自动保存 — 标注数据以 LabelMe JSON 格式存储，与原图同目录
- ✂️ 网格裁剪 — 将大图按设定尺寸分割为瓦片，自动过滤并转换标注坐标

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
