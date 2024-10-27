import { defineConfig } from "vite";
import dynamicImport from "vite-plugin-dynamic-import";
import * as path from "path";

export default defineConfig({
  plugins: [dynamicImport()],
  resolve: {
    alias: [
      {
        find: "~",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
  build: {
    sourcemap: true,
  },
  appType: "mpa",
});
