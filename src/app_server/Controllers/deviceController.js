const axios = require('axios');
const mysql = require('mysql2/promise');
const deviceJSONController = require('./deviceJSONController');

const runningProcesses = {};
const monitoringIntervals = {};

function parseDate(dateString) {
    // Format: MM/DD/YYYY
    const [month, day, year] = dateString.split('/');
    const formattedMonth = month.padStart(2, '0');
    const formattedDay = day.padStart(2, '0');
    return `${year}-${formattedMonth}-${formattedDay}`;
}

function parseTime(timeString) {
    // Format: HH.MM.SS
    const [hour, minute, second] = timeString.split('.');
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    const formattedSecond = second.padStart(2, '0');
    return `${formattedHour}:${formattedMinute}:${formattedSecond}`;
}

function parseTimestamp(timeString) {
    // Format: MM/DD/YYYY-HH.MM.SS
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

async function createDatabaseAndTable(connection) {
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS device_activity_report (
                id INT AUTO_INCREMENT PRIMARY KEY,
                root_variable INT DEFAULT NULL,
                report VARCHAR(255) DEFAULT NULL,
                \`system\` VARCHAR(255) DEFAULT NULL,
                \`timestamp\` DATETIME DEFAULT NULL,
                total_samples INT DEFAULT NULL,
                iodf_name_suffix VARCHAR(10) DEFAULT NULL,
                iodf_creation_date DATE DEFAULT NULL,
                iodf_creation_time TIME DEFAULT NULL,
                configuration_state VARCHAR(255) DEFAULT NULL,
                info JSON DEFAULT NULL,
                storage_groups JSON DEFAULT NULL,
                device_numbers JSON DEFAULT NULL,
                volume_serial_numbers JSON DEFAULT NULL,
                KEY \`idx_root_variable\` (root_variable),
                KEY \`idx_timestamp\` (\`timestamp\`)
            )
        `);

        console.log('Database and table setup completed');
    } catch (error) {
        console.error('Error in database/table creation:', error);
        throw error;
    }
}

async function insertData(connection, data, lpar) {
    try {
        const memory = await new Promise((resolve, reject) => {
            deviceJSONController.readLparData(lpar, (err, data) => {
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

            const daData = rootData['Direct Access Device Activity'];
            if (!daData) {
                console.log(`No Direct Access Device Activity data found for root variable ${rootVar}`);
                continue;
            }

            const totalSamples = parseInt(daData['Total Samples']) || null;
            const iodfNameSuffix = daData['IODF Name Suffix'] || null;
            const iodfCreationDate = daData['IODF Creation Date'] ? parseDate(daData['IODF Creation Date']) : null;
            const iodfCreationTime = daData['IODF Creation Time'] ? parseTime(daData['IODF Creation Time']) : null;
            const configurationState = daData['Configuration State'] || null;

            const infoData = daData['Info'] || [];
            const storageGroups = [];
            const deviceNumbers = [];
            const volumeSerialNumbers = [];

            for (const item of infoData) {
                if (item['Storage Group']) storageGroups.push(item['Storage Group']);
                if (item['Device Number']) deviceNumbers.push(item['Device Number']);
                if (item['Volume Serial Number']) volumeSerialNumbers.push(item['Volume Serial Number']);
            }

            const insertData = [
                parseInt(rootVar),
                rootData.Report || null,
                rootData.System || null,
                timestampStr,
                totalSamples,
                iodfNameSuffix,
                iodfCreationDate,
                iodfCreationTime,
                configurationState,
                JSON.stringify(replaceNulls(infoData)),
                JSON.stringify(storageGroups),
                JSON.stringify(deviceNumbers),
                JSON.stringify(volumeSerialNumbers)
            ];

            try {
                await connection.query(`
                    INSERT INTO device_activity_report (
                        root_variable, report, \`system\`, \`timestamp\`,
                        total_samples, iodf_name_suffix, iodf_creation_date,
                        iodf_creation_time, configuration_state, info,
                        storage_groups, device_numbers, volume_serial_numbers
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, insertData);

                newDataInserted = true;
            } catch (error) {
                console.error('Error inserting data:', error);
                throw error;
            }
        }

        if (newDataInserted) {
            // Update memory file with only distinct timestamps
            const updatedTimestamps = [...new Set([...processedTimestamps, ...distinctTimestamps])];
            await new Promise((resolve, reject) => {
                deviceJSONController.writeLparData(lpar, { 
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
    const url = `${config.zebra_httptype}://${config.appurl}:${config.appport}/v1/${lpar}/rmfpp/DEVICE?start=${startDate}&end=${endDate}`;

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

async function startDevice(req, res) {
    const { startDate, endDate, lpar, continuousMonitoring } = req.body;
    console.log(`startDevice called with params:`, { startDate, endDate, lpar, continuousMonitoring });

    if (runningProcesses[lpar] && runningProcesses[lpar].isRunning) {
        return res.status(400).json({ success: false, message: `Device process is already running for ${lpar}` });
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
        
        mysqlConnection = await mysql.createConnection({
            host: config.dds[lpar].hmai.mysql.host,
            user: config.dds[lpar].hmai.mysql.user,
            password: config.dds[lpar].hmai.mysql.password,
            multipleStatements: true
        });

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
            message: continuousMonitoring ? 'Device process started and running continuously' : 'Device process completed successfully',
            databaseCreated: databaseCreated
        });
    } catch (error) {
        console.error('Error in startDevice:', error);
        delete runningProcesses[lpar];
        res.status(500).json({ success: false, message: 'Error in Device process', error: error.message });
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

        await connection.query('TRUNCATE TABLE device_activity_report');

        await new Promise((resolve, reject) => {
            deviceJSONController.writeLparData(lpar, {}, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (runningProcesses[lpar]) {
            delete runningProcesses[lpar];
        }

        res.json({ success: true, message: `Database ${lpar} and Device memory cleared successfully` });
    } catch (error) {
        console.error('Error clearing database and Device memory:', error);
        res.json({ success: false, message: 'Failed to clear database and Device memory: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
}

function stopContinuousMonitoring(req, res) {
    const { lpar } = req.body;
    console.log(`Attempting to stop Device process for ${lpar}`);

    if (runningProcesses[lpar]) {
        if (monitoringIntervals[lpar]) {
            clearInterval(monitoringIntervals[lpar]);
            delete monitoringIntervals[lpar];
        }
        delete runningProcesses[lpar];
        res.json({ success: true, message: `Stopped Device process for ${lpar}` });
    } else {
        res.status(400).json({ success: false, message: `No active Device process for ${lpar}` });
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
    startDevice,
    clearDatabase,
    stopContinuousMonitoring,
    getRunningProcesses
}; 