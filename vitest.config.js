import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			'handy-diffusion': path.resolve(__dirname, 'src/index.ts'),
		},
	},
	test: {
		globals: true,
		environment: "node",
		passWithNoTests: true,
		pool: "threads",
		singleThread: false,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage",
			exclude: ["node_modules/**", "docs/**", "**/*.test.js", "vitest.config.js"],
			all: false,
		},
		testTimeout: 180000,
	},
});
