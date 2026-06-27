import obsidian from 'eslint-plugin-obsidianmd';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['main.js', '*.js', 'node_modules', '.hotreload'] },
	{
		files: ['src/**/*.ts'],
		extends: [tseslint.configs.recommended],
		plugins: { obsidianmd: obsidian },
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-misused-promises': 'warn',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
			'@typescript-eslint/no-unnecessary-type-assertion': 'warn',
			'obsidianmd/prefer-active-doc': 'warn',
			'obsidianmd/no-static-styles-assignment': 'off',
			'obsidianmd/ui/sentence-case': 'off',
			'obsidianmd/no-unsupported-api': 'error',
			'obsidianmd/settings-tab/no-manual-html-headings': 'error',
		},
	},
);
