import { createSignal, Show, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

interface Label {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface Vec2 {
  x: number;
  y: number;
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

  // Zoom & pan
  const [zoom, setZoom] = createSignal(1);
  const [pan, setPan] = createSignal<Vec2>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = createSignal(false);
  const [panStart, setPanStart] = createSignal<Vec2>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = createSignal<Vec2>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = createSignal(false);
  const [naturalSize, setNaturalSize] = createSignal<Vec2>({ x: 0, y: 0 });

  let imageRef: HTMLImageElement | undefined;
  let viewportRef: HTMLDivElement | undefined;

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

  function resetView() {
    if (!viewportRef || !imageRef) return;
    const vp = viewportRef.getBoundingClientRect();
    const fitZoom = Math.min(
      vp.width / imageRef.naturalWidth,
      vp.height / imageRef.naturalHeight,
      1 // 不要放大超过 100%
    );
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (!viewportRef) return;

    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    const oldZoom = zoom();
    const newZoom = Math.max(0.02, Math.min(20, oldZoom * factor));

    const vp = viewportRef.getBoundingClientRect();
    const mouseX = e.clientX - (vp.left + vp.width / 2);
    const mouseY = e.clientY - (vp.top + vp.height / 2);

    setPan({
      x: mouseX - (mouseX - pan().x) * (newZoom / oldZoom),
      y: mouseY - (mouseY - pan().y) * (newZoom / oldZoom),
    });
    setZoom(newZoom);
  }

  function handleViewportMouseDown(e: MouseEvent) {
    if (e.button === 0 || e.button === 1) {
      // left or middle button pan
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setDragStart({ x: e.clientX, y: e.clientY });
      setHasDragged(false);
    }
  }

  function handleViewportMouseMove(e: MouseEvent) {
    if (isPanning()) {
      const dx = e.clientX - panStart().x;
      const dy = e.clientY - panStart().y;

      // 检测是否超过拖动阈值（5px）
      if (!hasDragged()) {
        const totalDx = e.clientX - dragStart().x;
        const totalDy = e.clientY - dragStart().y;
        if (Math.abs(totalDx) > 5 || Math.abs(totalDy) > 5) {
          setHasDragged(true);
        }
      }

      setPanStart({ x: e.clientX, y: e.clientY });
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  }

  function handleViewportMouseUp() {
    setIsPanning(false);
  }

  function screenToImage(clientX: number, clientY: number): Vec2 | null {
    if (!viewportRef || !imageRef) return null;
    const vp = viewportRef.getBoundingClientRect();
    const w = imageRef.naturalWidth;
    const h = imageRef.naturalHeight;

    const dx = clientX - (vp.left + vp.width / 2) - pan().x;
    const dy = clientY - (vp.top + vp.height / 2) - pan().y;

    const x = dx / zoom() + w / 2;
    const y = dy / zoom() + h / 2;

    if (x < 0 || x > w || y < 0 || y > h) return null;
    return { x, y };
  }

  function handleViewportClick(e: MouseEvent) {
    if (hasDragged() || dragId() !== null) {
      setHasDragged(false);
      return;
    }
    if (e.button !== 0) return;
    if (!imageUrl()) return;

    const pos = screenToImage(e.clientX, e.clientY);
    if (!pos) return;

    setPendingX(pos.x);
    setPendingY(pos.y);
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
    let lastX = e.clientX;
    let lastY = e.clientY;

    function onMove(ev: MouseEvent) {
      const dxScreen = ev.clientX - lastX;
      const dyScreen = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;

      const z = zoom();
      const dxImg = dxScreen / z;
      const dyImg = dyScreen / z;

      setLabels((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, x: l.x + dxImg, y: l.y + dyImg } : l
        )
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

  function editLabel(l: Label) {
    setPendingX(l.x);
    setPendingY(l.y);
    setLabelText(l.text);
    setEditingId(l.id);
    setModalOpen(true);
  }

  return (
    <div class="flex flex-col h-screen bg-base-200 text-base-content select-none">
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
          <Show when={imagePath()}>
            <span class="text-sm font-mono text-base-content/60">
              {Math.round(zoom() * 100)}%
            </span>
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
            <button class="btn btn-ghost btn-sm" onClick={resetView}>
              ⊕ 适应
            </button>
            <button class="btn btn-ghost btn-sm" onClick={clearAll}>
              🗑️ 清除
            </button>
          </Show>
        </div>
      </div>

      {/* Hint bar */}
      <Show when={imagePath()}>
        <div class="bg-base-100 border-b border-base-300 px-4 py-1 text-xs text-base-content/50 flex gap-4 shrink-0">
          <span>🖱️ 滚轮缩放</span>
          <span>🖱️ 左键拖动</span>
          <span>🖱️ 左键点击打点</span>
          <span>🖱️ 右键删除标注</span>
          <span>🖱️ 拖拽移动标注</span>
        </div>
      </Show>

      {/* Image Viewport */}
      <div
        ref={viewportRef}
        class="flex-1 min-h-0 relative overflow-hidden bg-base-300 cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleViewportMouseDown}
        onMouseMove={handleViewportMouseMove}
        onMouseUp={handleViewportMouseUp}
        onMouseLeave={handleViewportMouseUp}
        onClick={handleViewportClick}
      >
        <Show
          when={imageUrl()}
          fallback={
            <div class="absolute inset-0 flex flex-col items-center justify-center text-base-content/40 gap-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-24 w-24"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p class="text-lg">点击"选择图片"开始标注</p>
            </div>
          }
        >
          <div
            class="absolute"
            style={{
              left: "50%",
              top: "50%",
              width: `${naturalSize().x}px`,
              height: `${naturalSize().y}px`,
              transform: `translate(-50%, -50%) translate(${pan().x}px, ${pan().y}px) scale(${zoom()})`,
              "transform-origin": "center center",
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl()}
              style={{
                display: "block",
                width: `${naturalSize().x}px`,
                height: `${naturalSize().y}px`,
                "max-width": "none",
                "max-height": "none",
              }}
              draggable={false}
              onLoad={() => {
                if (imageRef) {
                  const w = imageRef.naturalWidth;
                  const h = imageRef.naturalHeight;
                  setNaturalSize({ x: w, y: h });
                  // auto-fit on first load
                  if (viewportRef) {
                    const vp = viewportRef.getBoundingClientRect();
                    const fit = Math.min(vp.width / w, vp.height / h, 1);
                    setZoom(fit);
                    setPan({ x: 0, y: 0 });
                  }
                }
              }}
            />
            {/* Labels overlay — positioned in original pixel coordinates */}
            <For each={labels()}>
              {(l) => (
                <div
                  class="absolute flex items-center gap-1 cursor-move select-none group"
                  style={{
                    left: `${l.x}px`,
                    top: `${l.y}px`,
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
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Label List */}
      <Show when={labels().length > 0}>
        <div class="shrink-0 bg-base-100 border-t border-base-300 p-4 max-h-48 overflow-auto">
          <div class="text-sm font-semibold mb-2">
            已标注 {labels().length} 个点
          </div>
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
                        <span class="badge badge-primary badge-xs">
                          {l.id}
                        </span>
                      </td>
                      <td class="font-mono text-xs">
                        {Math.round(l.x)}, {Math.round(l.y)}
                      </td>
                      <td class="text-sm">{l.text}</td>
                      <td>
                        <div class="flex gap-1">
                          <button
                            class="btn btn-ghost btn-xs"
                            onClick={() => editLabel(l)}
                          >
                            编辑
                          </button>
                          <button
                            class="btn btn-ghost btn-xs text-error"
                            onClick={() => deleteLabel(l.id)}
                          >
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
              {editingId() !== null
                ? `编辑标注 #${editingId()}`
                : `添加标注 (${Math.round(pendingX())}, ${Math.round(
                    pendingY()
                  )})`}
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
              <button class="btn" onClick={() => setModalOpen(false)}>
                取消
              </button>
              <button class="btn btn-primary" onClick={confirmLabel}>
                {editingId() !== null ? "更新" : "添加"}
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => setModalOpen(false)}
          ></div>
        </div>
      </Show>
    </div>
  );
}

export default App;
