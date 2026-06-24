import { createSignal } from "solid-js";
import HomePage from "./components/HomePage";
import BleDebug from "./components/BleDebug";
import ImageLabeler from "./features/image-labeler/ImageLabeler";

type Tab = "home" | "labeler" | "ble";

export default function App() {
  const [activeTab, setActiveTab] = createSignal<Tab>("home");

  return (
    <div class="min-h-screen bg-base-200 text-base-content">
      <div class="tabs tabs-boxed bg-base-100 rounded-none px-4 pt-2">
        <button
          class={`tab ${activeTab() === "home" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          🏠 首页
        </button>
        <button
          class={`tab ${activeTab() === "labeler" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("labeler")}
        >
          🔖 图片标注
        </button>
        <button
          class={`tab ${activeTab() === "ble" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("ble")}
        >
          🔍 BLE 调试
        </button>
      </div>

      <div class="pt-2">
        {activeTab() === "home" ? (
          <HomePage onOpenLabeler={() => setActiveTab("labeler")} />
        ) : activeTab() === "labeler" ? (
          <ImageLabeler />
        ) : (
          <BleDebug />
        )}
      </div>
    </div>
  );
}
