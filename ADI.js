import { thomasAlgorithm } from "./thomasAlgorithm.js";
import { initADIArrays } from "./initArrays.js";

let WIDTH;
let HEIGHT;
let modifiedUpperDiagonal1, modifiedRightHandSide1, solution1;
let modifiedUpperDiagonal2, modifiedRightHandSide2, solution2;
let intermediateConcentration;
let a1, b1, c1, d1;
let a2, b2, c2, d2;
let alpha, halfDeltaT, scaledSources;
let gamma;

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

export const updateSinksAndSources = (sinks, sources) => {
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        gamma[i] = (sinks[i] * halfDeltaT) / 4;
        scaledSources[i] = sources[i] * halfDeltaT;
    }
}
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

export const ADI = (
    concentrationData,
    totalNumberOfIterations,
    allowNegativeValues = false
) => {
    let reachedNegativeValue = false;

    const currentConcentrationData = concentrationData;

    for (let iteration = 0; iteration < totalNumberOfIterations; iteration++) {
        /////////////-----  FIRST HALF-STEP  -----/////////////

        // INTERIOR POINTS
        for (let j = 1; j < HEIGHT - 1; j++) {
            const rowOffset = j * WIDTH;
            for (let i = 0; i < WIDTH; i++) {
                const idx = rowOffset + i;

                const center = currentConcentrationData[idx];
                const bottom = currentConcentrationData[(j - 1) * WIDTH + i];
                const top = currentConcentrationData[(j + 1) * WIDTH + i];

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

        // BOTTOM POINTS j = 0
        const rowOffsetBot = 0 * WIDTH;
        for (let i = 0; i < WIDTH; i++) {
            const idx = rowOffsetBot + i;

            const center = currentConcentrationData[idx];
            const bottom = center;
            const top = currentConcentrationData[1 * WIDTH + i];

            d1[i] =
                alpha * bottom +
                (1 - 2 * alpha - gamma[idx]) * center +
                alpha * top +
                scaledSources[idx];
        }
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
            intermediateConcentration[rowOffsetBot + i] = solution1[i];
        }

        // TOP POINTS j = HEIGHT-1
        const rowOffsetTop = (HEIGHT - 1) * WIDTH;
        for (let i = 0; i < WIDTH; i++) {
            const idx = rowOffsetTop + i;

            const center = currentConcentrationData[idx];
            const bottom = currentConcentrationData[(HEIGHT - 2) * WIDTH + i];
            const top = center;

            d1[i] =
                alpha * bottom +
                (1 - 2 * alpha - gamma[idx]) * center +
                alpha * top +
                scaledSources[idx];
        }
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
            intermediateConcentration[rowOffsetTop + i] = solution1[i];
        }

        /////////////-----  SECOND HALF-STEP  -----/////////////
        // INTERIOR POINTS
        for (let i = 1; i < WIDTH - 1; i++) {
            for (let j = 0; j < HEIGHT; j++) {
                const rowOffset = j * WIDTH;
                const idx = rowOffset + i;

                const center = intermediateConcentration[idx];
        const right = intermediateConcentration[rowOffset + (i + 1)];
        const left = intermediateConcentration[rowOffset + (i - 1)];


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

        // LEFT POINTS i = 0
        for (let j = 0; j < HEIGHT; j++) {
            const rowOffset = j * WIDTH;
            const idx = rowOffset;

            const center = intermediateConcentration[idx];
            const right = intermediateConcentration[j * WIDTH + 1];
            const left = center;

            d2[j] =
                alpha * left +
                (1 - 2 * alpha - gamma[idx]) * center +
                alpha * right +
                scaledSources[idx];
        }
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
            if (solution2[j] < 0) {
                reachedNegativeValue = true;
            }
            currentConcentrationData[j * WIDTH] = solution2[j];
        }

        // RIGHT POINTS i = WIDTH-1
        for (let j = 0; j < HEIGHT; j++) {
            const rowOffset = j * WIDTH;
            const idx = rowOffset + (WIDTH - 1);

            const center = intermediateConcentration[idx];
            const right = center;
            const left = intermediateConcentration[j * WIDTH + (WIDTH - 2)];

            d2[j] =
                alpha * left +
                (1 - 2 * alpha - gamma[idx]) * center +
                alpha * right +
                scaledSources[idx];
        }
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
            if (solution2[j] < 0) {
                reachedNegativeValue = true;
            }
            currentConcentrationData[j * WIDTH + (WIDTH - 1)] = solution2[j];
        }
    }

    if (reachedNegativeValue && !allowNegativeValues) {
        console.warn("Concentration went negative at ADI");
        return null;
    }
    return currentConcentrationData;
};
