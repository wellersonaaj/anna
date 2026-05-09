import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Prefer TS sources over stale compiled `.js` twins in `src/`.
    extensions: [".mjs", ".mts", ".ts", ".tsx", ".jsx", ".js", ".json"]
  }
});
