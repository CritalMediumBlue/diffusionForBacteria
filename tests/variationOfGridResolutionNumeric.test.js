import { ADI, setADIProperties, updateSinksAndSources } from "handy-diffusion";
import { describe, test, expect } from "vitest";
import { checkForSteadyState } from "./src/helpers.js";
import { mulberry32 } from "./random.js";

// ---------------------------------------------------------------------------
// Physical domain is constant across all resolutions:
//   100 × 60  physical units
// Each test case discretises this domain with a different deltaX.
// ---------------------------------------------------------------------------

const TestCases = [
    {
        diffusionCoefficient: 100,
        deltaX: 0.5,
        width: 200,
        height: 120,
        decayRate: 0.01,
        deltaT: 0.5,
    },
    {
        diffusionCoefficient: 100,
        deltaX: 0.25,
        width: 400,
        height: 240,
        decayRate: 0.01,
        deltaT: 0.5,
    },
    { diffusionCoefficient: 100, deltaX: 2, width: 50, height: 30, decayRate: 0.01, deltaT: 0.5 },
    {
        diffusionCoefficient: 100,
        deltaX: 0.8,
        width: 125,
        height: 75,
        decayRate: 0.01,
        deltaT: 0.5,
    },
    {
        diffusionCoefficient: 100,
        deltaX: 0.4,
        width: 250,
        height: 150,
        decayRate: 0.01,
        deltaT: 0.5,
    },
];

const defaultCase = {
    diffusionCoefficient: 100,
    deltaX: 1,
    width: 100,
    height: 60,
    decayRate: 0.01,
    deltaT: 0.5,
};

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/**
 * Generate source positions in *physical* coordinates.
 * Positions are placed at default-grid cell centres: (i+0.5)*defaultDeltaX.
 * Returns [{px, py, strength}, …].
 */
function generatePhysicalSources(defaultWidth, defaultHeight, defaultDeltaX, probability, rng) {
    const positions = [];
    for (let j = 0; j < defaultHeight; j++) {
        for (let i = 0; i < defaultWidth; i++) {
            if (rng() < probability) {
                positions.push({
                    px: (i + 0.5) * defaultDeltaX,
                    py: (j + 0.5) * defaultDeltaX,
                    strength: 1.0,
                });
            }
        }
    }
    // guarantee at least one source at the domain centre
    const cx = (Math.floor(defaultWidth / 2) + 0.5) * defaultDeltaX;
    const cy = (Math.floor(defaultHeight / 2) + 0.5) * defaultDeltaX;
    if (!positions.some((p) => Math.abs(p.px - cx) < 1e-10 && Math.abs(p.py - cy) < 1e-10)) {
        positions.push({ px: cx, py: cy, strength: 1.0 });
    }
    return positions;
}

/**
 * Map physical source positions onto a grid.
 *
 * Source strength is scaled by (defaultDeltaX / deltaX)² so that the
 * *total emission rate* of each point source is preserved across
 * resolutions:  source_value × deltaX² = const.
 *
 * Multiple sources that fall into the same coarse cell are accumulated.
 */
function mapSourcesToGrid(positions, width, height, deltaX, defaultDeltaX) {
    const sources = new Float64Array(width * height).fill(0);
    const scale = (defaultDeltaX * defaultDeltaX) / (deltaX * deltaX);
    for (const { px, py, strength } of positions) {
        const i = Math.floor(px / deltaX);
        const j = Math.floor(py / deltaX);
        if (i >= 0 && i < width && j >= 0 && j < height) {
            sources[j * width + i] += strength * scale;
        }
    }
    return sources;
}

/**
 * Bilinear interpolation: sample `grid` (testWidth × testHeight, spacing
 * testDeltaX) at the cell-centre physical coordinates of the default grid
 * (defaultWidth × defaultHeight, spacing defaultDeltaX).
 *
 * Returns a Float64Array of size defaultWidth × defaultHeight so that both
 * solutions can be compared element-wise.
 */
function sampleAtDefaultGrid(
    grid,
    testWidth,
    testHeight,
    testDeltaX,
    defaultWidth,
    defaultHeight,
    defaultDeltaX
) {
    const sampled = new Float64Array(defaultWidth * defaultHeight);
    for (let jd = 0; jd < defaultHeight; jd++) {
        for (let id = 0; id < defaultWidth; id++) {
            const px = (id + 0.5) * defaultDeltaX;
            const py = (jd + 0.5) * defaultDeltaX;

            // continuous cell-centre index in the test grid
            const fi = px / testDeltaX - 0.5;
            const fj = py / testDeltaX - 0.5;

            const i0 = Math.max(0, Math.min(Math.floor(fi), testWidth - 2));
            const j0 = Math.max(0, Math.min(Math.floor(fj), testHeight - 2));
            const i1 = i0 + 1;
            const j1 = j0 + 1;
            const dx = Math.max(0, Math.min(fi - i0, 1));
            const dy = Math.max(0, Math.min(fj - j0, 1));

            sampled[jd * defaultWidth + id] =
                grid[j0 * testWidth + i0] * (1 - dx) * (1 - dy) +
                grid[j0 * testWidth + i1] * dx * (1 - dy) +
                grid[j1 * testWidth + i0] * (1 - dx) * dy +
                grid[j1 * testWidth + i1] * dx * dy;
        }
    }
    return sampled;
}

/** Run ADI to steady state and return the solution */
function solveToSteadyState(width, height, diffCoeff, deltaX, deltaT, sources, sinks) {
    setADIProperties(width, height, diffCoeff, deltaX, deltaT);
    updateSinksAndSources(sinks, sources);
    const solution = new Float64Array(width * height).fill(0);
    let steady = false;
    while (!steady) {
        const prev = solution.slice();
        ADI(solution, 100, true);
        steady = checkForSteadyState(prev, solution, 1e-7);
    }
    return solution;
}

/** Return max of a typed array (avoids stack overflow from Math.max(...arr)) */
function arrayMax(arr) {
    let m = -Infinity;
    for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
    return m;
}
function arrayMin(arr) {
    let m = Infinity;
    for (let i = 0; i < arr.length; i++) if (arr[i] < m) m = arr[i];
    return m;
}

// ---------------------------------------------------------------------------
//  Test suite
// ---------------------------------------------------------------------------

describe("Numerical Solution with Varying space resolution vs Default Case of dx=1", () => {
    // 1) Generate reproducible source positions in physical coordinates
    const rng = mulberry32(42);
    const physicalSources = generatePhysicalSources(
        defaultCase.width,
        defaultCase.height,
        defaultCase.deltaX,
        0.02,
        rng
    );

    // 2) Solve the reference (default) case once
    const defaultSources = mapSourcesToGrid(
        physicalSources,
        defaultCase.width,
        defaultCase.height,
        defaultCase.deltaX,
        defaultCase.deltaX // scale = 1
    );
    const defaultSinks = new Float64Array(defaultCase.width * defaultCase.height).fill(
        defaultCase.decayRate
    );
    const defaultSolution = solveToSteadyState(
        defaultCase.width,
        defaultCase.height,
        defaultCase.diffusionCoefficient,
        defaultCase.deltaX,
        defaultCase.deltaT,
        defaultSources,
        defaultSinks
    );

    // 3) For each resolution, solve & compare to the reference
    test.each(TestCases)(
        "deltaX: $deltaX  ($width × $height grid)",
        ({ diffusionCoefficient, deltaX, width: WIDTH, height: HEIGHT, decayRate, deltaT }) => {
            // ---- Arrange ----
            const sources = mapSourcesToGrid(
                physicalSources,
                WIDTH,
                HEIGHT,
                deltaX,
                defaultCase.deltaX
            );
            const sinks = new Float64Array(WIDTH * HEIGHT).fill(decayRate);

            // ---- Act ----
            const testSolution = solveToSteadyState(
                WIDTH,
                HEIGHT,
                diffusionCoefficient,
                deltaX,
                deltaT,
                sources,
                sinks
            );

            // Interpolate test solution onto the default grid for comparison
            const sampledTest = sampleAtDefaultGrid(
                testSolution,
                WIDTH,
                HEIGHT,
                deltaX,
                defaultCase.width,
                defaultCase.height,
                defaultCase.deltaX
            );

            // ---- Assert ----
            const span = arrayMax(defaultSolution) - arrayMin(defaultSolution);

            let maxRelError = 0;
            let sumSquaredErrors = 0;
            let count = 0;
            const N = defaultCase.width * defaultCase.height;

            for (let i = 0; i < N; i++) {
                if (defaultSources[i] === 0) {
                    // skip source cells (sharp peaks)
                    const diff = Math.abs(sampledTest[i] - defaultSolution[i]);
                    const relError = diff / span;
                    sumSquaredErrors += diff * diff;
                    count++;
                    if (relError > maxRelError) maxRelError = relError;
                }
            }

            const rmsError = Math.sqrt(sumSquaredErrors / count);
            expect(maxRelError).toBeLessThan(5.2e-2);
            expect(rmsError).toBeLessThan(1e-2);
        }
    );
});
