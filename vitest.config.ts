import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        // Point to the test-specific config that has no AI binding
        wrangler: { configPath: "./wrangler.test.toml" },
      },
    },
  },
});