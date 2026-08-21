// ~/~ begin <<literate/adi.qmd#src/adi.js>>[init]
// ~/~ begin <<literate/adi.qmd#adi-imports>>[init]
import { thomasAlgorithm } from "./thomasAlgorithm.js";
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-variables>>[init]
let WIDTH;
let HEIGHT;
let modifiedUpperDiagonal1, modifiedRightHandSide1, solution1;
let modifiedUpperDiagonal2, modifiedRightHandSide2, solution2;
let intermediateConcentration;
let a1, b1, c1, d1;
let a2, b2, c2, d2;
let alpha, halfDeltaT, scaledSources;
let gamma;
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-set-properties>>[init]
export const setADIProperties = (
    width,
    height,
    diffusionCoefficient,
    deltaX,
    deltaT,
) => {
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
export const updateSinksAndSources = (sinks, sources) => {
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        gamma[i] = (sinks[i] * halfDeltaT) / 2;
        scaledSources[i] = sources[i] * halfDeltaT;
    }
}
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-update-diagonal-x>>[init]
const updateMainDiagonalXstep = (yCoord) => {
    //update b1
    for (let i = 0; i < WIDTH; i++) {
        const idx = yCoord * WIDTH + i;
        b1[i] = 1 + 2 * alpha + gamma[idx];
    }
    //boundary conditions
    b1[0] = 1 + alpha + gamma[yCoord * WIDTH + 0];
    b1[WIDTH - 1] = 1 + alpha + gamma[yCoord * WIDTH + (WIDTH - 1)];
}
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-update-diagonal-y>>[init]
const updateMainDiagonalYstep = (xCoord) => {
    //update b2
    for (let j = 0; j < HEIGHT; j++) {
        const idx = j * WIDTH + xCoord;
        b2[j] = 1 + 2 * alpha + gamma[idx];
    }
    //boundary conditions
    b2[0] = 1 + alpha + gamma[0 * WIDTH + xCoord];
    b2[HEIGHT - 1] = 1 + alpha + gamma[(HEIGHT - 1) * WIDTH + xCoord];
}
// ~/~ end

// ~/~ begin <<literate/adi.qmd#adi-main-function>>[init]
export const ADI = (
    concentrationData,
    totalNumberOfIterations,
    allowNegativeValues = false
) => {
    let reachedNegativeValue = false;

    const currentConcentrationData = concentrationData;

    for (let iteration = 0; iteration < totalNumberOfIterations; iteration++) {
        /////////////-----  FIRST HALF-STEP (X-sweep)  -----/////////////
        // Solve implicitly in x, explicitly in y.
        // Clamped indexing implements Neumann (zero-flux) BCs in y:
        //   jBelow = max(j-1, 0),  jAbove = min(j+1, HEIGHT-1)
        for (let j = 0; j < HEIGHT; j++) {
            const jBelow = j > 0 ? j - 1 : 0;
            const jAbove = j < HEIGHT - 1 ? j + 1 : HEIGHT - 1;
            const rowOffset = j * WIDTH;

            for (let i = 0; i < WIDTH; i++) {
                const idx = rowOffset + i;

                const center = currentConcentrationData[idx];
                const bottom = currentConcentrationData[jBelow * WIDTH + i];
                const top = currentConcentrationData[jAbove * WIDTH + i];

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
                solution1
            );

            for (let i = 0; i < WIDTH; i++) {
                intermediateConcentration[rowOffset + i] = solution1[i];
            }
        }

        /////////////-----  SECOND HALF-STEP (Y-sweep)  -----/////////////
        // Solve implicitly in y, explicitly in x.
        // Clamped indexing implements Neumann (zero-flux) BCs in x:
        //   iLeft = max(i-1, 0),  iRight = min(i+1, WIDTH-1)
        for (let i = 0; i < WIDTH; i++) {
            const iLeft = i > 0 ? i - 1 : 0;
            const iRight = i < WIDTH - 1 ? i + 1 : WIDTH - 1;

            for (let j = 0; j < HEIGHT; j++) {
                const rowOffset = j * WIDTH;
                const idx = rowOffset + i;

                const center = intermediateConcentration[idx];
                const left = intermediateConcentration[rowOffset + iLeft];
                const right = intermediateConcentration[rowOffset + iRight];

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
                solution2
            );

            for (let j = 0; j < HEIGHT; j++) {
                const pos = j * WIDTH + i;
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
const generateDiagonals = (length, alpha, gamma) => {
    const lowerDiagonal = new Float64Array(length).fill(-alpha);
    const mainDiagonal = new Float64Array(length).fill(1 + 2 * alpha + gamma);
    const upperDiagonal = new Float64Array(length).fill(-alpha);
    const rightHandSide = new Float64Array(length);
    mainDiagonal[0] = 1 + alpha + gamma;
    mainDiagonal[length - 1] = 1 + alpha + gamma;
    lowerDiagonal[0] = 0;
    upperDiagonal[length - 1] = 0;
    return { lowerDiagonal, mainDiagonal, upperDiagonal, rightHandSide };
};

export const initADIArrays = (WIDTH, HEIGHT, DIFFUSION_RATE, deltaX, deltaT) => {
    const modifiedUpperDiagonal1 = new Float64Array(WIDTH);
    const modifiedRightHandSide1 = new Float64Array(WIDTH);
    const solution1 = new Float64Array(WIDTH);
    const modifiedUpperDiagonal2 = new Float64Array(HEIGHT);
    const modifiedRightHandSide2 = new Float64Array(HEIGHT);
    const solution2 = new Float64Array(HEIGHT);
    const intermediateConcentration = new Float64Array(WIDTH * HEIGHT);
    const scaledSources = new Float64Array(WIDTH * HEIGHT);
    const gamma = new Float64Array(WIDTH * HEIGHT).fill(0);

    const alpha = (DIFFUSION_RATE * deltaT) / (2 * deltaX * deltaX);
    const gammaPoint = 0;
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
    const halfDeltaT = deltaT / 2;
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
