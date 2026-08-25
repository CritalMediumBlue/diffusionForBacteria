// ~/~ begin <<literate/helpers.qmd#src/helpers.ts>>[init]
// ~/~ begin <<literate/helpers.qmd#helpers-random-generators>>[init]
export const createRandomSources = (
    width: number,
    height: number,
    probability: number,
    rng: () => number = Math.random,
): Float64Array => {
    const sources = new Float64Array(width * height);
    for (let j: number = 0; j < height; j++) {
        for (let i: number = 0; i < width; i++) {
            const idx: number = j * width + i;
            sources[idx] = rng() < probability ? 1.0 : 0.0;
        }
    }
    return sources;
};
// ~/~ end

// ~/~ begin <<literate/helpers.qmd#helpers-steady-state>>[init]
export const checkForSteadyState = (
    prev: Float64Array,
    current: Float64Array,
    tolerance: number = 1e-5,
): boolean => {
    let maxDiff: number = 0;
    for (let i: number = 0; i < prev.length; i++) {
        const diff: number = Math.abs(current[i] - prev[i]);
        if (diff > maxDiff) {
            maxDiff = diff;
        }
    }
    return maxDiff < tolerance;
};
// ~/~ end

// ~/~ begin <<literate/helpers.qmd#helpers-grid-conversion>>[init]
// Convert 1D arrays to 2D matrices for Plotly
export const convertTo2D = (
    array: Float64Array,
    width: number,
    height: number,
): number[][] => {
    const matrix: number[][] = [];
    for (let j: number = 0; j < height; j++) {
        const row: number[] = [];
        for (let i: number = 0; i < width; i++) {
            row.push(array[j * width + i]);
        }
        matrix.push(row);
    }
    return matrix;
};
// ~/~ end

// ~/~ begin <<literate/helpers.qmd#helpers-grid-difference>>[init]
// Compute and display difference
export const calculateDifference = (
    grid1: Float64Array,
    grid2: Float64Array,
): Float64Array => {
    const difference = new Float64Array(grid1.length);
    for (let i: number = 0; i < grid1.length; i++) {
        difference[i] = Math.abs(grid1[i] - grid2[i]);
    }
    return difference;
};
// ~/~ end
// ~/~ end
