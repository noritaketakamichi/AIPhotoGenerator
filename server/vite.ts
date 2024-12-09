import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import type { Server } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 開発環境でのみViteをセットアップする関数
 * 本番環境では呼ばれず、`vite.config.ts`や`vite`をインポートしないため
 * 開発用プラグインが本番で必要になることを避けることができる
 */
export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV === "development") {
    // 開発環境でのみ動的にvite.config.tsとviteを読み込む
    const { default: viteConfig } = await import(
      path.join(__dirname, "../vite.config.js")
    );
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      try {
        const clientTemplate = path.resolve(
          __dirname,
          "..",
          "client",
          "index.html",
        );
        const template = await fs.promises.readFile(clientTemplate, "utf-8");
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }
}

/**
 * 本番環境で静的ファイルを配信する関数
 * `dist/public` ディレクトリからビルド済みのフロントエンドを配信し、
 * Viteや開発用プラグインに依存しない
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));
  // ファイルが見つからなかった場合は index.html にフォールバック
  app.use("*", (_req: Request, res: Response) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
