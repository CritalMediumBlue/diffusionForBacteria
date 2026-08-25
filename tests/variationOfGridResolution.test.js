import {
    ADI,
    setADIProperties,
    analyticSteadyState,
    updateSinksAndSources,
} from "../literate/src/index.js";
import { describe, test, expect } from "vitest";
import {
    checkForSteadyState,
    createRandomSources,
    calculateDifference,
} from "../literate/src/helpers.js";
import { mulberry32 } from "./random.js";

const TestCases = [
    { diffusionCoefficient: 100, deltaX: 1, width: 100, height: 60, decayRate: 0.01, deltaT: 0.5 },
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
];

describe("Analytic vs Numerical Steady-State Solution with Varying Dimensions", () => {
    test.each(TestCases)(
        "Diffusion: $diffusionCoefficient, deltaX: $deltaX, Width: $width, Height: $height, Decay: $decayRate, deltaT: $deltaT",
        ({ diffusionCoefficient, deltaX, width: WIDTH, height: HEIGHT, decayRate, deltaT }) => {
            // Arrange
            const rng = mulberry32(42);
            const sources = createRandomSources(WIDTH, HEIGHT, 0.02, rng);
            const sinks = new Float64Array(WIDTH * HEIGHT).fill(decayRate);
            sources[Math.floor(HEIGHT / 2) * WIDTH + Math.floor(WIDTH / 2)] = 1.0; // ensure at least one source in the center
            const initialConcentration = new Float64Array(WIDTH * HEIGHT).fill(0);
            setADIProperties(WIDTH, HEIGHT, diffusionCoefficient, deltaX, deltaT);
            updateSinksAndSources(sinks, sources);

            const maxMode = 200;

            // Act
            const analyticalSolution = analyticSteadyState(
                WIDTH,
                HEIGHT,
                diffusionCoefficient,
                decayRate,
                deltaX,
                sources,
                maxMode
            );

            const numericalSolution = initialConcentration.slice();
            let steadyStateReached = false;

            while (!steadyStateReached) {
                const previousConcentration = numericalSolution.slice();
                ADI(numericalSolution, 100, true);
                steadyStateReached = checkForSteadyState(
                    previousConcentration,
                    numericalSolution,
                    1e-7
                );
            }

            //Assert
            const maximumValueAnalytic = Math.max(...analyticalSolution);
            const maximumValueNumerical = Math.max(...numericalSolution);
            const minimumValueAnalytic = Math.min(...analyticalSolution);
            const minimumValueNumerical = Math.min(...numericalSolution);

            // Check that the max and min values are close
            //expect(maximumValueNumerical).toBeCloseTo(maximumValueAnalytic, 0); // gibbs phenomenon on analytic solution can cause larger discrepancies at sources. Do not expect higher precision here
            //expect(minimumValueNumerical).toBeCloseTo(minimumValueAnalytic, 2);

            const avMax = (maximumValueAnalytic + maximumValueNumerical) / 2;
            const avMin = (minimumValueAnalytic + minimumValueNumerical) / 2;
            const span = avMax - avMin;

            const differences = calculateDifference(numericalSolution, analyticalSolution);

            let maxRelError = 0;
            let sumSquaredErrors = 0;
            let countNonSource = 0;

            for (let i = 0; i < WIDTH * HEIGHT; i++) {
                if (sources[i] === 0) {
                    // only check locations without sources
                    const diff = differences[i];
                    const relError = diff / span;
                    sumSquaredErrors += diff * diff;
                    countNonSource++;
                    if (relError > maxRelError) {
                        maxRelError = relError;
                    }
                }
            }

            const rmsError = Math.sqrt(sumSquaredErrors / countNonSource);
            expect(maxRelError).toBeLessThan(3e-2);
            expect(rmsError).toBeLessThan(5.1e-3);
        }
    );
});
