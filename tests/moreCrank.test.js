
import { CrankNicolson, setCNProperties } from "../literate/src/index.js";
import { expect, test } from "vitest";

const length = 400;
const deltaX = 1.0;
const L = (length - 1) * deltaX; // physical domain length

// -----------------------------------------------------------------------
// 1. Zero-iteration identity: output must equal input exactly
// -----------------------------------------------------------------------
test("zero iterations leaves the field unchanged", () => {
	const D = 2, k = 0.01, dt = 0.1;
	const u0 = new Float64Array(length).map((_, i) => Math.cos((2 * Math.PI * i * deltaX) / L));
	const u = Float64Array.from(u0);
	const sources = new Float64Array(length).fill(0);
	const beta = new Float64Array(length).fill(k * dt / 2.0);

	setCNProperties(length, D, deltaX, dt, beta);
	CrankNicolson(u, sources, 0, true);

	for (let i = 0; i < length; i++) {
		expect(u[i]).toBeCloseTo(u0[i], 12);
	}
});

// -----------------------------------------------------------------------
// 2. Uniform field stays uniform (trivial steady state)
// -----------------------------------------------------------------------
test("uniform field with no source/decay stays constant", () => {
	const D = 2, k = 0, dt = 0.1, C = 0.7;
	const u = new Float64Array(length).fill(C);
	const sources = new Float64Array(length).fill(0);
	const beta = new Float64Array(length).fill(k * dt / 2.0);

	setCNProperties(length, D, deltaX, dt, beta);
	CrankNicolson(u, sources, 500, true);

	for (let i = 0; i < length; i++) {
		expect(u[i]).toBeCloseTo(C, 8);
	}
});

// -----------------------------------------------------------------------
// 3. Pure exponential decay: u(t) = C * exp(-k t) for a uniform field
// -----------------------------------------------------------------------
test("uniform field decays exponentially, independent of D", () => {
	const D = 2, k = 0.02, dt = 0.1, C = 1.3;
	const totalTime = 50;
	const iterations = Math.floor(totalTime / dt);
	const u = new Float64Array(length).fill(C);
	const sources = new Float64Array(length).fill(0);
	const beta = new Float64Array(length).fill(k * dt / 2.0);

	setCNProperties(length, D, deltaX, dt, beta);
	CrankNicolson(u, sources, iterations, true);

	const expected = C * Math.exp(-k * totalTime);
	for (let i = 0; i < length; i++) {
		expect(u[i]).toBeCloseTo(expected, 3);
	}
});

// -----------------------------------------------------------------------
// 4. Cosine eigenmode: exact solution under Neumann BC
//    u0(x) = cos(n*pi*x/L)  ->  u(x,t) = exp(-(k + D*(n*pi/L)^2) t) * cos(n*pi*x/L)
// -----------------------------------------------------------------------
[1, 2, 5].forEach((n) => {
	test(`cosine eigenmode n=${n} decays at the analytical rate`, () => {
		const D = 2, k = 0.01, dt = 0.05;
		const totalTime = 20;
		const iterations = Math.floor(totalTime / dt);

		const u = new Float64Array(length).map((_, i) => Math.cos((n * Math.PI * (i * deltaX)) / L));
		const sources = new Float64Array(length).fill(0);
		const beta = new Float64Array(length).fill(k * dt / 2.0);

		setCNProperties(length, D, deltaX, dt, beta);
		CrankNicolson(u, sources, iterations, true);

		const lambda = k + D * Math.pow((n * Math.PI) / L, 2);
		const decay = Math.exp(-lambda * totalTime);

		// check a handful of interior points, avoiding boundary discretization noise
		for (let i = Math.floor(length * 0.2); i <= Math.floor(length * 0.8); i += 20) {
			const expected = decay * Math.cos((n * Math.PI * (i * deltaX)) / L);
			expect(u[i]).toBeCloseTo(expected, 2);
		}
	});
});

// -----------------------------------------------------------------------
// 5. Mass conservation with reflective BC, no source, no decay
// -----------------------------------------------------------------------
test("total mass is conserved with reflective BC (no source/decay)", () => {
	const D = 3, k = 0, dt = 0.1;
	const u = new Float64Array(length).map((_, i) => (i > length / 3 && i < (2 * length) / 3 ? 2.0 : 0.2));
	const sources = new Float64Array(length).fill(0);

	const massBefore = u.reduce((a, b) => a + b, 0) * deltaX;

	const beta = new Float64Array(length).fill(k * dt / 2.0);
	setCNProperties(length, D, deltaX, dt, beta);
	CrankNicolson(u, sources, 2000, true);

	const massAfter = u.reduce((a, b) => a + b, 0) * deltaX;
	expect(massAfter).toBeCloseTo(massBefore, 3);
});

// -----------------------------------------------------------------------
// 6. Linear mass growth with constant source, no decay, reflective BC
// -----------------------------------------------------------------------
test("mass grows linearly with constant source under reflective BC", () => {
	const D = 2, k = 0, dt = 0.05, S0 = 0.01;
	const totalTime = 10;
	const iterations = Math.floor(totalTime / dt);

	const u = new Float64Array(length).fill(0.5);
	const sources = new Float64Array(length).fill(S0);
	const massBefore = u.reduce((a, b) => a + b, 0) * deltaX;
	const beta = new Float64Array(length).fill(k * dt / 2.0);

	setCNProperties(length, D, deltaX, dt, beta);
	CrankNicolson(u, sources, iterations, true);

	const massAfter = u.reduce((a, b) => a + b, 0) * deltaX;
	const expectedGrowth = S0 * (length * deltaX) * totalTime;
	expect(massAfter - massBefore).toBeCloseTo(expectedGrowth, 1);
});

// -----------------------------------------------------------------------
// 7. Steady state with constant source and decay: u_ss = S0 / k, uniform
// -----------------------------------------------------------------------
test("converges to uniform steady state S0/k with constant source and decay", () => {
	const D = 2, k = 0.05, dt = 0.1, S0 = 0.02;
	const u = new Float64Array(length).fill(0);
	const sources = new Float64Array(length).fill(S0);
	const beta = new Float64Array(length).fill(k * dt / 2.0);

	setCNProperties(length, D, deltaX, dt, beta);
	CrankNicolson(u, sources, 20000, true); // run long enough to reach steady state

	const expected = S0 / k;
	for (let i = 0; i < length; i++) {
		expect(u[i]).toBeCloseTo(expected, 2);
	}
});

// -----------------------------------------------------------------------
// 8. Symmetry preservation: symmetric IC stays symmetric under reflective BC
// -----------------------------------------------------------------------
test("symmetric initial condition remains symmetric in time", () => {
	const D = 2, k = 0.01, dt = 0.1;
	const u = new Float64Array(length).map((_, i) => Math.cos((2 * Math.PI * i * deltaX) / L)); // symmetric about midpoint
	const sources = new Float64Array(length).fill(0);
	const beta = new Float64Array(length).fill(k * dt / 2.0);

	setCNProperties(length, D, deltaX, dt, beta);
	CrankNicolson(u, sources, 500, true);

	for (let i = 0; i < length; i++) {
		expect(u[i]).toBeCloseTo(u[length - 1 - i], 6);
	}
});
