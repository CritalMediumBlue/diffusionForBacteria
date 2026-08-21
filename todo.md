# Future Plans

- [ ] Rewrite tests in TypeScript (`.test.ts`) to catch type mismatches early.
- [ ] Create literate test files (`.qmd`) for each test suite, explaining the reasoning behind tests.
- [ ] Delete leftover `src/*.js` files (including `src/index.js` and `src/helpers.js`) now that the build uses TypeScript.
- [ ] Add a `"preplot"` script to `package.json` so `npm run plot` automatically builds first.
- [ ] Consider re-enabling `noUncheckedIndexedAccess` by adding non-null assertions (`!`) in the literate sources for extra type safety.
- [ ] Expand the Quarto book with interactive diagrams, a test methodology chapter, and performance benchmarks.
- [ ] Set up a CI/CD pipeline (GitHub Actions) to run tests, build, and generate docs on every push.
- [ ] Evaluate refactoring module-level state to instance-based (classes/factories) for re-entrant simulations.
