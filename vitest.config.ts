import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["node_modules", "internal/Guides/**"],
    environment: "node",
    globals: true,
  },
});
