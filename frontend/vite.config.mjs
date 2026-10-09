import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/rpc": {
        target: "http://127.0.0.1:8545",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, "") || "/",
      },
    },
  },
});
