import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		include: ['src/__tests__/**/*.test.ts'],
		exclude: ['node_modules'],
		// Use node environment — all tests are unit/integration, no browser
		environment: 'node',
		// Restore mocks between tests for isolation
		mockReset: true,
		restoreMocks: true,
		// Use the project's existing esbuild for transformation
		esbuild: {
			target: 'es2021',
		},
		// Code coverage configuration
		// Coverage report is uploaded to Codecov in CI (see .github/workflows/lint.yml)
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			reportsDirectory: './coverage',
			include: ['src/**/*.ts'],
			exclude: ['src/__tests__/**', '**/*.test.ts'],
		},
	},
	resolve: {
		alias: {
			// Allow imports from src/ using absolute paths (same as tsconfig paths, but
			// this isn't used yet — keep for future convenience)
		},
	},
});
