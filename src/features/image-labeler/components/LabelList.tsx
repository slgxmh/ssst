import { Show, For } from "solid-js";
import { Label } from "../types";

interface LabelListProps {
  labels: () => Label[];
  editLabel: (l: Label) => void;
  deleteLabel: (id: number) => void;
}

export default function LabelList(props: LabelListProps) {
  return (
    <Show when={props.labels().length > 0}>
      <div class="shrink-0 bg-base-100 border-t border-base-300 p-4 max-h-48 overflow-auto">
        <div class="text-sm font-semibold mb-2">
          已标注 {props.labels().length} 个点
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
              <For each={props.labels()}>
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
                          onClick={() => props.editLabel(l)}
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
