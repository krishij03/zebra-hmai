var fs = require('fs');
var path = require('path');

var HMRE_MEMORY_DIR = path.join(__dirname, '..', '..', 'config', 'hmreMemory');

function ensureDirectoryExists(directory, callback) {
    fs.mkdir(directory, { recursive: true }, function(err) {
        if (err && err.code !== 'EEXIST') {
            callback(err);
        } else {
            callback(null);
        }
    });
}

function readLparData(lpar, callback) {
    var filePath = path.join(HMRE_MEMORY_DIR, lpar + '.json');
    ensureDirectoryExists(HMRE_MEMORY_DIR, function(err) {
        if (err) {
            return callback(err);
        }
        fs.readFile(filePath, 'utf8', function(err, data) {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log('No existing data for ' + lpar + ', initializing with empty object');
                    fs.writeFile(filePath, JSON.stringify({}), 'utf8', function(writeErr) {
                        if (writeErr) {
                            return callback(writeErr);
                        }
                        callback(null, {});
                    });
                } else {
                    return callback(err);
                }
            } else {
                try {
                    var parsedData = JSON.parse(data);
                    callback(null, parsedData);
                } catch (parseError) {
                    callback(parseError);
                }
            }
        });
    });
}

function writeLparData(lpar, data, callback) {
    var filePath = path.join(HMRE_MEMORY_DIR, lpar + '.json');
    ensureDirectoryExists(HMRE_MEMORY_DIR, function(err) {
        if (err) {
            return callback(err);
        }
        fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', callback);
    });
}

function updateLparData(lpar, newData, callback) {
    readLparData(lpar, function(err, currentData) {
        if (err) {
            return callback(err);
        }
        
        // Merge the new data with existing data
        const mergedData = { ...currentData };
        
        // For each directory in newData
        Object.entries(newData).forEach(([dirName, dirData]) => {
            if (mergedData[dirName]) {
                // If directory exists, merge the metrics without duplicates
                const existingMetrics = mergedData[dirName].processedMetrics || [];
                const newMetrics = dirData.processedMetrics || [];
                
                mergedData[dirName] = {
                    timestamp: dirData.timestamp,
                    processedMetrics: [...new Set([...existingMetrics, ...newMetrics])]
                };
                
                console.log(`Updated metrics for ${dirName}:`, mergedData[dirName].processedMetrics);
            } else {
                // If directory is new, add it with its metrics
                mergedData[dirName] = {
                    timestamp: dirData.timestamp,
                    processedMetrics: dirData.processedMetrics || []
                };
                console.log(`Added new directory ${dirName} with metrics:`, mergedData[dirName].processedMetrics);
            }
        });

        writeLparData(lpar, mergedData, function(writeErr) {
            if (writeErr) {
                return callback(writeErr);
            }
            callback(null, mergedData);
        });
    });
}

module.exports = {
    readLparData: readLparData,
    writeLparData: writeLparData,
    updateLparData: updateLparData
}; 