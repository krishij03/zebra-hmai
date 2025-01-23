const axios = require('axios');
const mysql = require('mysql2/promise');
const cacheJSONController = require('./cacheJSONController');

const runningProcesses = {};
const monitoringIntervals = {};

async function createDatabaseAndTable(connection) {
    try {
        // Create table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS cache_subsystem_activity (
                id INT AUTO_INCREMENT PRIMARY KEY,
                root_variable INT,
                report VARCHAR(255),
                \`system\` VARCHAR(255),
                \`timestamp\` DATETIME,
                cache_interval_start DATETIME,
                cache_interval_duration TIME,
                ssid INT,
                storage_subsystem_descriptor JSON,
                subsystem_storage_and_status JSON,
                cache_subsystem_overview JSON,
                miscellaneous_cache_activities JSON,
                host_adapter_activity JSON,
                disk_activity JSON,
                cache_subsystem_device_overview JSON,
                subsystem_id VARCHAR(100) AS (JSON_UNQUOTE(storage_subsystem_descriptor->'$.Subsystem')) STORED
            )
        `);

        // Create indexes
        const indexQueries = [
            'CREATE INDEX idx_cache_timestamp_ssid ON cache_subsystem_activity (`timestamp`, ssid)',
            'CREATE INDEX idx_cache_root_variable ON cache_subsystem_activity (root_variable)',
            'CREATE INDEX idx_subsystem_id ON cache_subsystem_activity (subsystem_id)'
        ];

        for (const query of indexQueries) {
            try {
                await connection.query(query);
            } catch (error) {
                if (error.code !== 'ER_DUP_KEYNAME') {
                    throw error;
                }
            }
        }

        console.log('Database and table setup completed');
    } catch (error) {
        console.error('Error in database/table creation:', error);
        throw error;
    }
}

function parseTimestamp(timeString) {
    const [datePart, timePart] = timeString.split('-');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split('.');
    
    const formattedYear = year;
    const formattedMonth = month.padStart(2, '0');
    const formattedDay = day.padStart(2, '0');
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    const formattedSecond = second.padStart(2, '0');
    
    return `${formattedYear}-${formattedMonth}-${formattedDay} ${formattedHour}:${formattedMinute}:${formattedSecond}`;
}

function replaceNulls(obj) {
    if (obj === null || obj === undefined || obj === "") {
        return 0;
    } else if (Array.isArray(obj)) {
        return obj.map(replaceNulls);
    } else if (typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = replaceNulls(value);
        }
        return result;
    }
    return obj;
}

async function insertData(connection, data, lpar) {
    try {
        const memory = await new Promise((resolve, reject) => {
            cacheJSONController.readLparData(lpar, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        
        // Initialize processedTimestamps array if it doesn't exist
        const processedTimestamps = memory.processedTimestamps || [];
        let newDataInserted = false;
        let distinctTimestamps = new Set(); // Track distinct timestamps for this run

        for (const [rootVar, rootData] of Object.entries(data)) {
            const timestampStr = parseTimestamp(rootData.Timestamp);
            
            // Skip if timestamp was processed in previous runs or in current run
            if (processedTimestamps.includes(timestampStr) || distinctTimestamps.has(timestampStr)) {
                console.log(`Skipping already processed timestamp ${timestampStr}`);
                continue;
            }

            distinctTimestamps.add(timestampStr); // Add to current run's set

            for (const [ssidKey, ssidData] of Object.entries(rootData)) {
                if (ssidKey.startsWith('Cache Subsystem Activity for SSID')) {
                    const ssid = parseInt(ssidKey.split(' ').pop());
                    const cacheIntervalStart = parseTimestamp(rootData['Cache Interval'].Start);
                    const [minutes, seconds] = rootData['Cache Interval']['Interval (mm.ss)'].split('.');
                    const cacheIntervalDuration = `${minutes || 0}:${seconds || 0}:00`;

                    const insertData = [
                        parseInt(rootVar),
                        rootData.Report,
                        rootData.System,
                        timestampStr,
                        cacheIntervalStart,
                        cacheIntervalDuration,
                        ssid,
                        JSON.stringify(replaceNulls(ssidData['Storage Subsystem Descriptor'])),
                        JSON.stringify(replaceNulls(ssidData['Subsystem Storage and Status'])),
                        JSON.stringify(replaceNulls(ssidData['Cache Subsystem Overview'])),
                        JSON.stringify(replaceNulls(ssidData['Miscellaneous Cache Activities'])),
                        JSON.stringify(replaceNulls(ssidData['Host Adapter Activity'])),
                        JSON.stringify(replaceNulls(ssidData['Disk Activity'])),
                        JSON.stringify(replaceNulls(ssidData['Cache Subsystem Device Overview']))
                    ];

                    try {
                        await connection.query(`
                            INSERT INTO cache_subsystem_activity (
                                root_variable, report, \`system\`, timestamp, cache_interval_start, 
                                cache_interval_duration, ssid, storage_subsystem_descriptor, 
                                subsystem_storage_and_status, cache_subsystem_overview,
                                miscellaneous_cache_activities, host_adapter_activity, 
                                disk_activity, cache_subsystem_device_overview
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, insertData);

                        newDataInserted = true;
                    } catch (error) {
                        console.error('Error inserting data:', error);
                        throw error;
                    }
                }
            }
        }

        if (newDataInserted) {
            // Update memory file with only distinct timestamps
            const updatedTimestamps = [...new Set([...processedTimestamps, ...distinctTimestamps])];
            await new Promise((resolve, reject) => {
                cacheJSONController.writeLparData(lpar, { 
                    processedTimestamps: updatedTimestamps 
                }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log(`Data insertion completed successfully. Processed ${distinctTimestamps.size} new timestamps`);
        } else {
            console.log('No new data to insert');
        }
    } catch (error) {
        console.error('Error in data insertion:', error);
        throw error;
    }
}

async function fetchData(lpar, startDate, endDate, config) {
    const url = `${config.zebra_httptype}://${config.appurl}:${config.appport}/v1/${lpar}/rmfpp/CACHE?start=${startDate}&end=${endDate}`;

    try {
        console.log(`Fetching data from: ${url}`);
        const response = await axios.get(url, {
            timeout: 300000
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

async function startCache(req, res) {
    const { startDate, endDate, lpar, continuousMonitoring } = req.body;
    console.log(`startCache called with params:`, { startDate, endDate, lpar, continuousMonitoring });

    if (runningProcesses[lpar] && runningProcesses[lpar].isRunning) {
        return res.status(400).json({ success: false, message: `Cache process is already running for ${lpar}` });
    }

    runningProcesses[lpar] = { 
        isRunning: true, 
        continuousMonitoring: continuousMonitoring,
        startDate: startDate,
        endDate: continuousMonitoring ? null : endDate
    };

    let mysqlConnection;
    let databaseCreated = false;

    try {
        const config = require('../../config/Zconfig.json');
        
        // Create MySQL connection without database specified
        mysqlConnection = await mysql.createConnection({
            host: config.dds[lpar].hmai.mysql.host,
            user: config.dds[lpar].hmai.mysql.user,
            password: config.dds[lpar].hmai.mysql.password,
            multipleStatements: true
        });

        // Check if database exists
        const [rows] = await mysqlConnection.query(`SHOW DATABASES LIKE '${lpar}'`);
        if (rows.length === 0) {
            await mysqlConnection.query(`CREATE DATABASE ${lpar}`);
            databaseCreated = true;
        }

        await mysqlConnection.query(`USE ${lpar}`);
        await createDatabaseAndTable(mysqlConnection);

        if (continuousMonitoring) {
            await collectData(lpar, startDate, null, config);
            startContinuousMonitoring(lpar, config);
        } else {
            await collectData(lpar, startDate, endDate, config);
            runningProcesses[lpar].isRunning = false;
        }

        res.json({ 
            success: true, 
            message: continuousMonitoring ? 'Cache process started and running continuously' : 'Cache process completed successfully',
            databaseCreated: databaseCreated
        });
    } catch (error) {
        console.error('Error in startCache:', error);
        delete runningProcesses[lpar];
        res.status(500).json({ success: false, message: 'Error in Cache process', error: error.message });
    } finally {
        if (!continuousMonitoring && mysqlConnection) {
            await mysqlConnection.end();
        }
    }
}

async function collectData(lpar, startDate, endDate, config) {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: config.dds[lpar].hmai.mysql.host,
            user: config.dds[lpar].hmai.mysql.user,
            password: config.dds[lpar].hmai.mysql.password,
            database: lpar,
            multipleStatements: true
        });

        const data = await fetchData(lpar, startDate, endDate, config);
        await connection.beginTransaction();
        await insertData(connection, data, lpar);
        await connection.commit();
        console.log(`Data collection cycle completed at ${new Date().toISOString()}`);
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error in data collection:', error);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

function startContinuousMonitoring(lpar, config) {
    const checkInterval = parseInt(config.dds[lpar].hmai.checkInterval);

    monitoringIntervals[lpar] = setInterval(async () => {
        try {
            await collectData(lpar, runningProcesses[lpar].startDate, null, config);
        } catch (error) {
            console.error(`Error in continuous monitoring for ${lpar}:`, error);
        }
    }, checkInterval * 60000);
}

async function clearDatabase(req, res) {
    const { lpar } = req.body;
    const config = require('../../config/Zconfig.json');
    let connection;

    try {
        connection = await mysql.createConnection({
            host: config.dds[lpar].hmai.mysql.host,
            user: config.dds[lpar].hmai.mysql.user,
            password: config.dds[lpar].hmai.mysql.password,
            database: lpar
        });

        await connection.query('TRUNCATE TABLE cache_subsystem_activity');

        await new Promise((resolve, reject) => {
            cacheJSONController.writeLparData(lpar, {}, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (runningProcesses[lpar]) {
            delete runningProcesses[lpar];
        }

        res.json({ success: true, message: `Database ${lpar} and Cache memory cleared successfully` });
    } catch (error) {
        console.error('Error clearing database and Cache memory:', error);
        res.json({ success: false, message: 'Failed to clear database and Cache memory: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
}

function stopContinuousMonitoring(req, res) {
    const { lpar } = req.body;
    console.log(`Attempting to stop Cache process for ${lpar}`);

    if (runningProcesses[lpar]) {
        if (monitoringIntervals[lpar]) {
            clearInterval(monitoringIntervals[lpar]);
            delete monitoringIntervals[lpar];
        }
        delete runningProcesses[lpar];
        res.json({ success: true, message: `Stopped Cache process for ${lpar}` });
    } else {
        res.status(400).json({ success: false, message: `No active Cache process for ${lpar}` });
    }
}

function getRunningProcesses(req, res) {
    const runningProcessesInfo = {};
    for (const lpar in runningProcesses) {
        runningProcessesInfo[lpar] = {
            isRunning: runningProcesses[lpar].isRunning,
            continuousMonitoring: runningProcesses[lpar].continuousMonitoring
        };
    }
    res.json(runningProcessesInfo);
}

module.exports = {
    startCache,
    clearDatabase,
    stopContinuousMonitoring,
    getRunningProcesses
}; 