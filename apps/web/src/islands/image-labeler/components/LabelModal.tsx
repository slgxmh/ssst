import { Show } from "solid-js";

interface LabelModalProps {
  modalOpen: () => boolean;
  pendingX: () => number;
  pendingY: () => number;
  labelText: () => string;
  editingId: () => number | null;
  confirmLabel: () => void;
  setModalOpen: (open: boolean) => void;
  setLabelText: (text: string) => void;
}

export default function LabelModal(props: LabelModalProps) {
  return (
    <Show when={props.modalOpen()}>
      <div class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg">
            {props.editingId() !== null
              ? `编辑标注 #${props.editingId()}`
              : `添加标注 (${Math.round(props.pendingX())}, ${Math.round(
                  props.pendingY()
                )})`}
          </h3>
          <div class="py-4">
            <input
              type="text"
              class="input input-bordered w-full"
              placeholder="输入标签文字..."
              value={props.labelText()}
              onInput={(e) => props.setLabelText(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") props.confirmLabel();
                if (e.key === "Escape") props.setModalOpen(false);
              }}
              ref={(el) => {
                if (el) setTimeout(() => el.focus(), 10);
              }}
            />
          </div>
          <div class="modal-action">
            <button class="btn" onClick={() => props.setModalOpen(false)}>
              取消
            </button>
            <button class="btn btn-primary" onClick={props.confirmLabel}>
              {props.editingId() !== null ? "更新" : "添加"}
            </button>
          </div>
        </div>
        <div
          class="modal-backdrop"
          onClick={() => props.setModalOpen(false)}
        ></div>
      </div>
    </Show>
  );
}
