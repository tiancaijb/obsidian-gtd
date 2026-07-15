import obsidian from 'eslint-plugin-obsidianmd';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
import globals from 'globals';

export default tseslint.config(
	{ ignores: ['main.js', '*.js', 'node_modules', '.hotreload', 'version-bump.mjs', 'esbuild.config.mjs', 'eslint.config.mjs', 'coverage'] },

	// Strict type-checked rules for plugin source code (not tests)
	{
		files: ['src/**/*.ts', '!src/__tests__/**/*.ts'],
		extends: [
			...tseslint.configs.strictTypeChecked,
		],
		plugins: { obsidianmd: obsidian },
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				...globals.browser,
			},
		},
		rules: {
			// ---- Relaxed strict rules (pre-existing patterns, gradual cleanup) ----

			// 60+ non-null assertions throughout the codebase — needs gradual refactoring
			'@typescript-eslint/no-non-null-assertion': 'warn',

			// 20+ string+number concat patterns — needs gradual typing cleanup
			'@typescript-eslint/restrict-plus-operands': 'warn',

			// Floating promises are a known pattern to clean up gradually
			'@typescript-eslint/no-floating-promises': 'off',

			// Promise misuses — warn but don't block
			'@typescript-eslint/no-misused-promises': 'warn',

			// Unused vars allowed with underscore prefix
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

			// Template expressions — numbers are fine
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],

			// Unnecessary type assertions — warn only
			'@typescript-eslint/no-unnecessary-type-assertion': 'warn',

			// Obsidian API deprecations — use inline disable where needed
			'@typescript-eslint/no-deprecated': 'warn',

			// ---- Obsidian plugin rules ----
			'obsidianmd/prefer-active-doc': 'warn',
			'obsidianmd/no-static-styles-assignment': 'off',
			'obsidianmd/ui/sentence-case': 'off',
			'obsidianmd/no-unsupported-api': 'error',
			'obsidianmd/settings-tab/no-manual-html-headings': 'error',
		},
	},

	// Relaxed rules for test files (mock-heavy, type-unsafe by nature)
	{
		files: ['src/__tests__/**/*.ts'],
		extends: [
			...tseslint.configs.recommended,
			vitest.configs.recommended,
		],
		plugins: { vitest, obsidianmd: obsidian },
		languageOptions: {
			parser: tseslint.parser,
		},
		rules: {
			// Test files can use any for mocks
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/await-thenable': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/no-unnecessary-optional-chain': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/no-deprecated': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
			'@typescript-eslint/no-unnecessary-type-conversion': 'off',
			'@typescript-eslint/no-unnecessary-template-expression': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'vitest/no-focused-tests': 'warn',
			'vitest/no-identical-title': 'warn',
		},
	},
);
