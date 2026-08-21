// ~/~ begin <<literate/effective.qmd#src/effective.js>>[init]
// ~/~ begin <<literate/effective.qmd#effective-function>>[init]
/**
 * Compute the effective influence of sources on a grid using a
 * distance-weighted exponential kernel.
 *
 * @param {number} width  - Number of columns in the grid
 * @param {number} height - Number of rows in the grid
 * @param {Float64Array} sources - Flat array (row-major) of source strengths
 * @param {number} lambda - Decay length scale of the kernel
 * @param {number} scale  - Multiplier applied to the normalised influence
 * @returns {Float64Array} Flat array of effective influence per cell
 */
export const effectiveInfluence = (width, height, sources, lambda, scale) => {
    const effectiveInfluenceArray = new Float64Array(width * height).fill(0);

    // Distance cutoff: beyond 5*lambda, exp(-5) ≈ 0.007 (negligible)
    const cutoffDistance = lambda * 5;
    const cutoffDistanceSq = cutoffDistance * cutoffDistance;

    // For each target cell
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const targetX = i + 0.5;
            const targetY = j + 0.5;

            let localInfluence = 0;
            let totalInfluence = 0;

            // Single pass through all cells
            for (let jj = 0; jj < height; jj++) {
                for (let ii = 0; ii < width; ii++) {
                    const cellX = ii + 0.5;
                    const cellY = jj + 0.5;
                    const dx = cellX - targetX;
                    const dy = cellY - targetY;
                    const distSq = dx * dx + dy * dy;

                    // Apply distance cutoff
                    if (distSq > cutoffDistanceSq) continue;

                    const distance = Math.sqrt(distSq);
                    const influence = Math.exp(-distance / lambda);

                    totalInfluence += influence;

                    // Check if this cell is a source
                    const cellIdx = jj * width + ii;
                    if (sources[cellIdx] !== 0) {
                        localInfluence += sources[cellIdx] * influence;
                    }
                }
            }

            const idx = j * width + i;
            effectiveInfluenceArray[idx] = totalInfluence > 0 ?
                scale * localInfluence / totalInfluence : 0;
        }
    }

    return effectiveInfluenceArray;
}
// ~/~ end
// ~/~ end
