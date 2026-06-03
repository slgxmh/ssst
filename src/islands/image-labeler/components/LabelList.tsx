import { Show, For } from "solid-js";
import { Label, Category } from "../types";

interface LabelListProps {
  labels: () => Label[];
  categories: () => Category[];
  editLabel: (id: number) => void;
  deleteLabel: (id: number) => void;
}

export default function LabelList(props: LabelListProps) {
  function getCategoryName(labelId: number): string {
    const cat = props.categories().find((c) => c.id === labelId);
    return cat?.name ?? "未知";
  }

  return (
    <Show when={props.labels().length > 0}>
      <div class="w-64 shrink-0 bg-base-100 border-r border-base-300 h-full overflow-y-auto">
        <div class="p-3 text-sm font-semibold border-b border-base-300">
          已标注 {props.labels().length} 个点
        </div>
        <div class="overflow-x-auto">
          <table class="table table-zebra table-xs">
            <thead>
              <tr>
                <th>#</th>
                <th>坐标</th>
                <th>标签</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.labels()}>
                {(l) => (
                  <tr>
                    <td>
                      <span class="badge badge-primary badge-xs">{l.id}</span>
                    </td>
                    <td class="font-mono text-xs">
                      {Math.round(l.x)}, {Math.round(l.y)}
                    </td>
                    <td class="text-sm">{getCategoryName(l.labelId)}</td>
                    <td>
                      <div class="flex gap-1">
                        <button
                          class="btn btn-ghost btn-xs"
                          onClick={() => props.editLabel(l.labelId)}
                        >
                          编辑
                        </button>
                        <button
                          class="btn btn-ghost btn-xs text-error"
                          onClick={() => props.deleteLabel(l.id)}
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
  );
}
