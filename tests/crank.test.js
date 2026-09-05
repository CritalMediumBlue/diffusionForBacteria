import {
	ADI,
	setADIProperties,
	CrankNicolson,
	setCNProperties,
	updateSinksAndSources,
} from "../literate/src/index.js";
import { expect, test } from "vitest";

const length = 1200;
const height = 3;

const testCases = [
	{ diffusionCoefficient: 2, decayRate: 0.0000001, deltaX: 1.0, totalTime: 20 },
	{ diffusionCoefficient: 2, decayRate: 0.0000001, deltaX: 1.0, totalTime: 200 },
	{ diffusionCoefficient: 2, decayRate: 0.0000001, deltaX: 1.0, totalTime: 400 },
	{ diffusionCoefficient: 2, decayRate: 0.0000001, deltaX: 1.0, totalTime: 800 },
	{ diffusionCoefficient: 2, decayRate: 0.0000001, deltaX: 1.0, totalTime: 1500 },
	{ diffusionCoefficient: 2, decayRate: 0.0000001, deltaX: 1.0, totalTime: 3000 },
];

testCases.forEach(({ diffusionCoefficient, decayRate, deltaX, totalTime }) => {
	test(`Crank-Nicolson vs ADI: D=${diffusionCoefficient}, k=${decayRate}, dx=${deltaX}, totalTime=${totalTime}`, () => {
		const deltaT = 0.1;
		const beta = new Float64Array(length).fill(decayRate * deltaT / 2.0);
		const totalIterations = Math.floor(totalTime / deltaT);

		// Create fresh copies of sources for each test
		const sources1D = new Float64Array(length).fill(0);
		const sources2D = new Float64Array(length * height).fill(0);
		const sinks2D = new Float64Array(length * height).fill(decayRate);
		sources1D[Math.floor(length / 2)] = 1.5; // point source in the center
		for (let i = 0; i < height; i++) {
			sources2D[i * length + Math.floor(length / 2)] = 1.5;
		}
		const numericalSolutionUsingADI = new Float64Array(length * height).fill(0);
		const numericalSolutionUsingCrankNicolson = new Float64Array(length).fill(0);

		for (let i = 0; i < length; i++) {
			numericalSolutionUsingCrankNicolson[i] = 0.5 + Math.sin((i / length) * Math.PI * 7) / 2; // same initial condition
			for (let j = 0; j < height; j++) {
				numericalSolutionUsingADI[i + j * length] =
					0.5 + Math.sin((i / length) * Math.PI * 7) / 2;
			}
		}

		setADIProperties(length, height, diffusionCoefficient, deltaX, deltaT);
		updateSinksAndSources(sinks2D, sources2D);

		ADI(numericalSolutionUsingADI, totalIterations, true);

		setCNProperties(length, diffusionCoefficient, deltaX, deltaT, beta);
		CrankNicolson(numericalSolutionUsingCrankNicolson, sources1D, totalIterations, true);

		for (let i = 0; i < length; i++) {
			const valueADI = numericalSolutionUsingADI[i + length]; // middle row
			const valueCrankNicolson = numericalSolutionUsingCrankNicolson[i];
			expect(valueCrankNicolson).toBeCloseTo(valueADI, 2);
		}
	});
});

test("Crank-Nicolson matches analytical decay of cos mode", () => {
	const length = 1200, deltaX = 1.0, deltaT = 0.1;
	const D = 2, k = 0.01;
	const q = Math.PI / length;
	const totalTime = 50;
	const totalIterations = Math.floor(totalTime / deltaT);

	const u = new Float64Array(length);
	for (let i = 0; i < length; i++) {
		u[i] = 0.5 + 0.5 * Math.cos(q * i);
	}
	const sources = new Float64Array(length).fill(0);
	const beta = new Float64Array(length).fill(k * deltaT / 2.0);

	setCNProperties(length, D, deltaX, deltaT, beta);
	CrankNicolson(u, sources, totalIterations, true);

	for (let i = 0; i < length; i++) {
		const exact =
			0.5 * Math.exp(-k * totalTime) +
			0.5 * Math.exp(-(D * q * q + k) * totalTime) * Math.cos(q * i);
		expect(u[i]).toBeCloseTo(exact, 2);
	}
});
