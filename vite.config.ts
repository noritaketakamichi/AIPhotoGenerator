import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import checker from "vite-plugin-checker";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  // modeに応じて.envファイルを読み込む
  const env = loadEnv(mode, process.cwd(), '');

  // VITE_API_URLが未設定の場合はローカル用URLをデフォルトとする
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000';

  return {
    plugins: [
      react(),
      checker({ typescript: true, overlay: false }),
      runtimeErrorOverlay(),
      themePlugin(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@db": path.resolve(__dirname, "db"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      proxy: {
        // 環境変数VITE_API_URLを使って、APIのURLを切り替える
        '/auth': apiUrl
      }
    }
  };
});