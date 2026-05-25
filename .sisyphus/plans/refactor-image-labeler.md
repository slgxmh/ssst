# 工程化拆分：图片标注模块

## 背景
当前 `src/App.tsx` 是一个 511 行的单文件，包含了完整的"图片标注"功能。作为个人工具箱应用，需要工程化拆分，使 App.tsx 只保留路由/导航外壳，每个工具作为独立 feature 模块。

## 目标目录结构

```
src/
├── App.tsx                              # 路由外壳 + 侧边栏导航
├── index.tsx                            # 入口（不变）
├── App.css                              # 全局样式（不变）
├── features/
│   └── image-labeler/
│       ├── index.tsx                    # 页面入口（组合各组件）
│       ├── types.ts                     # Label, Vec2 类型定义
│       ├── hooks/
│       │   └── useImageLabeler.ts       # 所有业务逻辑与状态管理
│       └── components/
│           ├── Toolbar.tsx              # 顶部工具栏
│           ├── Viewport.tsx             # 图片视口（含缩放、拖动、打点）
│           ├── LabelList.tsx            # 底部标注列表
│           └── LabelModal.tsx           # 添加/编辑标注弹窗
```

## 拆分策略

### Phase 1: 提取类型定义
- [x] 文件：`src/features/image-labeler/types.ts`
- [x] 内容：导出 `Label` 和 `Vec2` 接口

### Phase 2: 提取业务逻辑 Hook
- [x] 文件：`src/features/image-labeler/hooks/useImageLabeler.ts`
- [x] 职责：封装所有 createSignal、事件处理器、Tauri 调用
- [x] 注意：SolidJS 的 `let nextId = 1` 全局变量需要处理（放入 hook 内或改为 ref）
- [x] 返回：所有 state + actions + refs + handlers

### Phase 3: 拆分 UI 组件

**Toolbar.tsx**
- [x] 接收：imagePath, zoom, pickImage, saveLabels, resetView, clearAll
- [x] 渲染：标题、缩放百分比、选择图片/保存/适应/清除按钮

**Viewport.tsx**
- [x] 接收：imageUrl, naturalSize, zoom, pan, labels, 各种 mouse handlers, refs
- [x] 渲染：图片容器、空状态、标注点 overlay
- [x] 注意：需要 `imageRef` 和 `viewportRef`（通过 props 传入）

**LabelList.tsx**
- [x] 接收：labels, editLabel, deleteLabel
- [x] 渲染：标注表格（含编辑/删除按钮）

**LabelModal.tsx**
- [x] 接收：modalOpen, pendingX, pendingY, labelText, editingId, confirmLabel, setModalOpen, setLabelText
- [x] 渲染：弹窗表单

### Phase 4: 组装 Feature 页面
- [x] 文件：`src/features/image-labeler/index.tsx`
- [x] 调用 `useImageLabeler()` 获取所有状态和方法
- [x] 组合 Toolbar + Viewport + LabelList + LabelModal

### Phase 5: 重构 App.tsx 为路由外壳
- [x] 文件：`src/App.tsx`
- [x] 职责：侧边栏导航 + 内容区域路由
- [x] 当前只有一个 feature，所以直接渲染 ImageLabelerPage
- [x] 预留路由结构（通过 `activeTool` signal 切换）

## 代码变更细节

### App.tsx 变更摘要
- 删除所有图片标注相关的 state、逻辑、组件
- 保留：应用布局外壳（侧边栏 + 主内容区）
- 新增：工具导航列表（当前只有"图片标注"）

### useImageLabeler.ts 导出接口
```typescript
return {
  // refs
  imageRef, viewportRef,
  // state
  imagePath, imageUrl, labels,
  zoom, pan, naturalSize,
  modalOpen, labelText, editingId, dragId,
  // actions
  pickImage, saveLabels, resetView, clearAll,
  confirmLabel, deleteLabel, editLabel,
  // viewport handlers
  handleWheel, handleViewportMouseDown, handleViewportMouseMove,
  handleViewportMouseUp, handleViewportClick,
  // label handlers
  startDrag, handleContextMenu,
};
```

## 风险与注意事项
1. **SolidJS refs**：`imageRef` 和 `viewportRef` 是 `let` 声明的变量，在 SolidJS 中需要在组件作用域内。拆分后通过 props 传递 ref 的 setter 可能比较麻烦。替代方案：在 hook 中返回 ref callback。
2. **nextId 全局变量**：当前是模块级全局变量，多个实例会冲突。应移入 hook 内部。
3. **事件委托**：`startDrag` 中的 `window.addEventListener` 在拆分后仍然可以工作，但需要确保 `zoom()` signal 在闭包中正确读取。

## 验证步骤
1. `npm run build` 或 `bun run build` 通过
2. 功能验证：选择图片、缩放、拖动、打点、保存、编辑、删除均正常
3. TypeScript 严格模式无错误

## 提交信息
`refactor: 将图片标注功能从 App.tsx 工程化拆分到独立 feature 模块`
