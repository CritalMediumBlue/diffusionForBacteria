import fs from 'fs';
import path from 'path';

// Store accumulated plots
let accumulatedPlots = [];

/**
 * Add a plot to the collection
 */
function addPlot(data, layout, title) {

	accumulatedPlots.push({ data, layout, title });
}



