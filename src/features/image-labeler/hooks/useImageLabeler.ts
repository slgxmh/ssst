import { createSignal } from "solid-js";
import type { Label, Vec2, Category, LabelMeAnnotation, CropConfig, CropResult } from "../types";
import {
  selectImageFileWithDirectory,
  readImageAsDataURL,
  saveAnnotationFile,
  writeFileToDirectory,
} from "../../../islands/image-labeler/utils/fileSystem";

export function useImageLabeler() {
  let nextId = 1;
  let nextCategoryId = 1;

  const [imagePath, setImagePath] = createSignal("");
  const [imageUrl, setImageUrl] = createSignal("");
  const [labels, setLabels] = createSignal<Label[]>([]);
  const [categories, setCategories] = createSignal<Category[]>([]);
  const [currentCategoryId, setCurrentCategoryId] = createSignal<number | null>(null);
  const [dragId, setDragId] = createSignal<number | null>(null);

  // Zoom & pan
  const [zoom, setZoom] = createSignal(1);
  const [pan, setPan] = createSignal<Vec2>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = createSignal(false);
  const [panStart, setPanStart] = createSignal<Vec2>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = createSignal<Vec2>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = createSignal(false);
  const [naturalSize, setNaturalSize] = createSignal<Vec2>({ x: 0, y: 0 });

  // Crop export
  const [cropModalOpen, setCropModalOpen] = createSignal(false);
  const [cropConfig, setCropConfig] = createSignal<CropConfig | null>(null);
  const [showCropGrid, setShowCropGrid] = createSignal(false);

  // Directory handle for saving
  const [dirHandle, setDirHandle] = createSignal<FileSystemDirectoryHandle | null>(null);

  // Category management
  function addCategory(name: string) {
    const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    const newCat: Category = { id: nextCategoryId++, name, color };
    setCategories((prev) => [...prev, newCat]);
    if (currentCategoryId() === null) {
      setCurrentCategoryId(newCat.id);
    }
  }

  function removeCategory(id: number) {
    const used = labels().some((l) => l.labelId === id);
    if (used) {
      alert("该标签已被使用，无法删除");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (currentCategoryId() === id) {
      const remaining = categories().filter((c) => c.id !== id);
      setCurrentCategoryId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  function editCategory(id: number, name: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
  }

  async function pickImage() {
    const { file, dirHandle: newDirHandle } = await selectImageFileWithDirectory();
    const fileName = file.name;
    setImagePath(fileName);
    setDirHandle(newDirHandle);

    const dataUrl = await readImageAsDataURL(file);
    setImageUrl(dataUrl);

    const annotation = newDirHandle
      ? await loadAnnotationFromDirHandle(newDirHandle, fileName)
      : null;

    let loadedCategories: Category[] = [];
    if (annotation && annotation.categories && annotation.categories.length > 0) {
      loadedCategories = annotation.categories;
      setCategories(loadedCategories);
      nextCategoryId = Math.max(...loadedCategories.map((c: { id: number }) => c.id)) + 1;
      setCurrentCategoryId(loadedCategories[0].id);
    } else {
      setCategories([]);
      nextCategoryId = 1;
      setCurrentCategoryId(null);
    }

    if (annotation && annotation.shapes && annotation.shapes.length > 0) {
      const loadedLabels: Label[] = annotation.shapes.map((shape: { points: number[][]; label: string }, i: number) => ({
        id: i + 1,
        x: shape.points[0][0],
        y: shape.points[0][1],
        labelId: loadedCategories.find((c) => c.name === shape.label)?.id ?? 0,
      }));
      setLabels(loadedLabels);
      nextId = loadedLabels.length + 1;
    } else {
      setLabels([]);
      nextId = 1;
    }
  }

  async function saveLabels() {
    if (!imagePath()) return;

    const annotation: LabelMeAnnotation = {
      version: "5.0",
      flags: {},
      shapes: labels().map((l) => {
        const cat = categories().find((c) => c.id === l.labelId);
        return {
          label: cat?.name ?? "未知",
          points: [[l.x, l.y]],
          group_id: null,
          shape_type: "point",
          flags: {},
        };
      }),
      imagePath: imagePath(),
      imageHeight: naturalSize().y,
      imageWidth: naturalSize().x,
      categories: categories(),
    };

    const suggestedName = imagePath().replace(/\.[^.]+$/, ".json");
    const currentDirHandle = dirHandle();

    if (currentDirHandle) {
      const blob = new Blob([JSON.stringify(annotation, null, 2)], {
        type: "application/json",
      });
      await writeFileToDirectory(currentDirHandle, suggestedName, blob);
    } else {
      await saveAnnotationFile(annotation, suggestedName);
    }

    const toast = document.getElementById("toast");
    if (toast) {
      toast.classList.add("toast-show");
      setTimeout(() => toast.classList.remove("toast-show"), 2000);
    }
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function fitToViewport(canvasW: number, canvasH: number) {
    const ns = naturalSize();
    if (ns.x === 0 || ns.y === 0) return;
    const fit = Math.min(canvasW / ns.x, canvasH / ns.y, 1);
    setZoom(fit);
    setPan({ x: 0, y: 0 });
  }

  function handleWheel(e: WheelEvent, canvasW: number, canvasH: number) {
    e.preventDefault();

    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    const oldZoom = zoom();
    const newZoom = Math.max(0.02, Math.min(20, oldZoom * factor));

    const mouseX = e.offsetX - canvasW / 2;
    const mouseY = e.offsetY - canvasH / 2;

    setPan({
      x: mouseX - (mouseX - pan().x) * (newZoom / oldZoom),
      y: mouseY - (mouseY - pan().y) * (newZoom / oldZoom),
    });
    setZoom(newZoom);
  }

  function handleViewportMouseDown(e: MouseEvent) {
    if (e.button === 0 || e.button === 1) {
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

  function screenToImage(
    offsetX: number,
    offsetY: number,
    canvasW: number,
    canvasH: number
  ): Vec2 | null {
    const w = naturalSize().x;
    const h = naturalSize().y;

    const x = (offsetX - canvasW / 2 - pan().x) / zoom() + w / 2;
    const y = (offsetY - canvasH / 2 - pan().y) / zoom() + h / 2;

    if (x < 0 || x > w || y < 0 || y > h) return null;
    return { x, y };
  }

  function handleViewportClick(e: MouseEvent, canvasW: number, canvasH: number) {
    if (hasDragged() || dragId() !== null) {
      setHasDragged(false);
      return;
    }
    if (e.button !== 0) return;
    if (!imageUrl()) return;

    const pos = screenToImage(e.offsetX, e.offsetY, canvasW, canvasH);
    if (!pos) return;

    const catId = currentCategoryId();
    if (catId === null) {
      alert("请先添加并选择一个标签");
      return;
    }

    setLabels((prev) => [
      ...prev,
      { id: nextId++, x: pos.x, y: pos.y, labelId: catId },
    ]);
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

  function editLabel(id: number) {
    const cat = categories().find((c) => c.id === id);
    if (!cat) return;
    const newName = prompt("编辑标签名称:", cat.name);
    if (newName && newName.trim()) {
      editCategory(id, newName.trim());
    }
  }

  function handleImageLoad(width: number, height: number) {
    setNaturalSize({ x: width, y: height });
  }

  async function loadAnnotationFromDirHandle(
    handle: FileSystemDirectoryHandle,
    imageFileName: string
  ): Promise<LabelMeAnnotation | null> {
    const jsonFileName = imageFileName.replace(/\.[^/.]+$/, ".json");
    try {
      const fileHandle = await handle.getFileHandle(jsonFileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return JSON.parse(content) as LabelMeAnnotation;
    } catch {
      return null;
    }
  }

  async function exportCrops(config: CropConfig, dirHandle: FileSystemDirectoryHandle): Promise<CropResult> {
    if (!imagePath()) {
      throw new Error("未选择图片");
    }

    const img = new Image();
    img.src = imageUrl();
    await new Promise((resolve) => { img.onload = resolve; });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const strideX = Math.max(1, config.tileWidth - config.overlap);
    const strideY = Math.max(1, config.tileHeight - config.overlap);

    let totalTiles = 0;
    let tilesWithLabels = 0;

    for (let y = 0, row = 0; y < imgHeight; y += strideY, row++) {
      const cropH = Math.min(config.tileHeight, imgHeight - y);
      if (cropH <= 0) break;

      for (let x = 0, col = 0; x < imgWidth; x += strideX, col++) {
        const cropW = Math.min(config.tileWidth, imgWidth - x);
        if (cropW <= 0) break;

        canvas.width = cropW;
        canvas.height = cropH;
        ctx.drawImage(img, x, y, cropW, cropH, 0, 0, cropW, cropH);

        const tileName = `${imagePath().replace(/\.[^.]+$/, "")}_crop_r${row}_c${col}`;

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/png");
        });
        await writeFileToDirectory(dirHandle, `${tileName}.png`, blob);

        const tileShapes = [];
        for (const label of labels()) {
          const cat = categories().find((c) => c.id === label.labelId);
          if (label.x >= x && label.x < x + cropW && label.y >= y && label.y < y + cropH) {
            tileShapes.push({
              label: cat?.name ?? "未知",
              points: [[label.x - x, label.y - y]],
              group_id: null,
              shape_type: "point",
              flags: {},
            });
          }
        }

        if (tileShapes.length > 0) {
          tilesWithLabels++;
        }

        const tileAnnotation: LabelMeAnnotation = {
          version: "5.0",
          flags: {},
          shapes: tileShapes,
          imagePath: `${tileName}.png`,
          imageHeight: cropH,
          imageWidth: cropW,
          categories: categories(),
        };
        const jsonBlob = new Blob([JSON.stringify(tileAnnotation, null, 2)], { type: "application/json" });
        await writeFileToDirectory(dirHandle, `${tileName}.json`, jsonBlob);

        totalTiles++;
      }
    }

    return {
      totalTiles,
      tilesWithLabels,
      outputDir: dirHandle.name,
    };
  }

  return {
    imagePath,
    imageUrl,
    labels,
    zoom,
    pan,
    naturalSize,
    dragId,
    categories,
    currentCategoryId,
    pickImage,
    saveLabels,
    resetView,
    fitToViewport,
    clearAll,
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
    addCategory,
    removeCategory,
    editCategory,
    setCurrentCategoryId,
    cropModalOpen,
    setCropModalOpen,
    cropConfig,
    setCropConfig,
    showCropGrid,
    setShowCropGrid,
    exportCrops,
    dirHandle,
  };
}
