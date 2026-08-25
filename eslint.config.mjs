import js from "@eslint/js";
import globals from "globals";

export default [
	js.configs.recommended,
	{
		ignores: [
			'node_modules/**',
			'coverage/**',
			'literate/docs/**',
		]
	},
	{
		files: ['*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.node
			}
		},
		rules: {
			'no-unused-vars': 'warn',
			'no-undef': 'error'
		}
	},
	{
		files: ['tests/**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.node,
				describe: 'readonly',
				it: 'readonly',
				expect: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
				test: 'readonly',
				vi: 'readonly'
			}
		},
		rules: {
			'no-unused-vars': 'warn',
			'no-undef': 'error'
		}
	},
	{
		files: ['literate/plotting/**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.browser
			}
		},
		rules: {
			'no-unused-vars': 'warn',
			'no-undef': 'error'
		}
	}
];
