// ~/~ begin <<literate/analyticSolution.qmd#src/analyticSolution.ts>>[init]
// ~/~ begin <<literate/analyticSolution.qmd#as-helper>>[init]
function constantSourceTermOptimized(
    n: number,
    m: number,
    Lx: number,
    Ly: number,
    sources: Float64Array,
    activeSourceIndices: number[],
    cosX: Float64Array[],
    cosY: Float64Array[],
    WIDTH: number,
    deltaX: number,
): number {
    const e_n: number = n === 0 ? 0.5 : 1;
    const e_m: number = m === 0 ? 0.5 : 1;
    const coefficient: number = (4 * e_n * e_m * deltaX * deltaX) / (Lx * Ly);
    let sum: number = 0;

    for (const idx of activeSourceIndices) {
        const i: number = idx % WIDTH;
        const j: number = Math.floor(idx / WIDTH);
        sum += sources[idx] * cosX[n][i] * cosY[m][j];
    }

    return coefficient * sum;
}
// ~/~ end

// ~/~ begin <<literate/analyticSolution.qmd#as-main>>[init]
export const analyticSteadyState = (
    WIDTH: number,
    HEIGHT: number,
    DIFFUSION_RATE: number,
    DECAY_RATE: number,
    deltaX: number, 
    sources: Float64Array, 
    maxMode: number,
): Float64Array => {
    const steadyStateConcentration: Float64Array = new Float64Array(WIDTH * HEIGHT).fill(0);

    // Precompute non-zero source locations
    const activeSourceIndices: number[] = [];
    for (let idx: number = 0; idx < sources.length; idx++) {
        if (sources[idx] !== 0) activeSourceIndices.push(idx);
    }

    // Early return if no sources
    if (activeSourceIndices.length === 0) {
        return steadyStateConcentration;
    }

    const Lx: number = WIDTH * deltaX;
    const Ly: number = HEIGHT * deltaX;
    const piSquared: number = Math.PI * Math.PI;
    const LxSquared: number = Lx * Lx;
    const LySquared: number = Ly * Ly;
    const invLxSquared: number = 1 / LxSquared;
    const invLySquared: number = 1 / LySquared;

    // Precompute all x and y coordinates
    const xCoords: Float64Array = new Float64Array(WIDTH);
    const yCoords: Float64Array = new Float64Array(HEIGHT);
    for (let i: number = 0; i < WIDTH; i++) xCoords[i] = (i + 0.5) * deltaX;
    for (let j: number = 0; j < HEIGHT; j++) yCoords[j] = (j + 0.5) * deltaX;

    // Precompute cosine values for all modes and positions
    const cosX: Float64Array[] = Array(maxMode + 1);
    const cosY: Float64Array[] = Array(maxMode + 1);

    for (let n: number = 0; n <= maxMode; n++) {
        const nPi_Lx: number = (Math.PI * n) / Lx;
        cosX[n] = new Float64Array(WIDTH);
        for (let i: number = 0; i < WIDTH; i++) {
            cosX[n][i] = Math.cos(nPi_Lx * xCoords[i]);
        }
    }

    for (let m: number = 0; m <= maxMode; m++) {
        const mPi_Ly: number = (Math.PI * m) / Ly;
        cosY[m] = new Float64Array(HEIGHT);
        for (let j: number = 0; j < HEIGHT; j++) {
            cosY[m][j] = Math.cos(mPi_Ly * yCoords[j]);
        }
    }

    // Precompute squared mode numbers
    const nSquared: Float64Array = new Float64Array(maxMode + 1);
    const mSquared: Float64Array = new Float64Array(maxMode + 1);
    for (let n: number = 0; n <= maxMode; n++) nSquared[n] = n * n;
    for (let m: number = 0; m <= maxMode; m++) mSquared[m] = m * m;

    // Compute steady-state solution
    for (let m: number = 0; m <= maxMode; m++) {
        for (let n: number = 0; n <= maxMode; n++) {
            const eigenvalue: number = piSquared * (nSquared[n] * invLxSquared + mSquared[m] * invLySquared);
            const K_mn: number = DIFFUSION_RATE * eigenvalue + DECAY_RATE;
            const Q_mn: number = constantSourceTermOptimized(
                n,
                m,
                Lx,
                Ly,
                sources,
                activeSourceIndices,
                cosX,
                cosY,
                WIDTH,
                deltaX
            );
            const amplitude: number = Q_mn / K_mn;

            // Skip modes with negligible contribution
            if (Math.abs(amplitude) < 1e-15) continue;

            // Compute and accumulate eigenfunction values directly
            for (let j: number = 0; j < HEIGHT; j++) {
                const cosYval: number = cosY[m][j];
                for (let i: number = 0; i < WIDTH; i++) {
                    steadyStateConcentration[j * WIDTH + i] += amplitude * cosX[n][i] * cosYval;
                }
            }
        }
    }

    return steadyStateConcentration;
};
// ~/~ end
// ~/~ end
