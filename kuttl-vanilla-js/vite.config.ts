import { defineConfig } from "vite";
import { resolve } from "path";

// Which entry to build is controlled by the BUILD_ENTRY env var.
// The npm build script runs both sequentially.
const entry = process.env["BUILD_ENTRY"] ?? "interceptjs";

const configs: Record<string, { entry: string; name: string; formats: string[] }> = {
  interceptjs: {
    entry:   resolve(__dirname, "src/index.ts"),
    name:    "InterceptJS",
    formats: ["es", "iife"],
  },
  cuttlefish: {
    entry:   resolve(__dirname, "src/cuttlefish.ts"),
    name:    "Cuttlefish",
    formats: ["iife"],
  },
};

const cfg = configs[entry] ?? configs["interceptjs"]!;

export default defineConfig({
  build: {
    lib: {
      entry:    cfg.entry,
      name:     cfg.name,
      fileName: entry,
      formats:  cfg.formats as ("es" | "iife")[],
    },
    outDir:      "dist",
    sourcemap:   true,
    minify:      false,
    emptyOutDir: entry === "interceptjs",  // only clean on first build
  },
});