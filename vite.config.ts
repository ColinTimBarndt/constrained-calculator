import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import * as path from "path";

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    sourcemap: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
});
