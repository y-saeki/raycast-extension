import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // `@raycast/api` is injected by Raycast at runtime and has no entry point Vitest can resolve,
  // so tests get a minimal in-memory stand-in instead.
  resolve: {
    alias: {
      "@raycast/api": fileURLToPath(new URL("./src/test/raycastApiStub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
