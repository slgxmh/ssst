import { Show } from "solid-js";

interface ToolbarProps {
  imagePath: () => string;
  zoom: () => number;
  pickImage: () => void;
  saveLabels: () => void;
  resetView: () => void;
  clearAll: () => void;
}

export default function Toolbar(props: ToolbarProps) {
  return (
    <>
      {/* Toast */}
      <div
        id="toast"
        class="toast toast-top toast-center opacity-0 transition-opacity duration-300 z-50"
      >
        <div class="alert alert-success">
          <span>CSV 已保存</span>
        </div>
      </div>

      {/* Toolbar */}
      <div class="navbar bg-base-100 shadow-sm px-4 shrink-0">
        <div class="navbar-start">
          <span class="text-xl font-bold">🔖 图片标注</span>
        </div>
        <div class="navbar-center gap-2">
          <Show when={props.imagePath()}>
            <span class="text-sm font-mono text-base-content/60">
              {Math.round(props.zoom() * 100)}%
            </span>
          </Show>
        </div>
        <div class="navbar-end gap-2">
          <button class="btn btn-primary btn-sm" onClick={props.pickImage}>
            📂 选择图片
          </button>
          <Show when={props.imagePath()}>
            <button class="btn btn-success btn-sm" onClick={props.saveLabels}>
              💾 保存 CSV
            </button>
            <button class="btn btn-ghost btn-sm" onClick={props.resetView}>
              ⊕ 适应
            </button>
            <button class="btn btn-ghost btn-sm" onClick={props.clearAll}>
              🗑️ 清除
            </button>
          </Show>
        </div>
      </div>

      {/* Hint bar */}
      <Show when={props.imagePath()}>
        <div class="bg-base-100 border-b border-base-300 px-4 py-1 text-xs text-base-content/50 flex gap-4 shrink-0">
          <span>🖱️ 滚轮缩放</span>
          <span>🖱️ 左键拖动</span>
          <span>🖱️ 左键点击打点</span>
          <span>🖱️ 右键删除标注</span>
          <span>🖱️ 拖拽移动标注</span>
        </div>
      </Show>
    </>
  );
}
