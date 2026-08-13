// PWA 图标生成配置
// 从 public/logo.svg 自动生成 PWA 所需的全套图标
// 运行：pnpm generate-pwa-assets
import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

export default defineConfig({
  // 输入源图标
  images: ["public/logo.svg"],
  // 预设方案：生成 iOS/Android/桌面所需的所有尺寸
  preset: minimal2023Preset,
  // 输出到 public 目录
  outputDir: "public"
});
