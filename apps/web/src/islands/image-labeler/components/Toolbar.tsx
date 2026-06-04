import { Show, For, createSignal } from "solid-js";
import { Category } from "../types";

interface ToolbarProps {
  imagePath: () => string;
  zoom: () => number;
  imageList: () => string[];
  currentImageIndex: () => number;
  onSelectImage: (index: number) => void;
  onSelectDirectory: () => void;
  saveLabels: () => void;
  categories: () => Category[];
  currentCategoryId: () => number | null;
  setCurrentCategoryId: (id: number) => void;
  addCategory: (name: string) => void;
  removeCategory: (id: number) => void;
  editCategory: (id: number, name: string) => void;
}

export default function Toolbar(props: ToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = createSignal(false);

  return (
    <>
      {/* Toast */}
      <div
        id="toast"
        class="toast toast-top toast-center opacity-0 transition-opacity duration-300 z-50"
      >
        <div class="alert alert-success">
          <span>JSON 已保存</span>
        </div>
      </div>

      {/* Toolbar */}
      <div class="flex items-center justify-between bg-base-100 shadow-sm px-4 py-2 shrink-0 gap-4">
        {/* Left section */}
        <div class="flex items-center shrink-0">
          <span class="text-xl font-bold">🔖 图片标注</span>
          <Show when={props.imagePath()}>
            <span class="text-sm font-mono text-base-content/60 ml-4">
              {Math.round(props.zoom() * 100)}%
            </span>
          </Show>
        </div>

        {/* Center section */}
        <div class="flex items-center gap-2 flex-1 min-w-0 overflow-hidden justify-center">
          <Show when={props.imageList().length > 0}>
            <div class="flex items-center gap-2 shrink-0">
              <div class="dropdown">
                <button
                  class="btn btn-sm btn-bordered w-48 justify-between"
                  onClick={() => setDropdownOpen(!dropdownOpen())}
                >
                  <span class="truncate">
                    {props.imageList()[props.currentImageIndex()]}
                  </span>
                  <span>▼</span>
                </button>
                <Show when={dropdownOpen()}>
                  <ul class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow-lg z-30 mt-1 w-48 max-h-60 overflow-auto border border-base-300">
                    <For each={props.imageList()}>
                      {(name, index) => (
                        <li>
                          <button
                            class={index() === props.currentImageIndex() ? "active" : ""}
                            onClick={() => {
                              props.onSelectImage(index());
                              setDropdownOpen(false);
                            }}
                          >
                            {name}
                          </button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </div>
              <span class="text-sm text-base-content/60">
                {props.currentImageIndex() + 1} / {props.imageList().length}
              </span>
            </div>
          </Show>
          <Show when={props.imagePath()}>
            <div class="flex items-center gap-1 min-w-0 overflow-hidden">
              <Show when={props.categories().length === 0}>
                <span class="text-xs text-base-content/40 mr-2">
                  点击 + 添加标签
                </span>
              </Show>
              <For each={props.categories()}>
                {(cat) => (
                  <button
                    class={`btn btn-xs gap-1 ${props.currentCategoryId() === cat.id ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => props.setCurrentCategoryId(cat.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      props.removeCategory(cat.id);
                    }}
                    onDblClick={() => {
                      const newName = prompt("编辑标签名称:", cat.name);
                      if (newName?.trim())
                        props.editCategory(cat.id, newName.trim());
                    }}
                  >
                    <span
                      class="w-2 h-2 rounded-full"
                      style={{ "background-color": cat.color }}
                    ></span>
                    {cat.name}
                  </button>
                )}
              </For>
              <button
                class="btn btn-xs btn-outline btn-primary shrink-0"
                onClick={() => {
                  const name = prompt("输入新标签名称:");
                  if (name?.trim()) props.addCategory(name.trim());
                }}
              >
                + 添加标签
              </button>
            </div>
          </Show>
        </div>

        {/* Right section */}
        <div class="flex items-center gap-2 shrink-0">
          <Show
            when={props.imageList().length === 0}
            fallback={
              <button class="btn btn-success btn-sm" onClick={props.saveLabels}>
                💾 保存 JSON
              </button>
            }
          >
            <button
              class="btn btn-primary btn-sm"
              onClick={props.onSelectDirectory}
            >
              📂 选择数据文件夹
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
