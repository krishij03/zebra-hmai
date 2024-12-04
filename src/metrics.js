/**
 * THIS SCRIPT PULLS METRICS DEFINED IN 'metrics.json' AND SETS PROMETHEUS UP TO SCRAPE THEM
 */

// Packages
const axios = require('axios');
const prometheus = require('prom-client');

// Config
const { appurl, appport, use_cert, dds, rmf3interval } = require('./config/Zconfig.json');

// Metrics in memory
const metrics = require('./metrics.json');

// Add this function to properly handle 3.1 format data
function process31FormatData(data, metric, lpar) {
    const results = [];
    if (!data.data) return results;

    data.data.forEach(row => {
        const identifierValue = row[metric.identifiers[0].key];
        const metricValue = row[metric.field];
        
        if (identifierValue && metricValue && metricValue !== "") {
            try {
                const mtrid = metric.name.split("_")[2];
                const name = `${lpar}_${identifierValue}_${mtrid}`;
                
                if (!isNaN(metricValue)) {
                    results.push({
                        name: name,
                        value: parseFloat(metricValue)
                    });
                }
            } catch (err) {
                console.log(`Error processing metric ${metric.name}:`, err);
            }
        }
    });
    return results;
}

// Modify the setInterval section
setInterval(async () => {
    try {
        const lpars = [];
        for (const lpar in dds) {
            if (dds[lpar].usePrometheus) {
                lpars.push(lpar);
            }
        }
        if (lpars.length === 0) return;

        // Clear Prometheus register
        prometheus.register.clear();

        for (const lpar of lpars) {
            const requests = {};
            for (const metricName in metrics) {
                const metric = metrics[metricName];
                if (metric.lpar === lpar) {
                    requests[metric.request.report] = metric.request.resource || dds[lpar]["mvsResource"];
                }
            }

            for (const report in requests) {
                const resource = requests[report];
                try {
                    const url = `${use_cert == 'true' ? 'https' : 'http'}://${appurl}:${appport}/v1/${lpar}/rmf3/${report}?resource=${resource}`;
                    // console.log(`Fetching metrics from: ${url}`);
                    
                    const response = await axios.get(url);
                    const result = response.data;

                    // Process metrics for this report
                    Object.entries(metrics)
                        .filter(([_, m]) => m.lpar === lpar && m.request.report === report)
                        .forEach(([metricName, metric]) => {
                            if (metric.identifiers[0].value === "ALL") {
                                let metricsToRegister = [];
                                
                                // Handle 3.1 format
                                if (result.data) {
                                    metricsToRegister = process31FormatData(result, { ...metric, name: metricName }, lpar);
                                }
                                // Handle 2.5 format
                                else if (result.table) {
                                    result.table.forEach(row => {
                                        const identifierValue = row[metric.identifiers[0].key];
                                        const metricValue = row[metric.field];
                                        
                                        if (identifierValue && metricValue && metricValue !== "") {
                                            const mtrid = metricName.split("_")[2];
                                            const name = `${lpar}_${identifierValue}_${mtrid}`;
                                            
                                            if (!isNaN(metricValue)) {
                                                metricsToRegister.push({
                                                    name: name,
                                                    value: parseFloat(metricValue)
                                                });
                                            }
                                        }
                                    });
                                }

                                // Register metrics
                                metricsToRegister.forEach(m => {
                                    try {
                                        // console.log(`Registering metric: ${m.name} with value: ${m.value}`);
                                        const gauge = new prometheus.Gauge({
                                            name: m.name,
                                            help: metric.desc,
                                            labelNames: ['parm']
                                        });
                                        gauge.set({ parm: metric.field }, m.value);
                                    } catch (err) {
                                        // Keep error logging enabled for troubleshooting
                                        //console.log(`Error registering metric ${m.name}:`, err);
                                    }
                                });
                            }
                        });
                } catch (error) {
                    console.error(`Error fetching ${report} for ${lpar}:`, error.message);
                }
            }
        }
    } catch (error) {
        console.error('Scrape error:', error);
    }
}, parseInt(rmf3interval) * 1000);

console.log("Prometheus scraping started");

// Modify the handle31Format function
function handle31Format(data, metric) {
    if (metric.identifiers[0].value === "ALL") {
        const results = [];
        // For 3.1, data is in report[0].row
        if (data.report && data.report[0] && data.report[0].row) {
            const report = data.report[0];
            
            // Create column mapping
            const columnMap = {};
            if (report.columnHeaders && report.columnHeaders.col) {
                report.columnHeaders.col.forEach((col, index) => {
                    columnMap[index] = col.value;
                });
            }

            report.row.forEach(row => {
                // Map column values to field names
                const rowData = {};
                row.col.forEach((value, index) => {
                    rowData[columnMap[index]] = value;
                });

                const identifierValue = rowData[metric.identifiers[0].key];
                const metricValue = rowData[metric.field];
                
                if (identifierValue && metricValue && metricValue !== "") {
                    results.push({
                        identifier: identifierValue,
                        value: metricValue
                    });
                }
            });
            return results;
        }
    }
    
    // Check captions for 3.1 (note: it's in report[0].caption.var)
    if (data.report && data.report[0] && data.report[0].caption && data.report[0].caption.var) {
        const captionVar = data.report[0].caption.var.find(item => item.name === metric.field);
        if (captionVar && captionVar.value !== "") {
            return captionVar.value;
        }
    }
    return null;
}

// Modify the getValue function to handle both formats
function getValue(data, metric) {
    // First check if it's 3.1 format
    if (data.report || data.captions || data.data) {
        return handle31Format(data, metric);
    }

    // Existing 2.5 format handling
    if (data.caption) {
        for (const key in data.caption) {
            if (key === metric.field) {
                return data.caption[metric.field];
            }
        }
    }

    if (data.table) {
        for (const entity of data.table) {
            var passes = true;
            for (const condition of metric.identifiers) {
                if (entity[condition.key] !== condition.value) {
                    passes = false;
                    break;
                }
            }
            if (passes) {
                return entity[metric.field];
            }
        }
    }
    return null;
}

// HELPER FUNCTION TO CHECK IF FOUND VALUE IS FLOAT
function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

module.exports = metrics;
