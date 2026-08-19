import {
	ADI, setADIProperties, analyticSteadyState, updateSinksAndSources,
	effectiveInfluence, CrankNicolson, setCNProperties
} from "handy-diffusion";
import { describe, test, expect } from "vitest";
import { checkForSteadyState, calculateDifference } from "./helpers.js";

const sourcesTestCases = [{ description: "infrequent sources", probability: 0.001 },
{ description: "dense sources", probability: 0.030 }
];

describe("Crank-Nicolson vs ADI Comparison", () => {
	const DIFFUSION_RATE = 10; // micrometer^2 / second
	const deltaX = 1; // micrometers
	const WIDTH = 2000;
	const HEIGHT = 5; // aproximate 1D
	const DECAY_RATE = 0.0;
	const deltaT = 0.2; // seconds  

	test.each(sourcesTestCases)("$description", ({ probability }) => {
		// Arrange 
		const sources = new Float64Array(WIDTH * HEIGHT).fill(0);
		for (let i = 0; i < WIDTH; i++) {
			sources[WIDTH * 0 + i] = Math.random() < probability ? 0.5 : 0;
			sources[WIDTH * 1 + i] = sources[WIDTH * 0 + i]; // mirror
			sources[WIDTH * 2 + i] = sources[WIDTH * 0 + i]; // mirror
			sources[WIDTH * 3 + i] = sources[WIDTH * 0 + i]; // mirror
			sources[WIDTH * 4 + i] = sources[WIDTH * 0 + i]; // mirror
		}
		//ensure at least one source in the middle
		sources[WIDTH * 0 + Math.floor(WIDTH / 2)] = 1.0;
		sources[WIDTH * 1 + Math.floor(WIDTH / 2)] = 1.0;
		sources[WIDTH * 2 + Math.floor(WIDTH / 2)] = 1.0;
		sources[WIDTH * 3 + Math.floor(WIDTH / 2)] = 1.0;
		sources[WIDTH * 4 + Math.floor(WIDTH / 2)] = 1.0;
		const sinks = new Float64Array(WIDTH * HEIGHT).fill(DECAY_RATE);
		const initialConcentration = new Float64Array(WIDTH * HEIGHT).fill(0);
		for (let i = 0; i < WIDTH; i++) {
			initialConcentration[WIDTH * 0 + i] = 1 + Math.sin((i / WIDTH) * Math.PI * 5) / 2; // some initial condition
			initialConcentration[WIDTH * 1 + i] = initialConcentration[WIDTH * 0 + i]; // mirror
			initialConcentration[WIDTH * 2 + i] = initialConcentration[WIDTH * 0 + i]; // mirror
			initialConcentration[WIDTH * 3 + i] = initialConcentration[WIDTH * 0 + i]; // mirror
			initialConcentration[WIDTH * 4 + i] = initialConcentration[WIDTH * 0 + i]; // mirror
		}
		setADIProperties(WIDTH, HEIGHT, DIFFUSION_RATE, deltaX, deltaT);
		setCNProperties(WIDTH, DIFFUSION_RATE, deltaX, deltaT, DECAY_RATE);

		const numericalSolutionCrank = initialConcentration.slice(2 * WIDTH, 3 * WIDTH);
		const numericalSolutionADI = initialConcentration.slice();

		// Act
		const totalIterations = 123;
		CrankNicolson(
			numericalSolutionCrank,
			sources.slice(2 * WIDTH, 3 * WIDTH),
			totalIterations,
			true
		);
		updateSinksAndSources(sinks, sources);
		ADI(numericalSolutionADI, totalIterations, true);

		const ADI_Solution_1D = numericalSolutionADI.slice(2 * WIDTH, 3 * WIDTH);
		const CrankNicolson_Solution_1D = numericalSolutionCrank;

		//Assert
		const differences = calculateDifference(ADI_Solution_1D, CrankNicolson_Solution_1D);

		let maxRelError = 0;
		let sumSquaredErrors = 0;
		let countNonSource = 0;

		const maximumValueADI = Math.max(...ADI_Solution_1D);
		const minimumValueADI = Math.min(...ADI_Solution_1D);
		const maximumValueCrank = Math.max(...CrankNicolson_Solution_1D);
		const minimumValueCrank = Math.min(...CrankNicolson_Solution_1D);

		const avMax = (maximumValueADI + maximumValueCrank) / 2;
		const avMin = (minimumValueADI + minimumValueCrank) / 2;
		const span = avMax - avMin;

		for (let i = 0; i < WIDTH; i++) {
			if (sources[WIDTH * 2 + i] === 0) { // only check locations without sources
				const diff = differences[i];
				const relError = diff / span;
				sumSquaredErrors += diff * diff;
				countNonSource++;
				if (relError > maxRelError) {
					maxRelError = relError;
				}
			}
		}
		// Generate plots if GENERATE_PLOTS environment variable is set
		const sources1D = sources.slice(2 * WIDTH, 3 * WIDTH);
		const rmsError = Math.sqrt(sumSquaredErrors / countNonSource);
		expect(maxRelError).toBeLessThan(3e-2);
		expect(rmsError).toBeLessThan(7e-3);


	});
});


describe("Analytic vs Numerical Steady-State Solution", () => {
	const DIFFUSION_RATE = 10; // micrometer^2 / second
	const deltaX = 1; // micrometers
	const WIDTH = 2000;
	const HEIGHT = 5; // aproximate 1D
	const DECAY_RATE = 0.01;
	const deltaT = 0.2; // seconds  
	const maxMode = 500;

	test.each(sourcesTestCases)("$description", ({ probability }) => {
		// Arrange
		const sources = new Float64Array(WIDTH * HEIGHT).fill(0);
		const sinks = new Float64Array(WIDTH * HEIGHT).fill(DECAY_RATE);
		for (let i = 0; i < WIDTH; i++) {
			sources[WIDTH * 0 + i] = Math.random() < probability ? 0.5 : 0;
			sources[WIDTH * 1 + i] = sources[WIDTH * 0 + i]; // mirror
			sources[WIDTH * 2 + i] = sources[WIDTH * 0 + i]; // mirror
			sources[WIDTH * 3 + i] = sources[WIDTH * 0 + i]; // mirror
			sources[WIDTH * 4 + i] = sources[WIDTH * 0 + i]; // mirror
		}
		//ensure at least one source in the middle
		sources[WIDTH * 0 + Math.floor(WIDTH / 2)] = 1.0;
		sources[WIDTH * 1 + Math.floor(WIDTH / 2)] = 1.0;
		sources[WIDTH * 2 + Math.floor(WIDTH / 2)] = 1.0;
		sources[WIDTH * 3 + Math.floor(WIDTH / 2)] = 1.0;
		sources[WIDTH * 4 + Math.floor(WIDTH / 2)] = 1.0;
		const initialConcentration = new Float64Array(WIDTH * HEIGHT).fill(0);
		setADIProperties(WIDTH, HEIGHT, DIFFUSION_RATE, deltaX, deltaT);
		updateSinksAndSources(sinks, sources);



		// Act
		const analyticalSolution = analyticSteadyState(
			WIDTH,
			HEIGHT,
			DIFFUSION_RATE,
			DECAY_RATE,
			deltaX,
			sources,
			maxMode
		);

		const numericalSolution = initialConcentration.slice();
		let steadyStateReached = false;

		while (!steadyStateReached) {
			const previousConcentration = numericalSolution.slice();
			ADI(numericalSolution, 200, true);
			steadyStateReached = checkForSteadyState(previousConcentration, numericalSolution, 1e-8);
		}

		const ADI_Solution_1D = numericalSolution.slice(WIDTH, WIDTH * 2);
		const Analytical_Solution_1D = analyticalSolution.slice(WIDTH, WIDTH * 2);

		//Assert
		const maximumValueAnalytic = Math.max(...Analytical_Solution_1D);
		const maximumValueNumerical = Math.max(...ADI_Solution_1D);
		const minimumValueAnalytic = Math.min(...Analytical_Solution_1D);
		const minimumValueNumerical = Math.min(...ADI_Solution_1D);

		// Check that the max and min values are close
		expect(maximumValueNumerical).toBeCloseTo(maximumValueAnalytic, 0); // gibbs phenomenon on analytic solution can cause larger discrepancies at sources. Do not expect higher precision here
		expect(minimumValueNumerical).toBeCloseTo(minimumValueAnalytic, 1);

		const avMax = (maximumValueAnalytic + maximumValueNumerical) / 2;
		const avMin = (minimumValueAnalytic + minimumValueNumerical) / 2;
		const span = avMax - avMin;

		const differences = calculateDifference(ADI_Solution_1D, Analytical_Solution_1D);

		let maxRelError = 0;
		let sumSquaredErrors = 0;
		let countNonSource = 0;

		for (let i = 0; i < WIDTH; i++) {
			if (sources[i] === 0) { // only check locations without sources
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
		expect(maxRelError).toBeLessThan(5e-1);
		expect(rmsError).toBeLessThan(5e-2);


	});
});


describe("CrankNicolson vs Analitic Steady-State Solution", () => {
	const DIFFUSION_RATE = 10; // micrometer^2 / second
	const deltaX = 1; // micrometers
	const WIDTH = 2000;
	const DECAY_RATE = 0.01;
	const deltaT = 0.2; // seconds  
	const maxMode = 500;

	test.each(sourcesTestCases)("$description", ({ probability }) => {
		// Arrange - Create 1D sources
		const sources1D = new Float64Array(WIDTH).fill(0);
		for (let i = 0; i < WIDTH; i++) {
			sources1D[i] = Math.random() < probability ? 0.5 : 0;
		}
		// Ensure at least one source in the middle
		sources1D[Math.floor(WIDTH / 2)] = 1.0;

		// Create 2D sources for analytical solution (mirrored across HEIGHT=5)
		const sources2D = new Float64Array(WIDTH * 5).fill(0);
		for (let j = 0; j < 5; j++) {
			for (let i = 0; i < WIDTH; i++) {
				sources2D[j * WIDTH + i] = sources1D[i];
			}
		}

		setCNProperties(WIDTH, DIFFUSION_RATE, deltaX, deltaT, DECAY_RATE);

		// Act - Compute analytical solution
		const analyticalSolution2D = analyticSteadyState(
			WIDTH,
			5,
			DIFFUSION_RATE,
			DECAY_RATE,
			deltaX,
			sources2D,
			maxMode
		);
		const Analytical_Solution_1D = analyticalSolution2D.slice(WIDTH, WIDTH * 2);

		// Run Crank-Nicolson to steady state
		const numericalSolutionCN = new Float64Array(WIDTH).fill(0);
		let steadyStateReached = false;

		while (!steadyStateReached) {
			const previousConcentration = numericalSolutionCN.slice();
			CrankNicolson(numericalSolutionCN, sources1D, 200, true);
			steadyStateReached = checkForSteadyState(previousConcentration, numericalSolutionCN, 1e-8);
		}

		// Assert
		const maximumValueAnalytic = Math.max(...Analytical_Solution_1D);
		const maximumValueNumerical = Math.max(...numericalSolutionCN);
		const minimumValueAnalytic = Math.min(...Analytical_Solution_1D);
		const minimumValueNumerical = Math.min(...numericalSolutionCN);

		// Check that the max and min values are close
		expect(maximumValueNumerical).toBeCloseTo(maximumValueAnalytic, 0); // Gibbs phenomenon can cause larger discrepancies at sources
		expect(minimumValueNumerical).toBeCloseTo(minimumValueAnalytic, 1);

		const avMax = (maximumValueAnalytic + maximumValueNumerical) / 2;
		const avMin = (minimumValueAnalytic + minimumValueNumerical) / 2;
		const span = avMax - avMin;

		const differences = calculateDifference(numericalSolutionCN, Analytical_Solution_1D);

		let maxRelError = 0;
		let sumSquaredErrors = 0;
		let countNonSource = 0;

		for (let i = 0; i < WIDTH; i++) {
			if (sources1D[i] === 0) { // only check locations without sources
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
		expect(maxRelError).toBeLessThan(2e-2);
		expect(rmsError).toBeLessThan(7e-3);

		// Generate plots if GENERATE_PLOTS environment variable is set
	});
});
