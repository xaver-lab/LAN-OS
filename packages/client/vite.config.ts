import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@lan-os/shared": resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        tv: resolve(__dirname, "tv.html"),
        play: resolve(__dirname, "play.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
