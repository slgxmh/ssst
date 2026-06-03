import { createSignal } from "solid-js";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
}

function FeatureCard(props: FeatureCardProps) {
  return (
    <a
      href={props.href}
      class="group card bg-base-100 hover:bg-base-200 border border-base-300 hover:border-primary transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div class="card-body items-center text-center p-8">
        <div class={`text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 ${props.color}`}>
          {props.icon}
        </div>
        <h2 class="card-title text-xl mb-2">{props.title}</h2>
        <p class="text-base-content/70 text-sm">{props.description}</p>
        <div class="card-actions mt-4">
          <span class="btn btn-primary btn-sm group-hover:btn-secondary transition-colors">
            开始使用
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </div>
      </div>
    </a>
  );
}

export default function HomePage() {
  const features = [
    {
      icon: "🔖",
      title: "图片标注",
      description: "支持 LabelMe 格式的点标注工具，提供类别管理、网格裁剪导出等功能。",
      href: "/labeler",
      color: "text-primary",
    },
  ];

  return (
    <div class="min-h-screen bg-base-200">
      {/* Hero Section */}
      <div class="hero bg-base-100 border-b border-base-300">
        <div class="hero-content text-center py-16 px-4">
          <div class="max-w-2xl">
            <div class="text-6xl mb-6">🧰</div>
            <h1 class="text-5xl font-bold mb-6">SSST 工具箱</h1>
            <p class="text-xl text-base-content/70 mb-8">
              一个基于 Web 的个人工具集合，采用模块化设计，支持离线使用。
            </p>
            <div class="flex gap-4 justify-center">
              <a href="/labeler" class="btn btn-primary btn-lg gap-2">
                <span>🔖</span>
                图片标注
              </a>
              <a href="/docs" class="btn btn-ghost btn-lg gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                文档中心
              </a>
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
          {features.map((feature) => (
            <FeatureCard {...feature} />
          ))}
          
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
          <p class="text-sm mt-2">基于 SolidJS + Astro 构建</p>
        </div>
      </footer>
    </div>
  );
}
