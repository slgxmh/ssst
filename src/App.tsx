import { createSignal, type JSX } from "solid-js";
import "./App.css";
import ImageLabelerPage from "./features/image-labeler";

interface Tool {
  id: string;
  name: string;
  icon: string;
  component: () => JSX.Element;
}

const tools: Tool[] = [
  { id: "image-labeler", name: "图片标注", icon: "🔖", component: ImageLabelerPage },
];

function App() {
  const [activeTool, setActiveTool] = createSignal(tools[0].id);

  const currentTool = () => tools.find((t) => t.id === activeTool());

  return (
    <div class="flex h-screen bg-base-200 text-base-content">
      {/* Sidebar */}
      <aside class="w-16 bg-base-100 border-r border-base-300 flex flex-col items-center py-4 gap-2 shrink-0">
        <div class="text-xl font-bold mb-4">🧰</div>
        {tools.map((tool) => (
          <button
            class={`p-2 rounded-lg transition-colors ${
              activeTool() === tool.id
                ? "bg-primary text-primary-content"
                : "hover:bg-base-200"
            }`}
            onClick={() => setActiveTool(tool.id)}
            title={tool.name}
          >
            <span class="text-xl">{tool.icon}</span>
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <main class="flex-1 min-w-0 overflow-hidden">
        {currentTool()?.component()}
      </main>
    </div>
  );
}

export default App;
