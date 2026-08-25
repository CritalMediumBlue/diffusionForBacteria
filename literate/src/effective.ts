// ~/~ begin <<literate/effective.qmd#src/effective.ts>>[init]
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
export const effectiveInfluence = (
    width: number,
    height: number,
    sources: Float64Array,
    lambda: number,
    scale: number,
): Float64Array => {
    const effectiveInfluenceArray: Float64Array = new Float64Array(width * height).fill(0);

    // Distance cutoff: beyond 5*lambda, exp(-5) ≈ 0.007 (negligible)
    const cutoffDistance: number = lambda * 5;
    const cutoffDistanceSq: number = cutoffDistance * cutoffDistance;

    // For each target cell
    for (let j: number = 0; j < height; j++) {
        for (let i: number = 0; i < width; i++) {
            const targetX: number = i + 0.5;
            const targetY: number = j + 0.5;

            let localInfluence: number = 0;
            let totalInfluence: number = 0;

            // Single pass through all cells
            for (let jj: number = 0; jj < height; jj++) {
                for (let ii: number = 0; ii < width; ii++) {
                    const cellX: number = ii + 0.5;
                    const cellY: number = jj + 0.5;
                    const dx: number = cellX - targetX;
                    const dy: number = cellY - targetY;
                    const distSq: number = dx * dx + dy * dy;

                    // Apply distance cutoff
                    if (distSq > cutoffDistanceSq) continue;

                    const distance: number = Math.sqrt(distSq);
                    const influence: number = Math.exp(-distance / lambda);

                    totalInfluence += influence;

                    // Check if this cell is a source
                    const cellIdx: number = jj * width + ii;
                    if (sources[cellIdx] !== 0) {
                        localInfluence += sources[cellIdx] * influence;
                    }
                }
            }

            const idx: number = j * width + i;
            effectiveInfluenceArray[idx] = totalInfluence > 0 ?
                scale * localInfluence / totalInfluence : 0;
        }
    }

    return effectiveInfluenceArray;
}
// ~/~ end
// ~/~ end
