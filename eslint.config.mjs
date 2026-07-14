import obsidian from 'eslint-plugin-obsidianmd';
import tseslint from 'typescript-eslint';
import vitest from 'eslint-plugin-vitest';
import globals from 'globals';

export default tseslint.config(
	{ ignores: ['main.js', '*.js', 'node_modules', '.hotreload'] },

	// Strict type-checked rules for plugin source code
	{
		files: ['src/**/*.ts'],
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

	// Vitest recommended config for test files
	{
		files: ['src/__tests__/**/*.ts'],
		...vitest.configs.recommended,
	},
);
