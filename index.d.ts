/**
 * Type definitions for handy-diffusion
 */

/**
 * Set properties for the ADI (Alternating Direction Implicit) method
 * @param width - Grid width
 * @param height - Grid height
 * @param diffusionCoefficient - Diffusion coefficient
 * @param deltaX - Spatial step size
 * @param deltaT - Time step size
 * @param decayRate - Decay rate constant (default: 0)
 */
export function setADIProperties(
    width: number,
    height: number,
    diffusionCoefficient: number,
    deltaX: number,
    deltaT: number,
    decayRate?: number
): void;

/**
 * Solve 2D diffusion equation using ADI method
 * @param concentrationData - Concentration array (width * height)
 * @param sources - Source terms array
 * @param totalNumberOfIterations - Number of time steps
 * @param allowNegativeValues - Whether to allow negative concentrations (default: false)
 */
export function ADI(
    concentrationData: Float64Array | number[],
    sources: Float64Array | number[],
    totalNumberOfIterations: number,
    allowNegativeValues?: boolean
): void;

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
    allowNegativeValues?: boolean
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
    maxMode: number
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
export function efectiveInfluence(
    width: number,
    height: number,
    sources: Float64Array | number[],
    lambda: number,
    scale: number
): Float64Array;

/**
 * Solve tridiagonal system using Thomas algorithm
 * @param a - Sub-diagonal coefficients
 * @param b - Main diagonal coefficients
 * @param c - Super-diagonal coefficients
 * @param d - Right-hand side values
 * @returns Solution array
 */
export function thomasAlgorithm(
    a: Float64Array | number[],
    b: Float64Array | number[],
    c: Float64Array | number[],
    d: Float64Array | number[]
): Float64Array;    