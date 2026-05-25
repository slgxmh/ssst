import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Label, Vec2 } from "../types";

export function useImageLabeler() {
  let nextId = 1;

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

  let imageRefEl: HTMLImageElement | undefined;
  let viewportRefEl: HTMLDivElement | undefined;

  const imageRef = (el: HTMLImageElement) => {
    imageRefEl = el;
  };

  const viewportRef = (el: HTMLDivElement) => {
    viewportRefEl = el;
  };

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
    if (!viewportRefEl || !imageRefEl) return;
    const vp = viewportRefEl.getBoundingClientRect();
    const fitZoom = Math.min(
      vp.width / imageRefEl.naturalWidth,
      vp.height / imageRefEl.naturalHeight,
      1 // 不要放大超过 100%
    );
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (!viewportRefEl) return;

    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    const oldZoom = zoom();
    const newZoom = Math.max(0.02, Math.min(20, oldZoom * factor));

    const vp = viewportRefEl.getBoundingClientRect();
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
    if (!viewportRefEl || !imageRefEl) return null;
    const vp = viewportRefEl.getBoundingClientRect();
    const w = imageRefEl.naturalWidth;
    const h = imageRefEl.naturalHeight;

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

  function handleImageLoad() {
    if (imageRefEl) {
      const w = imageRefEl.naturalWidth;
      const h = imageRefEl.naturalHeight;
      setNaturalSize({ x: w, y: h });
      // auto-fit on first load
      if (viewportRefEl) {
        const vp = viewportRefEl.getBoundingClientRect();
        const fit = Math.min(vp.width / w, vp.height / h, 1);
        setZoom(fit);
        setPan({ x: 0, y: 0 });
      }
    }
  }

  return {
    // refs
    imageRef,
    viewportRef,
    // state signals (直接返回 signal 本身)
    imagePath,
    imageUrl,
    labels,
    zoom,
    pan,
    naturalSize,
    modalOpen,
    setModalOpen,
    labelText,
    setLabelText,
    editingId,
    dragId,
    pendingX,
    pendingY,
    // actions & handlers
    pickImage,
    saveLabels,
    resetView,
    clearAll,
    confirmLabel,
    deleteLabel,
    editLabel,
    handleWheel,
    handleViewportMouseDown,
    handleViewportMouseMove,
    handleViewportMouseUp,
    handleViewportClick,
    startDrag,
    handleContextMenu,
    handleImageLoad,
  };
}
