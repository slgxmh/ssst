interface HomePageProps {
  onOpenLabeler: () => void;
}

export default function HomePage(props: HomePageProps) {
  return (
    <div class="min-h-screen bg-base-200">
      {/* Hero Section */}
      <div class="hero bg-base-100 border-b border-base-300">
        <div class="hero-content text-center py-16 px-4">
          <div class="max-w-2xl">
            <div class="text-6xl mb-6">🧰</div>
            <h1 class="text-5xl font-bold mb-6">SSST 工具箱</h1>
            <p class="text-xl text-base-content/70 mb-8">
              一个基于 Tauri 的桌面工具集合，集成图像标注与 BLE 调试能力。
            </p>
            <div class="flex gap-4 justify-center">
              <button class="btn btn-primary btn-lg gap-2" onClick={props.onOpenLabeler}>
                <span>🔖</span>
                图片标注
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div class="container mx-auto px-4 py-16">
        <h2 class="text-3xl font-bold text-center mb-4">功能模块</h2>
        <p class="text-center text-base-content/70 mb-12">
          点击卡片进入对应的功能区域
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <button
            class="group card bg-base-100 hover:bg-base-200 border border-base-300 hover:border-primary transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-left"
            onClick={props.onOpenLabeler}
          >
            <div class="card-body items-center text-center p-8">
              <div class="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 text-primary">
                🔖
              </div>
              <h2 class="card-title text-xl mb-2">图片标注</h2>
              <p class="text-base-content/70 text-sm">
                支持 LabelMe 格式的点标注工具，提供类别管理、网格裁剪导出等功能。
              </p>
              <div class="card-actions mt-4">
                <span class="btn btn-primary btn-sm group-hover:btn-secondary transition-colors">
                  开始使用
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </div>
            </div>
          </button>

          {/* Coming Soon Card */}
          <div class="card bg-base-100/50 border border-dashed border-base-300">
            <div class="card-body items-center text-center p-8">
              <div class="text-5xl mb-4 text-base-content/30">🚧</div>
              <h2 class="card-title text-xl mb-2 text-base-content/50">更多功能</h2>
              <p class="text-base-content/40 text-sm">敬请期待...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer class="bg-base-100 border-t border-base-300 py-8">
        <div class="container mx-auto px-4 text-center text-base-content/50">
          <p>SSST ToolBox - 个人工具箱</p>
          <p class="text-sm mt-2">基于 SolidJS + Tauri 构建</p>
        </div>
      </footer>
    </div>
  );
}
