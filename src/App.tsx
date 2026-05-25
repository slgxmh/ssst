import { createSignal, Show, For, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

interface Label {
  id: number;
  x: number;
  y: number;
  text: string;
}

let nextId = 1;

function App() {
  const [imagePath, setImagePath] = createSignal("");
  const [imageUrl, setImageUrl] = createSignal("");
  const [labels, setLabels] = createSignal<Label[]>([]);
  const [modalOpen, setModalOpen] = createSignal(false);
  const [pendingX, setPendingX] = createSignal(0);
  const [pendingY, setPendingY] = createSignal(0);
  const [labelText, setLabelText] = createSignal("");
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [dragId, setDragId] = createSignal<number | null>(null);
  const [containerSize, setContainerSize] = createSignal({ w: 0, h: 0 });

  let imageRef: HTMLImageElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (containerRef) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerSize({
            w: entry.contentRect.width,
            h: entry.contentRect.height,
          });
        }
      });
      observer.observe(containerRef);
    }
  });

  async function pickImage() {
    const path = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "图片",
          extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp"],
        },
      ],
    });

    if (typeof path === "string") {
      setImagePath(path);
      const dataUrl = await invoke<string>("read_image", { imagePath: path });
      setImageUrl(dataUrl);
      nextId = 1;
      const existing = await invoke<Label[]>("load_labels", { imagePath: path });
      if (existing.length > 0) {
        setLabels(existing);
        nextId = Math.max(...existing.map((l) => l.id)) + 1;
      } else {
        setLabels([]);
      }
    }
  }

  async function saveLabels() {
    if (!imagePath()) return;
    await invoke("save_labels", {
      imagePath: imagePath(),
      labels: labels(),
    });
    const toast = document.getElementById("toast");
    if (toast) {
      toast.classList.add("toast-show");
      setTimeout(() => toast.classList.remove("toast-show"), 2000);
    }
  }

  function handleImageClick(e: MouseEvent) {
    if (dragId() !== null) return;
    if (!imageRef) return;
    const rect = imageRef.getBoundingClientRect();
    const scaleX = imageRef.naturalWidth / rect.width;
    const scaleY = imageRef.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setPendingX(x);
    setPendingY(y);
    setLabelText("");
    setEditingId(null);
    setModalOpen(true);
  }

  function confirmLabel() {
    const text = labelText().trim();
    if (!text) return;

    if (editingId() !== null) {
      setLabels((prev) =>
        prev.map((l) => (l.id === editingId() ? { ...l, text } : l))
      );
    } else {
      setLabels((prev) => [
        ...prev,
        { id: nextId++, x: pendingX(), y: pendingY(), text },
      ]);
    }
    setModalOpen(false);
    setLabelText("");
  }

  function deleteLabel(id: number) {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  }

  function clearAll() {
    if (confirm("确定清除所有标注？")) {
      setLabels([]);
    }
  }

  function startDrag(e: MouseEvent, id: number) {
    e.stopPropagation();
    e.preventDefault();
    setDragId(id);

    function onMove(ev: MouseEvent) {
      if (!imageRef || dragId() === null) return;
      const rect = imageRef.getBoundingClientRect();
      const scaleX = imageRef.naturalWidth / rect.width;
      const scaleY = imageRef.naturalHeight / rect.height;
      const x = Math.max(0, Math.min(imageRef.naturalWidth, (ev.clientX - rect.left) * scaleX));
      const y = Math.max(0, Math.min(imageRef.naturalHeight, (ev.clientY - rect.top) * scaleY));
      setLabels((prev) =>
        prev.map((l) => (l.id === id ? { ...l, x, y } : l))
      );
    }

    function onUp() {
      setDragId(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleContextMenu(e: MouseEvent, id: number) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("删除此标注？")) {
      deleteLabel(id);
    }
  }

  function getDisplayPoint(l: Label) {
    if (!imageRef) return { x: 0, y: 0 };
    const rect = imageRef.getBoundingClientRect();
    const scaleX = rect.width / imageRef.naturalWidth;
    const scaleY = rect.height / imageRef.naturalHeight;
    return {
      x: l.x * scaleX,
      y: l.y * scaleY,
    };
  }

  function editLabel(l: Label) {
    setPendingX(l.x);
    setPendingY(l.y);
    setLabelText(l.text);
    setEditingId(l.id);
    setModalOpen(true);
  }

  return (
    <div class="flex flex-col h-screen bg-base-200 text-base-content">
      {/* Toast */}
      <div id="toast" class="toast toast-top toast-center opacity-0 transition-opacity duration-300 z-50">
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
          <Show when={!imagePath()}>
            <span class="text-sm text-base-content/60">先选择一张图片</span>
          </Show>
        </div>
        <div class="navbar-end gap-2">
          <button class="btn btn-primary btn-sm" onClick={pickImage}>
            📂 选择图片
          </button>
          <Show when={imagePath()}>
            <button class="btn btn-success btn-sm" onClick={saveLabels}>
              💾 保存 CSV
            </button>
            <button class="btn btn-ghost btn-sm" onClick={clearAll}>
              🗑️ 清除
            </button>
          </Show>
        </div>
      </div>

      {/* Image Area */}
      <div class="flex-1 min-h-0 p-4 flex justify-center items-center overflow-auto">
        <Show
          when={imageUrl()}
          fallback={
            <div class="flex flex-col items-center justify-center text-base-content/40 gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-lg">点击"选择图片"开始标注</p>
            </div>
          }
        >
          <div ref={containerRef} class="relative inline-block max-w-full max-h-full">
            <img
              ref={imageRef}
              src={imageUrl()}
              class="max-w-full max-h-[calc(100vh-280px)] object-contain select-none cursor-crosshair rounded-lg shadow-lg"
              draggable={false}
              onClick={handleImageClick}
            />
            {/* Points overlay */}
            <For each={labels()}>
              {(l) => {
                const pos = () => getDisplayPoint(l);
                return (
                  <div
                    class="absolute flex items-center gap-1 cursor-move select-none group"
                    style={{
                      left: `${pos().x}px`,
                      top: `${pos().y}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    onMouseDown={(e) => startDrag(e, l.id)}
                    onContextMenu={(e) => handleContextMenu(e, l.id)}
                    title={`${l.text} (${Math.round(l.x)}, ${Math.round(l.y)})`}
                  >
                    <span class="badge badge-primary badge-sm shadow-md font-mono">
                      {l.id}
                    </span>
                    <span class="bg-base-100/90 text-xs px-1.5 py-0.5 rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {l.text}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>

      {/* Label List */}
      <Show when={labels().length > 0}>
        <div class="shrink-0 bg-base-100 border-t border-base-300 p-4 max-h-48 overflow-auto">
          <div class="text-sm font-semibold mb-2">已标注 {labels().length} 个点</div>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-xs">
              <thead>
                <tr>
                  <th class="w-12">#</th>
                  <th class="w-32">坐标</th>
                  <th>标签</th>
                  <th class="w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                <For each={labels()}>
                  {(l) => (
                    <tr>
                      <td>
                        <span class="badge badge-primary badge-xs">{l.id}</span>
                      </td>
                      <td class="font-mono text-xs">
                        {Math.round(l.x)}, {Math.round(l.y)}
                      </td>
                      <td class="text-sm">{l.text}</td>
                      <td>
                        <div class="flex gap-1">
                          <button class="btn btn-ghost btn-xs" onClick={() => editLabel(l)}>
                            编辑
                          </button>
                          <button class="btn btn-ghost btn-xs text-error" onClick={() => deleteLabel(l.id)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* Modal */}
      <Show when={modalOpen()}>
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg">
              {editingId() !== null ? `编辑标注 #${editingId()}` : `添加标注 (${Math.round(pendingX())}, ${Math.round(pendingY())})`}
            </h3>
            <div class="py-4">
              <input
                type="text"
                class="input input-bordered w-full"
                placeholder="输入标签文字..."
                value={labelText()}
                onInput={(e) => setLabelText(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmLabel();
                  if (e.key === "Escape") setModalOpen(false);
                }}
                ref={(el) => {
                  if (el) setTimeout(() => el.focus(), 10);
                }}
              />
            </div>
            <div class="modal-action">
              <button class="btn" onClick={() => setModalOpen(false)}>取消</button>
              <button class="btn btn-primary" onClick={confirmLabel}>
                {editingId() !== null ? "更新" : "添加"}
              </button>
            </div>
          </div>
          <div class="modal-backdrop" onClick={() => setModalOpen(false)}></div>
        </div>
      </Show>
    </div>
  );
}

export default App;
