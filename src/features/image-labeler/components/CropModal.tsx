import { Show, createSignal, createMemo } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import type { CropConfig, CropResult } from "../types";

interface CropModalProps {
  open: () => boolean;
  onClose: () => void;
  onExport: (config: CropConfig, outputDir: string) => Promise<CropResult>;
  onConfigChange?: (config: CropConfig | null) => void;
  onPreviewChange?: (show: boolean) => void;
  naturalSize: () => { x: number; y: number };
}

export default function CropModal(props: CropModalProps) {
  const [tileWidth, setTileWidth] = createSignal(512);
  const [tileHeight, setTileHeight] = createSignal(512);
  const [overlap, setOverlap] = createSignal(128);
  const [previewGrid, setPreviewGrid] = createSignal(false);
  const [outputDir, setOutputDir] = createSignal("");
  const [exporting, setExporting] = createSignal(false);

  function notifyConfig() {
    if (props.onConfigChange) {
      props.onConfigChange({
        tileWidth: tileWidth(),
        tileHeight: tileHeight(),
        overlap: overlap(),
      });
    }
  }

  function notifyPreview(show: boolean) {
    if (props.onPreviewChange) {
      props.onPreviewChange(show);
    }
  }

  const estimate = createMemo(() => {
    const ns = props.naturalSize();
    if (ns.x === 0 || ns.y === 0) return { cols: 0, rows: 0, total: 0 };
    const strideX = Math.max(1, tileWidth() - overlap());
    const strideY = Math.max(1, tileHeight() - overlap());
    const cols = Math.ceil(ns.x / strideX);
    const rows = Math.ceil(ns.y / strideY);
    return { cols, rows, total: cols * rows };
  });

  async function pickOutputDir() {
    const dir = await open({
      directory: true,
      multiple: false,
    });
    if (typeof dir === "string") {
      setOutputDir(dir);
    }
  }

  async function handleExport() {
    if (tileWidth() <= 0 || tileHeight() <= 0) {
      alert("宽度和高度必须大于 0");
      return;
    }
    if (overlap() < 0) {
      alert("重叠像素不能为负数");
      return;
    }
    if (overlap() >= tileWidth() || overlap() >= tileHeight()) {
      alert("重叠像素必须小于宽度和高度");
      return;
    }

    setExporting(true);
    try {
      const config: CropConfig = {
        tileWidth: tileWidth(),
        tileHeight: tileHeight(),
        overlap: overlap(),
      };
      const result = await props.onExport(config, outputDir());
      alert(`导出完成！\n共生成 ${result.totalTiles} 张小图，其中 ${result.tilesWithLabels} 张包含标注。\n输出目录: ${result.outputDir}`);
      props.onClose();
    } catch (e: any) {
      alert("导出失败: " + (e?.message ?? String(e)));
    } finally {
      setExporting(false);
    }
  }

  return (
    <Show when={props.open()}>
      <div class="modal modal-open">
        <div class="modal-box max-w-md">
          <h3 class="font-bold text-lg mb-4">✂️ 裁切导出</h3>

          <div class="space-y-3">
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="label text-xs">小图宽度 (px)</label>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  min={1}
                  value={tileWidth()}
                  onInput={(e) => { setTileWidth(Number(e.currentTarget.value)); notifyConfig(); }}
                />
              </div>
              <div class="flex-1">
                <label class="label text-xs">小图高度 (px)</label>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  min={1}
                  value={tileHeight()}
                  onInput={(e) => { setTileHeight(Number(e.currentTarget.value)); notifyConfig(); }}
                />
              </div>
            </div>

            <div>
              <label class="label text-xs">重叠像素 (px)</label>
              <input
                type="number"
                class="input input-bordered input-sm w-full"
                min={0}
                value={overlap()}
                onInput={(e) => { setOverlap(Number(e.currentTarget.value)); notifyConfig(); }}
              />
            </div>

            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={previewGrid()}
                onChange={(e) => { setPreviewGrid(e.currentTarget.checked); notifyPreview(e.currentTarget.checked); }}
              />
              <span class="text-sm">预览网格</span>
            </div>

            <div>
              <label class="label text-xs">输出目录（留空则与原图同目录）</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="input input-bordered input-sm flex-1"
                  placeholder="默认与原图同目录"
                  value={outputDir()}
                  readOnly
                />
                <button class="btn btn-sm btn-outline" onClick={pickOutputDir}>
                  选择
                </button>
              </div>
            </div>

            <div class="text-xs text-base-content/60 bg-base-200 rounded px-3 py-2">
              预估：{estimate().cols} 列 × {estimate().rows} 行 = {estimate().total} 张小图
            </div>
          </div>

          <div class="modal-action">
            <button class="btn btn-sm" onClick={props.onClose} disabled={exporting()}>
              取消
            </button>
            <button
              class="btn btn-sm btn-primary"
              onClick={handleExport}
              disabled={exporting()}
            >
              {exporting() ? "导出中..." : "确认导出"}
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onClick={props.onClose}></div>
      </div>
    </Show>
  );
}
