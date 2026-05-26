import { Show, createSignal, createEffect } from "solid-js";
import Konva from "konva";
import type { Label, Vec2, Category } from "../types";

interface ViewportProps {
  imageUrl: () => string;
  naturalSize: () => Vec2;
  zoom: () => number;
  pan: () => Vec2;
  labels: () => Label[];
  categories: () => Category[];
  handleWheel: (e: WheelEvent, canvasW: number, canvasH: number) => void;
  handleViewportMouseDown: (e: MouseEvent) => void;
  handleViewportMouseMove: (e: MouseEvent) => void;
  handleViewportMouseUp: () => void;
  handleViewportClick: (e: MouseEvent, canvasW: number, canvasH: number) => void;
  startDrag: (e: MouseEvent, id: number) => void;
  handleContextMenu: (e: MouseEvent, id: number) => void;
  handleImageLoad: (width: number, height: number) => void;
  fitToViewport: (canvasW: number, canvasH: number) => void;
}

export default function Viewport(props: ViewportProps) {
  let stage: Konva.Stage | undefined;
  let imageLayer: Konva.Layer | undefined;
  let labelLayer: Konva.Layer | undefined;
  let transformGroup: Konva.Group | undefined;
  let konvaImage: Konva.Image | undefined;

  const [hoveredLabel, setHoveredLabel] = createSignal<Label | null>(null);
  const [tooltipPos, setTooltipPos] = createSignal({ x: 0, y: 0 });

  function getCategoryName(labelId: number): string {
    const cat = props.categories().find((c) => c.id === labelId);
    return cat?.name ?? "未知";
  }

  function renderView() {
    const z = props.zoom();
    const p = props.pan();
    const ns = props.naturalSize();

    if (!stage || !transformGroup || !labelLayer || !imageLayer || ns.x === 0) return;

    transformGroup.x(stage.width() / 2 + p.x);
    transformGroup.y(stage.height() / 2 + p.y);
    transformGroup.scaleX(z);
    transformGroup.scaleY(z);

    rebuildLabels(z, p, ns, stage.width(), stage.height());
    imageLayer.batchDraw();
  }

  function rebuildLabels(z: number, p: Vec2, ns: Vec2, stageW: number, stageH: number) {
    if (!labelLayer) return;

    labelLayer.destroyChildren();

    const cx = stageW / 2;
    const cy = stageH / 2;

    for (const label of props.labels()) {
      const sx = cx + p.x + (label.x - ns.x / 2) * z;
      const sy = cy + p.y + (label.y - ns.y / 2) * z;

      const group = new Konva.Group({ x: sx, y: sy });

      // 十字横线
      group.add(
        new Konva.Line({
          points: [-8, 0, 8, 0],
          stroke: "#ef4444",
          strokeWidth: 1.5,
          listening: false,
        })
      );

      // 十字竖线
      group.add(
        new Konva.Line({
          points: [0, -8, 0, 8],
          stroke: "#ef4444",
          strokeWidth: 1.5,
          listening: false,
        })
      );

      // 中心圆点
      group.add(
        new Konva.Circle({
          radius: 1.5,
          fill: "#ef4444",
          listening: false,
        })
      );

      // 编号 Label（红色圆角矩形背景）
      const idLabel = new Konva.Label({ x: 10, y: -8 });
      idLabel.add(
        new Konva.Tag({
          fill: "#ef4444",
          cornerRadius: 3,
          shadowColor: "black",
          shadowBlur: 2,
          shadowOpacity: 0.2,
          listening: false,
        })
      );
      idLabel.add(
        new Konva.Text({
          text: String(label.id),
          fontFamily: "monospace",
          fontSize: 12,
          fontStyle: "bold",
          fill: "white",
          padding: 3,
          listening: false,
        })
      );
      group.add(idLabel);

      // 事件绑定
      group.on("mousedown", (e) => {
        e.cancelBubble = true;
        props.startDrag(e.evt, label.id);
      });

      group.on("contextmenu", (e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        props.handleContextMenu(e.evt, label.id);
      });

      group.on("mouseenter", () => {
        setHoveredLabel(label);
        setTooltipPos({ x: sx + 20, y: sy + 10 });
      });

      group.on("mouseleave", () => {
        setHoveredLabel(null);
      });

      labelLayer.add(group);
    }

    labelLayer.batchDraw();
  }

  function initContainer(el: HTMLDivElement) {
    stage = new Konva.Stage({
      container: el,
      width: el.clientWidth,
      height: el.clientHeight,
    });

    imageLayer = new Konva.Layer();
    labelLayer = new Konva.Layer();
    stage.add(imageLayer);
    stage.add(labelLayer);

    transformGroup = new Konva.Group({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
    imageLayer.add(transformGroup);

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      stage!.width(rect.width);
      stage!.height(rect.height);
      renderView();
    });
    ro.observe(el);

    // Stage 级别事件
    stage.on("wheel", (e) => {
      e.evt.preventDefault();
      props.handleWheel(e.evt, stage!.width(), stage!.height());
    });

    stage.on("mousedown", (e) => {
      props.handleViewportMouseDown(e.evt);
    });

    stage.on("mousemove", (e) => {
      props.handleViewportMouseMove(e.evt);
    });

    stage.on("mouseup", () => {
      props.handleViewportMouseUp();
    });

    stage.on("click", (e) => {
      if (e.target === stage) {
        props.handleViewportClick(e.evt, stage!.width(), stage!.height());
      }
    });

    stage.on("contextmenu", (e) => {
      e.evt.preventDefault();
    });

    return () => {
      ro.disconnect();
      stage!.destroy();
      stage = undefined;
      imageLayer = undefined;
      labelLayer = undefined;
      transformGroup = undefined;
      konvaImage = undefined;
    };
  }

  // 图片加载
  createEffect(() => {
    const url = props.imageUrl();
    if (!url || !transformGroup) return;

    const img = new Image();
    img.onload = () => {
      if (konvaImage) {
        konvaImage.destroy();
      }
      konvaImage = new Konva.Image({
        image: img,
        x: -img.naturalWidth / 2,
        y: -img.naturalHeight / 2,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      transformGroup!.add(konvaImage);
      imageLayer!.batchDraw();

      props.handleImageLoad(img.naturalWidth, img.naturalHeight);
      if (stage) {
        props.fitToViewport(stage.width(), stage.height());
      }
    };
    img.src = url;
  });

  // 监听变化并重绘
  createEffect(() => {
    // 建立依赖追踪
    props.zoom();
    props.pan();
    props.labels();
    props.categories();
    props.naturalSize();
    renderView();
  });

  return (
    <div class="flex-1 min-h-0 relative overflow-hidden bg-base-300 cursor-crosshair">
      <Show
        when={props.imageUrl()}
        fallback={
          <div class="absolute inset-0 flex flex-col items-center justify-center text-base-content/40 gap-4 pointer-events-none">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2z"
              />
            </svg>
            <p class="text-lg">点击"选择图片"开始标注</p>
          </div>
        }
      >
        <div ref={initContainer} class="w-full h-full" />
        <Show when={hoveredLabel()}>
          {(l) => {
            const label = l();
            return (
              <div
                class="absolute pointer-events-none bg-base-100/90 text-xs px-2 py-1 rounded shadow-md z-10 whitespace-nowrap"
                style={{
                  left: `${tooltipPos().x}px`,
                  top: `${tooltipPos().y}px`,
                }}
              >
                {getCategoryName(label.labelId)} ({Math.round(label.x)},{" "}
                {Math.round(label.y)})
              </div>
            );
          }}
        </Show>
      </Show>
    </div>
  );
}
