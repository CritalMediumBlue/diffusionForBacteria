import { analyticSteadyState, effectiveInfluence } from "../src/index.js";
import { describe, test, expect } from "vitest";
import { createRandomSources } from "./src/helpers.js";
import { mulberry32 } from "./random.js";

// ---------------------------------------------------------------------------
// Test regime
// ---------------------------------------------------------------------------
// The effective solution is a surrogate for the steady-state analytic
// solution, valid when there are many small point sources/sinks and the decay
// length is small relative to the system. We hold a fixed physical setup and
// ask whether, over many independent (seeded) source layouts, the effective
// solution stays close enough to the true field.
//
const WIDTH = 40;
const HEIGHT = 40;
const DIFFUSION_RATE = 5; // um^2 / s
const DECAY_RATE = 0.01; // 1 / s
const deltaX = 1; // um
const MAX_MODE = 240;

// Effective-kernel parameters, calibrated for this regime:
//   LAMBDA -- decay length of the exponential kernel, in grid cells. The
//             analytic system's own decay length is
//             sqrt(DIFFUSION_RATE / DECAY_RATE) ~ sqrt(500) ~ 22.4 cells,
//             and 22 gives the best fit on held-out layouts.
//   SCALE  -- reference normalising constant (~ source density factor). The
//             test calibrates an optimal scale by least squares on each
//             layout, but asserts the fitted value stays near this reference.
const LAMBDA = 22;
const SCALE_REFERENCE = 100;
const SOURCE_PROBABILITY = 0.02;

// Deterministic seed stream.
const testSeeds = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 41, 42, 53];

/**
 * Best fixed normalising constant for a kernel field.
 *
 * The effective model produces a field up to an overall factor (the source
 * density). We pin that factor by least squares, `single * scale`, against
 * the analytic field on off-source cells only.
 */
function fitScale(analytic, single, sources) {
    let numer = 0;
    let denom = 0;
    for (let i = 0; i < analytic.length; i++) {
        if (sources[i] !== 0) continue;
        const s = single[i];
        numer += s * analytic[i];
        denom += s * s;
    }
    return numer / denom;
}

/**
 * Build a seeded random source layout (guaranteeing one source at the grid
 * centre) and return both the layout and its analytic steady-state field.
 */
function withAnalyticField(seed) {
    const rng = mulberry32(seed);
    const sources = createRandomSources(WIDTH, HEIGHT, SOURCE_PROBABILITY, rng);
    sources[Math.floor(HEIGHT / 2) * WIDTH + Math.floor(WIDTH / 2)] = 1.0;

    const analytic = analyticSteadyState(
        WIDTH,
        HEIGHT,
        DIFFUSION_RATE,
        DECAY_RATE,
        deltaX,
        sources,
        MAX_MODE
    );
    return { sources, analytic };
}

/**
 * Span-relative error statistics of the effective solution against the
 * analytic one, considering only off-source cells.
 *
 * Source cells are excluded on purpose: there the effective model represents
 * each producer as a delta point source, so the kernel concentrates (a
 * cusp/singularity), while the analytic eigenfunction field is finite. That
 * mismatch is a known property of the heuristic and tells us nothing about
 * the quality of the field everywhere else.
 */
function relativeErrors(sources, analytic, lambda) {
    const single = effectiveInfluence(WIDTH, HEIGHT, sources, lambda, 1.0);
    const scale = fitScale(analytic, single, sources);

    const span = Math.max(...analytic) - Math.min(...analytic);
    const relative = [];
    for (let i = 0; i < analytic.length; i++) {
        if (sources[i] !== 0) continue;
        relative.push(Math.abs(single[i] * scale - analytic[i]) / span);
    }
    relative.sort((a, b) => a - b);

    const n = relative.length;
    const rms = Math.sqrt(relative.reduce((sum, r) => sum + r * r, 0) / n);
    return {
        scale,
        count: n,
        rms,
        mean: relative.reduce((sum, r) => sum + r, 0) / n,
        q75: relative[Math.floor(0.75 * (n - 1))],
        q95: relative[Math.floor(0.95 * (n - 1))],
        largest: relative[n - 1],
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("effective solution approximates the analytic steady state", () => {
    const { sources, analytic } = withAnalyticField(42);
    const baseline = relativeErrors(sources, analytic, LAMBDA);

    test("the fitted normalising constant lands on the expected scale", () => {
        expect(baseline.scale).toBeGreaterThan(0.8 * SCALE_REFERENCE);
        expect(baseline.scale).toBeLessThan(1.2 * SCALE_REFERENCE);
    });

    test("the calibrated field stays close on the reference layout", () => {
        expect(baseline.rms).toBeLessThan(0.1);
        expect(baseline.q95).toBeLessThan(0.25);
        expect(baseline.largest).toBeLessThan(0.4);
    });

    test("the fit generalises across independent source layouts", () => {
        for (const seed of testSeeds) {
            const { sources, analytic } = withAnalyticField(seed);
            const m = relativeErrors(sources, analytic, LAMBDA);
            expect(m.rms).toBeLessThan(0.1);
            expect(m.q95).toBeLessThan(0.25);
            expect(m.largest).toBeLessThan(0.45);
        }
    });

    test("a far-too-short decay length is detected as a worse fit", () => {
        // Checks that the test is discriminating: a kernel far shorter than the
        // true decay of the system (~22 cells) should approximate the field
        // measurably worse than the calibrated one.
        const poor = relativeErrors(sources, analytic, 5);
        expect(poor.rms).toBeGreaterThan(baseline.rms);
    });
});
