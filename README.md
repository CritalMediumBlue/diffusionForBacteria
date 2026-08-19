# handy-diffusion

A collection of algorithms for simulating diffusion processes in JavaScript.

The package includes:

- 2D alternating-direction implicit (ADI) solver
- 1D Crank–Nicolson solver
- Analytic steady-state solution for a rectangular domain
- Effective source influence calculation
- Tridiagonal system solver (Thomas algorithm)

It is designed for the browser and Node.js using ES modules.

---

## Installation

```bash
npm install handy-diffusion
```

---

## Usage

The package exposes several named exports. Import them directly from `handy-diffusion`.

```js
import {
  ADI,
  setADIProperties,
  updateSinksAndSources,
  CrankNicolson,
  setCNProperties,
  analyticSteadyState,
  effectiveInfluence,
  thomasAlgorithm,
} from "handy-diffusion";
```

### 2D Diffusion with ADI

The ADI solver is configured in two steps:

1. Call `setADIProperties` once to initialize the grid.
2. Call `updateSinksAndSources` to provide source and sink terms.
3. Call `ADI` to advance the simulation.

```js
const width = 50;
const height = 50;
const diffusionCoefficient = 0.1;
const deltaX = 1.0;
const deltaT = 0.01;

setADIProperties(width, height, diffusionCoefficient, deltaX, deltaT);

const concentration = new Float64Array(width * height).fill(0);
const sources = new Float64Array(width * height);
const sinks = new Float64Array(width * height);

// Add a source at the center
sources[25 * width + 25] = 1.0;

updateSinksAndSources(sinks, sources);

const numberOfIterations = 1000;
ADI(concentration, numberOfIterations);
```

If negative concentrations are not allowed, `ADI` will return `null` after finishing
the iteration if any negative value was produced. Uncomment `allowNegativeValues = true`
to suppress this behavior.

```js
const result = ADI(concentration, numberOfIterations, true);
```

### 1D Diffusion with Crank–Nicolson

Initialize the solver, then call `CrankNicolson` with the concentration array,
source array, and number of time steps. The concentration array is updated in place.

```js
const length = 100;
const diffusionCoefficient = 0.2;
const deltaX = 0.1;
const deltaT = 0.005;
const decayRate = 0;

setCNProperties(length, diffusionCoefficient, deltaX, deltaT, decayRate);

const concentration = new Float64Array(length).fill(0);
const sources = new Float64Array(length);

// Add a source at the center
sources[Math.floor(length / 2)] = 1.0;

const numberOfIterations = 500;
CrankNicolson(concentration, sources, numberOfIterations);
```

The `CrankNicolson` function throws an error if a negative concentration is generated
and `allowNegativeValues` is `false` (the default). Pass `true` to allow negative values:

```js
CrankNicolson(concentration, sources, numberOfIterations, true);
```

### Analytic Steady-State Solution

Calculate the steady-state concentration for a rectangular domain with specified
source terms and decay rate.

```js
const width = 20;
const height = 20;
const diffusionRate = 0.1;
const decayRate = 0.01;
const deltaX = 0.5;
const sources = new Float64Array(width * height);
const maxMode = 30;

// Add sources as needed
sources[10 * width + 10] = 0.5;

const steadyState = analyticSteadyState(
  width,
  height,
  diffusionRate,
  decayRate,
  deltaX,
  sources,
  maxMode
);
```

The returned value is a `Float64Array` containing the steady-state concentration.

### Effective Source Influence

Compute the effective influence of a set of point sources using an exponential kernel.

```js
const width = 30;
const height = 30;
const sources = new Float64Array(width * height);
const lambda = 5.0;
const scale = 1.0;

sources[15 * width + 15] = 1.0;

const influence = effectiveInfluence(width, height, sources, lambda, scale);
```

The result is a `Float64Array` of the same size as the grid.

### Thomas Algorithm

Solve a tridiagonal linear system directly. The function requires pre-allocated work arrays.

```js
const n = 3;

const lowerDiagonal = new Float64Array([0, 1, 1]);
const mainDiagonal = new Float64Array([2, 2, 2]);
const upperDiagonal = new Float64Array([1, 1, 0]);
const rightHandSide = new Float64Array([3, 4, 3]);

const modifiedUpperDiagonal = new Float64Array(n);
const modifiedRightHandSide = new Float64Array(n);
const solution = new Float64Array(n);

thomasAlgorithm(
  lowerDiagonal,
  mainDiagonal,
  upperDiagonal,
  rightHandSide,
  n,
  modifiedUpperDiagonal,
  modifiedRightHandSide,
  solution
);

console.log(solution); // Float64Array [1, 1, 1]
```

---

## API

### `setADIProperties(width, height, diffusionCoefficient, deltaX, deltaT)`

Initializes the ADI solver for a 2D grid.

- `width` — number of grid points in the x direction
- `height` — number of grid points in the y direction
- `diffusionCoefficient` — diffusion coefficient
- `deltaX` — spatial step size
- `deltaT` — time step size

### `updateSinksAndSources(sinks, sources)`

Scales the source and sink arrays for the ADI solver. Both arrays must have length `width * height`.

### `ADI(concentrationData, totalNumberOfIterations, allowNegativeValues = false)`

Advances the 2D diffusion simulation.

- `concentrationData` — `Float64Array` of initial concentrations, modified in place
- `totalNumberOfIterations` — number of time steps
- `allowNegativeValues` — if `false`, returns `null` if any negative value appears

Returns the concentration array, or `null` if a negative value was detected and not allowed.

### `setCNProperties(length, diffusionCoefficient, deltaX, deltaT, decayRate = 0)`

Initializes the Crank–Nicolson solver for a 1D grid.

### `CrankNicolson(concentrationData, sources, totalNumberOfIterations, allowNegativeValues = false)`

Advances the 1D diffusion simulation. The concentration array is updated in place.

Throws an `Error` if a negative value is detected and `allowNegativeValues` is `false`.

### `analyticSteadyState(WIDTH, HEIGHT, DIFFUSION_RATE, DECAY_RATE, deltaX, sources, maxMode)`

Computes the analytic steady-state concentration for a rectangular domain using a cosine series expansion.

Returns a `Float64Array` of the steady-state concentration.

### `effectiveInfluence(width, height, sources, lambda, scale)`

Calculates the effective influence of sources using an exponential kernel.

Returns a `Float64Array` of influence values.

### `thomasAlgorithm(lowerDiagonal, mainDiagonal, upperDiagonal, rightHandSide, n, modifiedUpperDiagonal, modifiedRightHandSide, solution)`

Solves a tridiagonal linear system.

- `lowerDiagonal` — sub‑diagonal array (length `n`)
- `mainDiagonal` — main diagonal array (length `n`)
- `upperDiagonal` — super‑diagonal array (length `n`)
- `rightHandSide` — right‑hand side vector (length `n`)
- `n` — system size
- `modifiedUpperDiagonal` — pre‑allocated work array of length `n`
- `modifiedRightHandSide` — pre‑allocated work array of length `n`
- `solution` — pre‑allocated output array of length `n`

The solution is written into `solution`.

---

## Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/CritalMediumBlue/diffusionForBacteria.git
cd diffusionForBacteria
npm install
```

Run the test suite:

```bash
npm test
```

Lint the code:

```bash
npm run lint
```

Format the code:

```bash
npm run format
```

Generate documentation:

```bash
npm run docs
```

---

## License

MIT
