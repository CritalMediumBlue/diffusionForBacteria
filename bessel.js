import BESSEL from 'bessel'

export const BesselSolution = (
    concentrationData,
    width,
    height,
    sources,
    decayRate,
) => {
    if (width*height !== concentrationData.length) {
        throw new Error("Width and height do not match the size of concentration data");
    }
    if (width*height !== sources.length) {
        throw new Error("Width and height do not match the size of sources data");
    }

    const result = new Float64Array(concentrationData.length);
    const sourcePositions = [];
    // first get source positions
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            if (sources[index] !== 0) {
                sourcePositions.push({ x, y, strength: sources[index] });
            }
        }
    }

    // now calculate the contribution from each source using the Greens function for the screened Poisson equation, which involves the modified Bessel function of the second kind
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            let value = 0;
            for (const source of sourcePositions) {
                const dx = x - source.x;
                const dy = y - source.y;
                const r = Math.sqrt(dx * dx + dy * dy);
                if (r === 0) {
                    value += source.strength; // handle singularity at r=0
                } else {
                    value +=  source.strength * BESSEL.besselk( Math.sqrt(decayRate) * r, 0) / (2 * Math.PI);
                }
            }
            result[index] = value;
        }
    }

    return result;

}

 
