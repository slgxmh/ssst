import { Show, For } from "solid-js";
import { Vec2, Label, Category } from "../types";

interface ViewportProps {
  imageUrl: () => string;
  naturalSize: () => Vec2;
  zoom: () => number;
  pan: () => Vec2;
  labels: () => Label[];
  categories: () => Category[];
  imageRef: (el: HTMLImageElement) => void;
  viewportRef: (el: HTMLDivElement) => void;
  handleWheel: (e: WheelEvent) => void;
  handleViewportMouseDown: (e: MouseEvent) => void;
  handleViewportMouseMove: (e: MouseEvent) => void;
  handleViewportMouseUp: () => void;
  handleViewportClick: (e: MouseEvent) => void;
  startDrag: (e: MouseEvent, id: number) => void;
  handleContextMenu: (e: MouseEvent, id: number) => void;
  handleImageLoad: () => void;
}

export default function Viewport(props: ViewportProps) {
  function getCategoryName(labelId: number): string {
    const cat = props.categories().find((c) => c.id === labelId);
    return cat?.name ?? "未知";
  }

  return (
    <div
      ref={props.viewportRef}
      class="flex-1 min-h-0 relative overflow-hidden bg-base-300 cursor-crosshair"
      onWheel={props.handleWheel}
      onMouseDown={props.handleViewportMouseDown}
      onMouseMove={props.handleViewportMouseMove}
      onMouseUp={props.handleViewportMouseUp}
      onMouseLeave={props.handleViewportMouseUp}
      onClick={props.handleViewportClick}
    >
      <Show
        when={props.imageUrl()}
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
            width: `${props.naturalSize().x}px`,
            height: `${props.naturalSize().y}px`,
            transform: `translate(-50%, -50%) translate(${props.pan().x}px, ${props.pan().y}px) scale(${props.zoom()})`,
            "transform-origin": "center center",
          }}
        >
          <img
            ref={props.imageRef}
            src={props.imageUrl()}
            style={{
              display: "block",
              width: `${props.naturalSize().x}px`,
              height: `${props.naturalSize().y}px`,
              "max-width": "none",
              "max-height": "none",
            }}
            draggable={false}
            onLoad={props.handleImageLoad}
          />
          {/* Labels overlay — positioned in original pixel coordinates */}
          <For each={props.labels()}>
            {(l) => (
              <div
                class="absolute flex items-center gap-1 cursor-move select-none group"
                style={{
                  left: `${l.x}px`,
                  top: `${l.y}px`,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseDown={(e) => props.startDrag(e, l.id)}
                onContextMenu={(e) => props.handleContextMenu(e, l.id)}
                title={`${getCategoryName(l.labelId)} (${Math.round(l.x)}, ${Math.round(l.y)})`}
              >
                {/* 十字准星 */}
                <svg width="16" height="16" viewBox="0 0 16 16" class="shrink-0 overflow-visible">
                  <line x1="0" y1="8" x2="16" y2="8" stroke="#ef4444" stroke-width="1.5" />
                  <line x1="8" y1="0" x2="8" y2="16" stroke="#ef4444" stroke-width="1.5" />
                  <circle cx="8" cy="8" r="1.5" fill="#ef4444" />
                </svg>
                {/* 编号 */}
                <span class="bg-red-500 text-white text-sm font-mono font-bold leading-none px-1.5 py-0.5 rounded shadow-sm">
                  {l.id}
                </span>
                <span class="bg-base-100/90 text-xs px-1.5 py-0.5 rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {getCategoryName(l.labelId)}
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
