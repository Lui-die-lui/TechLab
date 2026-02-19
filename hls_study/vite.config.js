import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/hls-proxy": {
        target: "https://d2zihajmogu5jn.cloudfront.net",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/hls-proxy/, ""),
      },
    },
  },
});