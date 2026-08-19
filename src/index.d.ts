/**
 * Type definitions for handy-diffusion (corrected to match actual implementations)
 */

/**
 * Set properties for the ADI (Alternating Direction Implicit) method
 * @param width - Grid width
 * @param height - Grid height
 * @param diffusionCoefficient - Diffusion coefficient
 * @param deltaX - Spatial step size
 * @param deltaT - Time step size
 */
export function setADIProperties(
	width: number,
	height: number,
	diffusionCoefficient: number,
	deltaX: number,
	deltaT: number,
): void;

/**
 * Solve 2D diffusion equation using ADI method
 * @param concentrationData - Concentration array (width * height)
 * @param totalNumberOfIterations - Number of time steps
 * @param allowNegativeValues - Whether to allow negative concentrations (default: false)
 */
export function ADI(
	concentrationData: Float64Array | number[],
	totalNumberOfIterations: number,
	allowNegativeValues?: boolean,
): Float64Array | null;

/**
 * Set properties for the Crank-Nicolson method (1D)
 * @param length - Number of grid points
 * @param diffusionCoefficient - Diffusion coefficient
 * @param deltaX - Spatial step size
 * @param deltaT - Time step size
 * @param decayRate - Decay rate constant (default: 0)
 */
export function setCNProperties(
	length: number,
	diffusionCoefficient: number,
	deltaX: number,
	deltaT: number,
	decayRate?: number
): void;

/**
 * Solve 1D diffusion equation using Crank-Nicolson method
 * @param concentrationData - Initial concentration values
 * @param sources - Source terms
 * @param totalNumberOfIterations - Number of time steps
 * @param allowNegativeValues - Whether to allow negative concentrations (default: false)
 */
export function CrankNicolson(
	concentrationData: Float64Array | number[],
	sources: Float64Array | number[],
	totalNumberOfIterations: number,
	allowNegativeValues?: boolean,
): void;

/**
 * Calculate analytic steady-state solution
 * @param WIDTH - Grid width
 * @param HEIGHT - Grid height
 * @param DIFFUSION_RATE - Diffusion rate
 * @param DECAY_RATE - Decay rate
 * @param deltaX - Spatial step size
 * @param sources - Source terms array
 * @param maxMode - Maximum mode for series expansion
 * @returns Steady-state concentration array
 */
export function analyticSteadyState(
	WIDTH: number,
	HEIGHT: number,
	DIFFUSION_RATE: number,
	DECAY_RATE: number,
	deltaX: number,
	sources: Float64Array | number[],
	maxMode: number,
): Float64Array;

/**
 * Calculate effective influence of sources
 * @param width - Grid width
 * @param height - Grid height
 * @param sources - Source terms array
 * @param lambda - Length scale parameter
 * @param scale - Scaling factor
 * @returns Effective influence array
 */
export function effectiveInfluence(
	width: number,
	height: number,
	sources: Float64Array | number[],
	lambda: number,
	scale: number,
): Float64Array;

/**
 * Solve tridiagonal system using Thomas algorithm
 * @param a - Sub-diagonal coefficients
 * @param b - Main diagonal coefficients
 * @param c - Super-diagonal coefficients
 * @param d - Right-hand side vector
 * @param n - System size
 * @param modifiedUpperDiagonal - Pre-allocated work array
 * @param modifiedRightHandSide - Pre-allocated work array
 * @param solution - Pre-allocated output array (written in place)
 */
export function thomasAlgorithm(
	lowerDiagonal: Float64Array | number[],
	mainDiagonal: Float64Array | number[],
	upperDiagonal: Float64Array | number[],
	rightHandSide: Float64Array | number[],
	n: number,
	modifiedUpperDiagonal: Float64Array | number[],
	modifiedRightHandSide: Float64Array | number[],
	solution: Float64Array | number[],
): void;

export function updateSinksAndSources(
	sinks: Float64Array | number[],
	sources: Float64Array | number[],
): void;
