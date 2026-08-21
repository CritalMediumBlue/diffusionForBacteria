import Plotly from "plotly.js-dist";
import {
    ADI,
    setADIProperties,
    analyticSteadyState,
    effectiveInfluence,
    updateSinksAndSources,
} from "handy-diffusion";
import {
    createRandomSources,
    checkForSteadyState,
    convertTo2D,
    calculateDifference,
} from "../src/helpers.js";

const width = 100;
const height = 100;
const diffusionCoefficient = 1.0;
const deltaX = 1.0;
const deltaT = 0.1;
const uptakeRate = 0.01;
const decayRate = uptakeRate / diffusionCoefficient;
const maxmode = 200;

/**
 * Build a "half-plane" source field: every cell with column index below
 * `threshold` is filled with `sourceStrength`, the rest are 0.
 */
const createHalfPlaneSources = (width, height, sourceStrength, threshold = 50) => {
    const sources = new Float64Array(width * height).fill(0);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const idx = i * width + j;
            if (j < threshold) {
                sources[idx] = sourceStrength;
            }
        }
    }
    return sources;
};

/** Generate `count` evenly spaced values from `start` to `end` (inclusive). */
const linspace = (start, end, count) => {
    const values = new Float64Array(count);
    for (let i = 0; i < count; i++) {
        values[i] = start + i * ((end - start) / (count - 1));
    }
    return values;
};

/**
 * Run one full experiment (numerical, analytic, effective influence and the
 * lambda/scale RMS sweep) and return every dataset required for plotting.
 *
 * @param {object} config
 * @param {string} config.label      Human-readable name used in plot titles.
 * @param {Float64Array} config.sources  source field to simulate.
 * @param {Float64Array} config.lambdaValues  lambda sweep values.
 * @param {Float64Array} config.scaleValues   scale sweep values.
 * @param {number} config.lambda      chosen lambda for the effective solution.
 * @param {number} config.scale       chosen scale for the effective solution.
 * @param {number|null} config.ignoreSourcesValue  if not null, source cells in
 *   the "ignoring sources" difference view are replaced by this value.
 */
const computeExperiment = (config) => {
    const {
        label,
        sources,
        lambdaValues,
        scaleValues,
        lambda,
        scale,
        ignoreSourcesValue = null,
    } = config;

    // calculate numerical solution using ADI
    setADIProperties(width, height, diffusionCoefficient, deltaX, deltaT);
    const sinks = new Float64Array(width * height).fill(decayRate);
    updateSinksAndSources(sinks, sources);
    let steadyStateReached = false;
    const adiSolution = new Float64Array(width * height).fill(0);
    const previousADISolution = new Float64Array(width * height).fill(0);

    while (!steadyStateReached) {
        ADI(adiSolution, 20, true);
        steadyStateReached = checkForSteadyState(previousADISolution, adiSolution);
        previousADISolution.set(adiSolution);
    }

    // calculate analytic solution using eigenfunction expansion
    const analyticSolution = analyticSteadyState(
        width,
        height,
        diffusionCoefficient,
        decayRate,
        deltaX,
        sources,
        maxmode
    );

    // calculate difference between numerical and analytical solutions
    const difference = calculateDifference(adiSolution, analyticSolution);
    const logDifference = new Float64Array(difference.length);
    for (let i = 0; i < difference.length; i++) {
        logDifference[i] = Math.log10(Math.abs(difference[i]) + 1e-20); // add small value to avoid log(0)
    }

    const averageResult = new Float64Array(width * height).fill(0);
    for (let i = 0; i < width * height; i++) {
        averageResult[i] = (adiSolution[i] + analyticSolution[i]) / 2;
    }

    // effective influence solution at the chosen lambda/scale
    const effectiveSolution = effectiveInfluence(width, height, sources, lambda, scale);
    const differenceEffectiveAnalytic = calculateDifference(effectiveSolution, analyticSolution);

    // optional "ignoring sources" view: mask source cells
    const diffEffAnalyIgnoringSources = differenceEffectiveAnalytic.slice();
    if (ignoreSourcesValue !== null) {
        for (let i = 0; i < diffEffAnalyIgnoringSources.length; i++) {
            if (sources[i] !== 0) {
                diffEffAnalyIgnoringSources[i] = ignoreSourcesValue;
            }
        }
    }

    const logDifferenceEffectiveAnalytic = new Float64Array(diffEffAnalyIgnoringSources.length);
    for (let i = 0; i < diffEffAnalyIgnoringSources.length; i++) {
        logDifferenceEffectiveAnalytic[i] = Math.log10(
            Math.abs(diffEffAnalyIgnoringSources[i]) + 1e-20
        ); // add small value to avoid log(0)
    }

    // compare all lambda and scale values by calculating the RMS error
    const allRmsErrors = new Float64Array(lambdaValues.length * scaleValues.length);
    for (let i = 0; i < lambdaValues.length; i++) {
        for (let j = 0; j < scaleValues.length; j++) {
            const sweptEffective = effectiveInfluence(
                width,
                height,
                sources,
                lambdaValues[i],
                scaleValues[j]
            );
            let sumSquares = 0;
            const sweptDifferences = calculateDifference(averageResult, sweptEffective);
            for (let k = 0; k < sweptDifferences.length; k++) {
                sumSquares += sweptDifferences[k] * sweptDifferences[k];
            }
            allRmsErrors[i * scaleValues.length + j] = Math.sqrt(
                sumSquares / sweptEffective.length
            );
            console.log(
                `${label}: i=${i} of ${lambdaValues.length}, j=${j} of ${scaleValues.length} completed`
            );
        }
    }

    return {
        label,
        lambda,
        scale,
        lambdaValues,
        scaleValues,
        numericalData: convertTo2D(adiSolution, width, height),
        analyticalData: convertTo2D(analyticSolution, width, height),
        differenceData: convertTo2D(difference, width, height),
        logDifferenceData: convertTo2D(logDifference, width, height),
        effectiveData: convertTo2D(effectiveSolution, width, height),
        differenceEffectiveAnalyticData: convertTo2D(differenceEffectiveAnalytic, width, height),
        differenceEffectiveAnalyticIgnoringSourcesData: convertTo2D(
            diffEffAnalyIgnoringSources,
            width,
            height
        ),
        logDifferenceEffectiveAnalyticData: convertTo2D(
            logDifferenceEffectiveAnalytic,
            width,
            height
        ),
        rmsErrorsData: convertTo2D(allRmsErrors, scaleValues.length, lambdaValues.length),
    };
};

// ---------------------------------------------------------------------------
// Experiment configurations
// ---------------------------------------------------------------------------

// Experiment 1: random sources (was the `plot` script)
const randomSourcesConfig = {
    label: "Random Sources",
    sources: createRandomSources(width, height, 0.02),
    lambdaValues: new Float64Array([5.4, 6.0, 6.6, 7.2, 7.8, 8.4, 9.0, 9.6, 10.2]),
    scaleValues: new Float64Array([92, 94, 96, 98, 100, 102, 104, 106, 108]),
    lambda: 7.3,
    scale: 100,
    ignoreSourcesValue: 1e-4,
};

// Experiment 2: half-plane sources (was the `plot:article2D` script)
const halfPlaneSourcesConfig = {
    label: "Half-Plane Sources",
    sources: createHalfPlaneSources(width, height, 0.1),
    lambdaValues: linspace(8.0, 8.5, 9),
    scaleValues: linspace(98.8, 99.8, 9),
    lambda: 8.25,
    scale: 99.425,
    ignoreSourcesValue: null, // sources are NOT masked off for this experiment
};

const experiments = [randomSourcesConfig, halfPlaneSourcesConfig].map(computeExperiment);

// unique id suffix per experiment so both sets of plots can coexist
const idSuffix = (index) => (index === 0 ? "random" : "article2d");

// ---------------------------------------------------------------------------
// Plotting
// ---------------------------------------------------------------------------

const heatmapLayout = (titleText) => ({
    title: { text: titleText, font: { size: 20 } },
    xaxis: { title: { text: "X Position" } },
    yaxis: { title: { text: "Y Position" } },
    margin: { t: 30, b: 80, l: 80, r: 50 },
});

const heatmapTrace = (data, colorbarTitle) => ({
    z: data,
    type: "heatmap",
    colorscale: "Viridis",
    colorbar: { title: colorbarTitle },
});

experiments.forEach((experiment, index) => {
    const suffix = idSuffix(index);
    const plotId = (name) => `${name}-${suffix}`;
    const label = experiment.label;

    // numerical solution heatmap
    Plotly.newPlot(
        plotId("numerical-plot"),
        [heatmapTrace(experiment.numericalData, "Concentration")],
        heatmapLayout(`Numerical Solution (ADI Method) - ${label}`),
        { responsive: true }
    );

    // analytical solution heatmap
    Plotly.newPlot(
        plotId("analytic-plot"),
        [heatmapTrace(experiment.analyticalData, "Concentration")],
        heatmapLayout(`Analytical Solution (truncated eigenfunction expansion) - ${label}`),
        { responsive: true }
    );

    // effective solution heatmap
    Plotly.newPlot(
        plotId("effective-plot"),
        [heatmapTrace(experiment.effectiveData, "Concentration")],
        heatmapLayout(
            `Eff. Solution (λ=${experiment.lambda}, Scale=${experiment.scale}) - ${label}`
        ),
        { responsive: true }
    );

    // difference heatmap (ADI vs analytic)
    Plotly.newPlot(
        plotId("comparison-plot"),
        [heatmapTrace(experiment.differenceData, "Absolute Difference")],
        heatmapLayout(`Difference Between ADI and Analytical Solution - ${label}`),
        { responsive: true }
    );

    // log difference heatmap (ADI vs analytic)
    Plotly.newPlot(
        plotId("log-comparison-plot"),
        [heatmapTrace(experiment.logDifferenceData, "Log10 Absolute Difference")],
        heatmapLayout(`Logarithmic Diff Between ADI and Analytical Solution - ${label}`),
        { responsive: true }
    );

    // difference heatmap (effective vs analytic)
    Plotly.newPlot(
        plotId("difference-effective-analytic-plot"),
        [heatmapTrace(experiment.differenceEffectiveAnalyticData, "Absolute Difference")],
        heatmapLayout(`Diff Between Effective and Analytic Solution - ${label}`),
        { responsive: true }
    );

    // log difference heatmap (effective vs analytic)
    Plotly.newPlot(
        plotId("log-difference-effective-analytic-plot"),
        [heatmapTrace(experiment.logDifferenceEffectiveAnalyticData, "Log10 Absolute Difference")],
        heatmapLayout(`Log Diff Between Effective and Analytic Solutions - ${label}`),
        { responsive: true }
    );

    // difference heatmap (effective vs analytic, ignoring sources)
    Plotly.newPlot(
        plotId("difference-ignoring-sources-plot"),
        [
            heatmapTrace(
                experiment.differenceEffectiveAnalyticIgnoringSourcesData,
                "Absolute Difference"
            ),
        ],
        heatmapLayout(`Diff Between Effective and Analytic Solutions Ignoring Sources - ${label}`),
        { responsive: true }
    );

    // RMS error heatmap over the lambda x scale sweep
    Plotly.newPlot(
        plotId("rms-error-plot"),
        [
            {
                z: experiment.rmsErrorsData,
                x: Array.from(experiment.scaleValues),
                y: Array.from(experiment.lambdaValues),
                type: "heatmap",
                colorscale: "Viridis",
                colorbar: { title: "RMS Error" },
            },
        ],
        {
            title: {
                text: `RMS Error for Different Lambda and Scale Values - ${label}`,
                font: { size: 20 },
            },
            xaxis: { title: { text: "Scale Values" } },
            yaxis: { title: { text: "Lambda Values" } },
            margin: { t: 30, b: 80, l: 80, r: 50 },
        },
        { responsive: true }
    );
});
