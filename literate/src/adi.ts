// ~/~ begin <<literate/adi.qmd#src/adi.ts>>[init]
// ~/~ begin <<literate/adi.qmd#adi-imports>>[init]
import { thomasAlgorithm } from "./thomasAlgorithm.js";
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-variables>>[init]
let WIDTH: number;
let HEIGHT: number;
let modifiedUpperDiagonal1: Float64Array, modifiedRightHandSide1: Float64Array, solution1: Float64Array;
let modifiedUpperDiagonal2: Float64Array, modifiedRightHandSide2: Float64Array, solution2: Float64Array;
let intermediateConcentration: Float64Array;
let a1: Float64Array, b1: Float64Array, c1: Float64Array, d1: Float64Array;
let a2: Float64Array, b2: Float64Array, c2: Float64Array, d2: Float64Array;
let alpha: number, halfDeltaT: number, scaledSources: Float64Array;
let gamma: Float64Array;
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-set-properties>>[init]
export const setADIProperties = (
    width: number,
    height: number,
    diffusionCoefficient: number,
    deltaX: number,
    deltaT: number,
): void => {
    WIDTH = width;
    HEIGHT = height;
    ({
        modifiedUpperDiagonal1,
        modifiedRightHandSide1,
        solution1,
        modifiedUpperDiagonal2,
        modifiedRightHandSide2,
        solution2,
        intermediateConcentration,
        a1,
        b1,
        c1,
        d1,
        a2,
        b2,
        c2,
        d2,
        alpha,
        halfDeltaT,
        scaledSources,
        gamma,
    } = initADIArrays(WIDTH, HEIGHT, diffusionCoefficient, deltaX, deltaT));
};
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-update-sinks-sources>>[init]
export const updateSinksAndSources = (sinks: Float64Array, sources: Float64Array): void => {
    for (let i: number = 0; i < WIDTH * HEIGHT; i++) {
        gamma[i] = (sinks[i] * halfDeltaT) / 2;
        scaledSources[i] = sources[i] * halfDeltaT;
    }
}
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-update-diagonal-x>>[init]
const updateMainDiagonalXstep = (yCoord: number): void => {
    //update b1
    for (let i: number = 0; i < WIDTH; i++) {
        const idx: number = yCoord * WIDTH + i;
        b1[i] = 1 + 2 * alpha + gamma[idx];
    }
    //boundary conditions
    b1[0] = 1 + alpha + gamma[yCoord * WIDTH + 0];
    b1[WIDTH - 1] = 1 + alpha + gamma[yCoord * WIDTH + (WIDTH - 1)];
}
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-update-diagonal-y>>[init]
const updateMainDiagonalYstep = (xCoord: number): void => {
    //update b2
    for (let j: number = 0; j < HEIGHT; j++) {
        const idx: number = j * WIDTH + xCoord;
        b2[j] = 1 + 2 * alpha + gamma[idx];
    }
    //boundary conditions
    b2[0] = 1 + alpha + gamma[0 * WIDTH + xCoord];
    b2[HEIGHT - 1] = 1 + alpha + gamma[(HEIGHT - 1) * WIDTH + xCoord];
}
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-main-function>>[init]
export const ADI = (
    concentrationData: Float64Array,
    totalNumberOfIterations: number,
    allowNegativeValues: boolean = false,
): Float64Array | null => {
    let reachedNegativeValue: boolean = false;

    const currentConcentrationData: Float64Array = concentrationData;

    for (let iteration: number = 0; iteration < totalNumberOfIterations; iteration++) {
        /////////////-----  FIRST HALF-STEP (X-sweep)  -----/////////////
        // Solve implicitly in x, explicitly in y.
        // Clamped indexing implements Neumann (zero-flux) BCs in y:
        //   jBelow = max(j-1, 0),  jAbove = min(j+1, HEIGHT-1)
        for (let j: number = 0; j < HEIGHT; j++) {
            const jBelow: number = j > 0 ? j - 1 : 0;
            const jAbove: number = j < HEIGHT - 1 ? j + 1 : HEIGHT - 1;
            const rowOffset: number = j * WIDTH;

            for (let i: number = 0; i < WIDTH; i++) {
                const idx: number = rowOffset + i;

                const center: number = currentConcentrationData[idx];
                const bottom: number = currentConcentrationData[jBelow * WIDTH + i];
                const top: number = currentConcentrationData[jAbove * WIDTH + i];

                d1[i] =
                    alpha * bottom +
                    (1 - 2 * alpha - gamma[idx]) * center +
                    alpha * top +
                    scaledSources[idx];
            }
            updateMainDiagonalXstep(j);

            thomasAlgorithm(
                a1,
                b1,
                c1,
                d1,
                WIDTH,
                modifiedUpperDiagonal1,
                modifiedRightHandSide1,
                solution1,
            );

            for (let i: number = 0; i < WIDTH; i++) {
                intermediateConcentration[rowOffset + i] = solution1[i];
            }
        }

        /////////////-----  SECOND HALF-STEP (Y-sweep)  -----/////////////
        // Solve implicitly in y, explicitly in x.
        // Clamped indexing implements Neumann (zero-flux) BCs in x:
        //   iLeft = max(i-1, 0),  iRight = min(i+1, WIDTH-1)
        for (let i: number = 0; i < WIDTH; i++) {
            const iLeft: number = i > 0 ? i - 1 : 0;
            const iRight: number = i < WIDTH - 1 ? i + 1 : WIDTH - 1;

            for (let j: number = 0; j < HEIGHT; j++) {
                const rowOffset: number = j * WIDTH;
                const idx: number = rowOffset + i;

                const center: number = intermediateConcentration[idx];
                const left: number = intermediateConcentration[rowOffset + iLeft];
                const right: number = intermediateConcentration[rowOffset + iRight];

                d2[j] =
                    alpha * left +
                    (1 - 2 * alpha - gamma[idx]) * center +
                    alpha * right +
                    scaledSources[idx];
            }
            updateMainDiagonalYstep(i);

            thomasAlgorithm(
                a2,
                b2,
                c2,
                d2,
                HEIGHT,
                modifiedUpperDiagonal2,
                modifiedRightHandSide2,
                solution2,
            );

            for (let j: number = 0; j < HEIGHT; j++) {
                const pos: number = j * WIDTH + i;
                if (solution2[j] < 0) {
                    reachedNegativeValue = true;
                }
                currentConcentrationData[pos] = solution2[j];
            }
        }
    }

    if (reachedNegativeValue && !allowNegativeValues) {
        console.warn("Concentration went negative at ADI");
        return null;
    }
    return currentConcentrationData;
};
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-init-arrays>>[init]
const generateDiagonals = (
    length: number,
    alpha: number,
    gamma: number,
): {
    lowerDiagonal: Float64Array;
    mainDiagonal: Float64Array;
    upperDiagonal: Float64Array;
    rightHandSide: Float64Array;
} => {
    const lowerDiagonal: Float64Array = new Float64Array(length).fill(-alpha);
    const mainDiagonal: Float64Array = new Float64Array(length).fill(1 + 2 * alpha + gamma);
    const upperDiagonal: Float64Array = new Float64Array(length).fill(-alpha);
    const rightHandSide: Float64Array = new Float64Array(length);
    mainDiagonal[0] = 1 + alpha + gamma;
    mainDiagonal[length - 1] = 1 + alpha + gamma;
    lowerDiagonal[0] = 0;
    upperDiagonal[length - 1] = 0;
    return { lowerDiagonal, mainDiagonal, upperDiagonal, rightHandSide };
};
// ~/~ end
// ~/~ begin <<literate/adi.qmd#adi-init-arrays>>[1]
export const initADIArrays = (
    WIDTH: number,
    HEIGHT: number,
    DIFFUSION_RATE: number,
    deltaX: number,
    deltaT: number,
): {
    modifiedUpperDiagonal1: Float64Array;
    modifiedRightHandSide1: Float64Array;
    solution1: Float64Array;
    modifiedUpperDiagonal2: Float64Array;
    modifiedRightHandSide2: Float64Array;
    solution2: Float64Array;
    intermediateConcentration: Float64Array;
    a1: Float64Array;
    b1: Float64Array;
    c1: Float64Array;
    d1: Float64Array;
    a2: Float64Array;
    b2: Float64Array;
    c2: Float64Array;
    d2: Float64Array;
    alpha: number;
    halfDeltaT: number;
    scaledSources: Float64Array;
    gamma: Float64Array;
} => {
    const modifiedUpperDiagonal1: Float64Array = new Float64Array(WIDTH);
    const modifiedRightHandSide1: Float64Array = new Float64Array(WIDTH);
    const solution1: Float64Array = new Float64Array(WIDTH);
    const modifiedUpperDiagonal2: Float64Array = new Float64Array(HEIGHT);
    const modifiedRightHandSide2: Float64Array = new Float64Array(HEIGHT);
    const solution2: Float64Array = new Float64Array(HEIGHT);
    const intermediateConcentration: Float64Array = new Float64Array(WIDTH * HEIGHT);
    const scaledSources: Float64Array = new Float64Array(WIDTH * HEIGHT);
    const gamma: Float64Array = new Float64Array(WIDTH * HEIGHT).fill(0);

    const alpha: number = (DIFFUSION_RATE * deltaT) / (2 * deltaX * deltaX);
    const gammaPoint: number = 0;
    const {
        lowerDiagonal: a1,
        mainDiagonal: b1,
        upperDiagonal: c1,
        rightHandSide: d1,
    } = generateDiagonals(WIDTH, alpha, gammaPoint);
    const {
        lowerDiagonal: a2,
        mainDiagonal: b2,
        upperDiagonal: c2,
        rightHandSide: d2,
    } = generateDiagonals(HEIGHT, alpha, gammaPoint);
    const halfDeltaT: number = deltaT / 2;
    return {
        modifiedUpperDiagonal1,
        modifiedRightHandSide1,
        solution1,
        modifiedUpperDiagonal2,
        modifiedRightHandSide2,
        solution2,
        intermediateConcentration,
        a1,
        b1,
        c1,
        d1,
        a2,
        b2,
        c2,
        d2,
        alpha,
        halfDeltaT,
        scaledSources,
        gamma,
    };
};
// ~/~ end
// ~/~ end
