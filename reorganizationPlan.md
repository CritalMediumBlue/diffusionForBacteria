# Package Reorganization Plan

This plan flattens the current repository into a single standard publishable npm package.

---

## 1. Objective

- Keep `handy-diffusion` as the root npm package.
- Move all tests, tooling, and examples under the root package.
- Remove the nested `tests/diffusionAlgorithms` package.
- Produce a clean published tarball containing only runtime library files.
- Preserve the current public API and runtime behavior exactly.

---

## 2. Current Issues

1. There are two independent `package.json` files:
   - `/package.json` — the library.
   - `/tests/diffusionAlgorithms/package.json` — a standalone test project.

2. The test project depends on `handy-diffusion` from npm, not the local source.

3. The root `.gitignore` is almost empty and does not ignore `node_modules/`.

4. There are two `package-lock.json` files and two `node_modules/` directories.

5. The root package has no working `npm test` script.

---

## 3. Target Layout

After the refactor, the repository should look like this:

```text
.
├── ADI.js
├── analyticSolution.js
├── bessel.js
├── CrankNicolson.js
├── effective.js
├── helpers.js
├── index.d.ts
├── index.js
├── initArrays.js
├── LICENSE
├── README.md
├── eslint.config.mjs
├── jsdoc.json
├── package.json
├── package-lock.json
├── .prettierrc
├── thomasAlgorithm.js
├── vitest.config.js
├── .gitignore
├── plotting/
├── plottingarticle2D/
└── tests/
    ├── setup.js
    ├── helpers.js
    ├── plotHelper.js
    └── *.test.js
```

`plotting/` and `plottingarticle2D/` are development examples only and will not be published.

---

## 4. Implementation Steps

### 4.1 Update root `package.json`

Replace the root `package.json` with the following.

This:

- adds ESM metadata,
- adds an explicit `files` allowlist for publishing,
- adds `exports` for modern Node resolution,
- moves test/plot tooling into `devDependencies`,
- keeps only `bessel` as a runtime dependency,
- fixes the ESLint version.

```json
{
  "name": "handy-diffusion",
  "version": "1.0.11",
  "description": "algorithms to simulate diffusion",
  "type": "module",
  "main": "index.js",
  "types": "index.d.ts",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "import": "./index.js",
      "default": "./index.js"
    }
  },
  "files": [
    "index.js",
    "index.d.ts",
    "ADI.js",
    "analyticSolution.js",
    "bessel.js",
    "CrankNicolson.js",
    "effective.js",
    "helpers.js",
    "initArrays.js",
    "thomasAlgorithm.js",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": false,
  "scripts": {
    "test": "vitest run",
    "test:ui": "vitest --ui --open --api.port 51204",
    "coverage": "vitest run --coverage",
    "coverage:serve": "npx http-server coverage -p 8080 -o",
    "lint": "eslint \"*.js\" \"tests/**/*.js\" \"plotting/**/*.js\" \"plottingarticle2D/**/*.js\"",
    "lint:fix": "eslint \"*.js\" \"tests/**/*.js\" \"plotting/**/*.js\" \"plottingarticle2D/**/*.js\" --fix",
    "format": "prettier --write \"*.js\" \"tests/**/*.js\" \"plotting/**/*.js\" \"plottingarticle2D/**/*.js\" \"*.json\" \"*.md\"",
    "format:check": "prettier --check \"*.js\" \"tests/**/*.js\" \"plotting/**/*.js\" \"plottingarticle2D/**/*.js\" \"*.json\" \"*.md\"",
    "docs": "jsdoc -c jsdoc.json",
    "docs:serve": "npx http-server docs -p 8081 -o",
    "plot": "vite plotting",
    "plot:article2D": "vite plottingarticle2D"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/CritalMediumBlue/diffusionForBacteria.git"
  },
  "keywords": [
    "diffusion",
    "ADI",
    "Crank-Nicolson"
  ],
  "author": "Ricardo",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/CritalMediumBlue/diffusionForBacteria/issues"
  },
  "homepage": "https://github.com/CritalMediumBlue/diffusionForBacteria#readme",
  "dependencies": {
    "bessel": "^1.0.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.2",
    "@vitest/coverage-v8": "^4.0.16",
    "@vitest/ui": "^4.0.16",
    "eslint": "^9.39.2",
    "globals": "^17.0.0",
    "jsdoc": "^4.0.5",
    "plotly.js-dist": "^3.3.1",
    "prettier": "^3.7.4",
    "vite": "^7.3.1",
    "vitest": "^4.0.16"
  }
}
```

---

### 4.2 Move files into the correct locations

Run these filesystem operations from the repository root:

```bash
# Test files
mv tests/diffusionAlgorithms/tests/* tests/

# Test helper that was nested under src
mv tests/diffusionAlgorithms/src/helpers.js tests/helpers.js

# Tooling configs
mv tests/diffusionAlgorithms/vitest.config.js .
mv tests/diffusionAlgorithms/eslint.config.mjs .
mv tests/diffusionAlgorithms/jsdoc.json .
mv tests/diffusionAlgorithms/.prettierrc .

# Plotting examples
mv tests/diffusionAlgorithms/plotting .
mv tests/diffusionAlgorithms/plottingarticle2D .

# License
mv tests/diffusionAlgorithms/LICENSE .

# Remove generated test plots and nested dependencies
rm -rf tests/diffusionAlgorithms/test-plots
rm -rf tests/diffusionAlgorithms/node_modules

# Remove the nested package directory entirely
rm -rf tests/diffusionAlgorithms
```

---

### 4.3 Update imports in moved test files

All test files now live under `/tests`, so internal test imports must change.

Apply these replacements:

| Old import | New import |
|---|---|
| `from '../src/helpers.js'` | `from './helpers.js'` |
| `from '../tests/setup.js'` | `from './setup.js'` |
| `from '../plotHelper.js'` | `from './plotHelper.js'` |

Do **not** change imports from `'handy-diffusion'`.

---

### 4.4 Update Vitest config

Move `vitest.config.js` to the root as instructed.

Verify or set these paths relative to the root:

```js
setupFiles: ['./tests/setup.js'],
coverage: {
  reportsDirectory: './coverage',
  exclude: [
    'node_modules/**',
    'docs/**',
    '**/*.test.js',
    'vitest.config.js',
    'test-plots/**'
  ]
}
```

---

### 4.5 Update ESLint config

Move `eslint.config.mjs` to the root.

Replace its file patterns so it lints root source files, tests, and plotting examples:

```js
export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'docs/**',
      'test-plots/**'
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
  }
];
```

---

### 4.6 Update JSDoc config

Move `jsdoc.json` to the root.

Update the `source.include` block to document the root source files:

```json
"source": {
  "include": [
    "ADI.js",
    "analyticSolution.js",
    "bessel.js",
    "CrankNicolson.js",
    "effective.js",
    "helpers.js",
    "initArrays.js",
    "thomasAlgorithm.js",
    "index.js"
  ],
  "excludePattern": "(test|spec)\\.js$"
}
```

---

### 4.7 Keep `.prettierrc`

Move `.prettierrc` to the root as-is.

No path changes are needed.

---

### 4.8 Update root `.gitignore`

Replace the root `.gitignore` with:

```gitignore
node_modules/
coverage/
docs/
dist/
build/
test-plots/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
.env
.env.*
!.env.example
.eslintcache
.node_repl_history
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
*~
*.tmp
*.temp
.cache/

# Local AI tool state
.aider*
```

---

### 4.9 Regenerate the root lockfile

Run:

```bash
npm install
```

This creates a single root `node_modules/` and a single valid `package-lock.json`.

---

### 4.10 Update root `README.md`

Replace the root `README.md` with package documentation.

At minimum include:

- package name and description
- installation instructions
- quick-start example
- development commands:

```bash
npm install
npm test
npm run lint
npm run format:check
npm run docs
```

The old nested `tests/diffusionAlgorithms/README.md` can be reused as a starting point, but it must be rewritten as package documentation rather than test-project documentation.

---

### 4.11 Final validation

Run all of these from the repository root:

```bash
npm test
npm run lint
npm run format:check
npm run docs
npm pack --dry-run
```

The `npm pack --dry-run` output must contain only:

```text
README.md
LICENSE
package.json
index.js
index.d.ts
ADI.js
analyticSolution.js
bessel.js
CrankNicolson.js
effective.js
helpers.js
initArrays.js
thomasAlgorithm.js
```

It must **not** contain:

- `tests/`
- `plotting/`
- `plottingarticle2D/`
- `node_modules/`
- `.env`
- `.aider*`
- test config files

---

## 5. Rollback

Because everything is tracked by Git, the safest rollback is:

```bash
git checkout -- .
git clean -fd
```

This should only be used before committing the refactor.
