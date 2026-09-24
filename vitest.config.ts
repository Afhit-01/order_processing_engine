import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false, // tests truncate shared tables between runs
    testTimeout: 20000,
  },
});
