import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/spin_simulator/",
  build: {
    outDir: "dist",
  },
  worker: {
    format: "es",
  },
});
