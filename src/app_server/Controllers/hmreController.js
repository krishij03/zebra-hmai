const FTP = require('ftp');
const mysql = require('mysql2/promise');
const path = require('path');
try {
    var config = require("../../config/Zconfig.json");
} catch(e) {
    var config = {};
}
var hmreJSONcontroller = require('./hmreJSONController');
const stream = require('stream');
const monitoringIntervals = {};
const runningProcesses = {};

// Table headers mapping
const tableHeaders = {
    hmrecsvs: ['Timestamp', 'CurrentTime', 'BCM_Prefix', 'HMRE_ID', 'CTTime', 'CTDelta_Secs', 'MCU_TO_RCU_KBP', 'Pri_JNL_Meta', 'Pri_JNL_Data', 'Sec_JNL_Meta', 'Sec_JNL_Data'],
    hmrecsvd: ['Timestamp', 'CurrentTime', 'BCM_Prefix', 'HMRE_ID', 'CTDelta_Secs', 'MCU_TO_RCU_KBPS', 'CG_', 'CTDelta_Secs_CG1', 'MCU_TO_RCU_KBPS_CG1', 'Pri_JNL_Meta_CG1', 'Pri_JNL_Data_CG1', 'Sec_JNL_Meta_CG1', 'Sec_JNL_Data_CG1', 'CTDelta_Secs_CG2', 'MCU_TO_RCU_KBPS_CG2', 'Pri_JNL_Meta_CG2', 'Pri_JNL_Data_CG2', 'Sec_JNL_Meta_CG2', 'Sec_JNL_Data_CG2', 'CTDelta_Secs_CG3', 'MCU_TO_RCU_KBPS_CG3', 'Pri_JNL_Meta_CG3', 'Pri_JNL_Data_CG3', 'Sec_JNL_Meta_CG3', 'Sec_JNL_Data_CG3', 'CTDelta_Secs_CG4', 'MCU_TO_RCU_KBPS_CG4', 'Pri_JNL_Meta_CG4', 'Pri_JNL_Data_CG4', 'Sec_JNL_Meta_CG4', 'Sec_JNL_Data_CG4', 'CTDelta_Secs_CG5', 'MCU_TO_RCU_KBPS_CG5', 'Pri_JNL_Meta_CG5', 'Pri_JNL_Data_CG5', 'Sec_JNL_Meta_CG5', 'Sec_JNL_Data_CG5', 'CTDelta_Secs_CG6', 'MCU_TO_RCU_KBPS_CG6', 'Pri_JNL_Meta_CG6', 'Pri_JNL_Data_CG6', 'Sec_JNL_Meta_CG6', 'Sec_JNL_Data_CG6', 'CTDelta_Secs_CG7', 'MCU_TO_RCU_KBPS_CG7', 'Pri_JNL_Meta_CG7', 'Pri_JNL_Data_CG7', 'Sec_JNL_Meta_CG7', 'Sec_JNL_Data_CG7', 'CTDelta_Secs_CG8', 'MCU_TO_RCU_KBPS_CG8', 'Pri_JNL_Meta_CG8', 'Pri_JNL_Data_CG8', 'Sec_JNL_Meta_CG8', 'Sec_JNL_Data_CG8', 'CTDelta_Secs_CG9', 'MCU_TO_RCU_KBPS_CG9', 'Pri_JNL_Meta_CG9', 'Pri_JNL_Data_CG9', 'Sec_JNL_Meta_CG9', 'Sec_JNL_Data_CG9', 'CTDelta_Secs_CG10', 'MCU_TO_RCU_KBPS_CG10', 'Pri_JNL_Meta_CG10', 'Pri_JNL_Data_CG10', 'Sec_JNL_Meta_CG10', 'Sec_JNL_Data_CG10', 'CTDelta_Secs_CG11', 'MCU_TO_RCU_KBPS_CG11', 'Pri_JNL_Meta_CG11', 'Pri_JNL_Data_CG11', 'Sec_JNL_Meta_CG11', 'Sec_JNL_Data_CG11', 'CTDelta_Secs_CG12', 'MCU_TO_RCU_KBPS_CG12', 'Pri_JNL_Meta_CG12', 'Pri_JNL_Data_CG12', 'Sec_JNL_Meta_CG12', 'Sec_JNL_Data_CG12', 'CTDelta_Secs_CG13', 'MCU_TO_RCU_KBPS_CG13', 'Pri_JNL_Meta_CG13', 'Pri_JNL_Data_CG13', 'Sec_JNL_Meta_CG13', 'Sec_JNL_Data_CG13', 'CTDelta_Secs_CG14', 'MCU_TO_RCU_KBPS_CG14', 'Pri_JNL_Meta_CG14', 'Pri_JNL_Data_CG14', 'Sec_JNL_Meta_CG14', 'Sec_JNL_Data_CG14', 'CTDelta_Secs_CG15', 'MCU_TO_RCU_KBPS_CG15', 'Pri_JNL_Meta_CG15', 'Pri_JNL_Data_CG15', 'Sec_JNL_Meta_CG15', 'Sec_JNL_Data_CG15', 'CTDelta_Secs_CG16', 'MCU_TO_RCU_KBPS_CG16', 'Pri_JNL_Meta_CG16', 'Pri_JNL_Data_CG16', 'Sec_JNL_Meta_CG16', 'Sec_JNL_Data_CG16']
};

// Create table queries
const createTableQueries = [
    `CREATE TABLE IF NOT EXISTS hmrecsvs (
        id INT NOT NULL AUTO_INCREMENT,
        Timestamp DATETIME DEFAULT NULL,
        CurrentTime VARCHAR(100) DEFAULT NULL,
        BCM_Prefix VARCHAR(100) DEFAULT NULL,
        HMRE_ID VARCHAR(100) DEFAULT NULL,
        CTTime VARCHAR(100) DEFAULT NULL,
        CTDelta_Secs INT DEFAULT NULL,
        MCU_TO_RCU_KBP INT DEFAULT NULL,
        Pri_JNL_Meta INT DEFAULT NULL,
        Pri_JNL_Data INT DEFAULT NULL,
        Sec_JNL_Meta INT DEFAULT NULL,
        Sec_JNL_Data INT DEFAULT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
    `CREATE TABLE IF NOT EXISTS hmrecsvd (
        id INT NOT NULL AUTO_INCREMENT,
        Timestamp DATETIME DEFAULT NULL,
        CurrentTime VARCHAR(100) DEFAULT NULL,
        BCM_Prefix VARCHAR(100) DEFAULT NULL,
        HMRE_ID VARCHAR(100) DEFAULT NULL,
        CTDelta_Secs INT DEFAULT NULL,
        MCU_TO_RCU_KBPS INT DEFAULT NULL,
        CG_ INT DEFAULT NULL,
        /* ... rest of the columns ... */
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
];

function parseDirName(dirName) {
    const parts = dirName.split('_');
    if (parts.length >= 3 && parts[0].startsWith('D') && parts[0].length === 7 && parts[1].startsWith('T') && parts[1].length === 7) {
        const dateStr = parts[0].slice(1);
        const timeStr = parts[1].slice(1);
        const year = '20' + dateStr.slice(0, 2);
        const month = dateStr.slice(2, 4);
        const day = dateStr.slice(4, 6);
        const hour = timeStr.slice(0, 2);
        const minute = timeStr.slice(2, 4);
        const second = timeStr.slice(4, 6);
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    }
    return null;
}

function promisifyFtpCommand(ftpClient, command, ...args) {
    return new Promise((resolve, reject) => {
        ftpClient[command](...args, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

async function createTables(connection) {
    for (const query of createTableQueries) {
        await connection.query(query);
    }
}

async function loadDataFromFTPToMySQL(ftpClient, mysqlConnection, remotePath, tableName, columns) {
    return new Promise((resolve, reject) => {
        ftpClient.get(remotePath, async (err, readStream) => {
            if (err) {
                console.error(`Error getting file ${remotePath}:`, err);
                reject(err);
                return;
            }

            console.log(`Started processing file: ${remotePath}`);

            const passthroughStream = new stream.PassThrough();
            readStream.pipe(passthroughStream);

            const sql = `
                SET NAMES utf8mb4;
                SET CHARACTER SET utf8mb4;
                SET character_set_connection=utf8mb4;
                SET SESSION sql_mode = '';
                
                LOAD DATA LOCAL INFILE 'stdin' 
                INTO TABLE ${tableName}
                CHARACTER SET utf8mb4
                FIELDS TERMINATED BY ',' 
                OPTIONALLY ENCLOSED BY '"' 
                LINES TERMINATED BY '\\n' 
                IGNORE 1 LINES
                (${columns.join(', ')})
            `;

            try {
                await mysqlConnection.query("SET NAMES utf8mb4");
                const [result] = await mysqlConnection.query({
                    sql: sql,
                    infileStreamFactory: () => passthroughStream
                });
                
                const [rows] = await mysqlConnection.query(`SELECT ROW_COUNT() as count`);
                const affectedRows = rows[0].count;
                
                console.log(`Data loaded into ${tableName}: ${affectedRows} rows affected`);
                resolve(result);
            } catch (error) {
                console.error(`Error loading data into ${tableName}:`, error);
                reject(error);
            }
        });
    });
}

async function processDirectory(ftpClient, mysqlConnection, dirPath, lpar, metrics) {
    console.log(`Processing directory: ${dirPath}`);
    
    try {
        await promisifyFtpCommand(ftpClient, 'cwd', dirPath);
        const files = await promisifyFtpCommand(ftpClient, 'list');

        for (const file of files) {
            if (file.type === '-' && (file.name === 'hmrecsvs.csv' || file.name === 'hmrecsvd.csv')) {
                const tableName = file.name.split('.')[0];
                if (metrics.includes(tableName)) {
                    try {
                        await loadDataFromFTPToMySQL(
                            ftpClient,
                            mysqlConnection,
                            file.name,
                            tableName,
                            tableHeaders[tableName]
                        );
                    } catch (error) {
                        console.error(`Error processing ${file.name}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dirPath}:`, error);
    }
}

async function checkForNewFiles(ftpClient, mysqlConnection, startDate, endDate, lpar, metrics) {
    console.log(`Checking for new files for ${lpar} from ${startDate} to ${endDate || 'now'}`);
    
    try {
        const visitedDirs = await new Promise((resolve, reject) => {
            hmreJSONcontroller.readLparData(lpar, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        
        await promisifyFtpCommand(ftpClient, 'cwd', config.dds[lpar].hmre.ftp.directory);
        const list = await promisifyFtpCommand(ftpClient, 'list');

        const startDateTime = new Date(startDate);
        const endDateTime = endDate ? new Date(endDate) : new Date();

        const newDirs = list.filter(function(item) {
            if (item.type !== 'd') return false;
            const dirDate = parseDirName(item.name);
            if (!dirDate) return false;
            const isNewDir = !visitedDirs[item.name];
            return isNewDir && dirDate >= startDateTime && dirDate <= endDateTime;
        });

        console.log(`Found ${newDirs.length} new directories to process for ${lpar}`);

        for (const dir of newDirs) {
            const fullPath = path.join(config.dds[lpar].hmre.ftp.directory, dir.name);
            try {
                await processDirectory(ftpClient, mysqlConnection, fullPath, lpar, metrics);
                const dirDate = parseDirName(dir.name);
                const updateData = { [dir.name]: dirDate.toISOString() };
                await new Promise((resolve, reject) => {
                    hmreJSONcontroller.updateLparData(lpar, updateData, (updateErr, updatedData) => {
                        if (updateErr) reject(updateErr);
                        else {
                            console.log('Processed and updated ' + lpar + '.json with ' + dir.name);
                            resolve(updatedData);
                        }
                    });
                });
            } catch (error) {
                console.error('Error processing directory ' + dir.name + ' for ' + lpar + ':', error);
            }
        }
       
        console.log(`Finished processing ${newDirs.length} new directories for ${lpar}`);
        return newDirs.length;
    } catch (error) {
        console.error('Error in checkForNewFiles:', error);
        throw error;
    }
}

async function startHMRE(req, res) {
    const { startDate, endDate, lpar, metrics, continuousMonitoring } = req.body;
    console.log(`startHMRE called with params:`, { startDate, endDate, lpar, metrics, continuousMonitoring });

    if (runningProcesses[lpar] && runningProcesses[lpar].isRunning) {
        return res.status(400).json({ success: false, message: `HMRE process is already running for ${lpar}` });
    }

    runningProcesses[lpar] = { 
        isRunning: true, 
        continuousMonitoring: continuousMonitoring,
        startDate: startDate,
        endDate: continuousMonitoring ? null : endDate
    };

    let mysqlConnection;
    let ftpClient;
    let databaseCreated = false;

    try {
        mysqlConnection = await mysql.createConnection({
            host: config.dds[lpar].hmre.mysql.host,
            user: config.dds[lpar].hmre.mysql.user,
            password: config.dds[lpar].hmre.mysql.password,
            multipleStatements: true
        });

        const [rows] = await mysqlConnection.query(`SHOW DATABASES LIKE '${lpar}'`);
        if (rows.length === 0) {
            await mysqlConnection.query(`CREATE DATABASE ${lpar}`);
            databaseCreated = true;
        }

        await mysqlConnection.query(`USE ${lpar}`);

        if (databaseCreated) {
            await createTables(mysqlConnection);
        }

        ftpClient = new FTP();
        await new Promise((resolve, reject) => {
            ftpClient.on('ready', resolve);
            ftpClient.on('error', reject);
            ftpClient.connect({
                host: config.dds[lpar].ddsbaseurl,
                user: config.dds[lpar].ddsuser,
                password: config.dds[lpar].ddspwd,
            });
        });

        if (continuousMonitoring) {
            await checkForNewFiles(ftpClient, mysqlConnection, startDate, null, lpar, metrics);
            startContinuousMonitoring(lpar, metrics);
        } else {
            await checkForNewFiles(ftpClient, mysqlConnection, startDate, endDate, lpar, metrics);
            runningProcesses[lpar].isRunning = false;
        }

        res.json({ 
            success: true, 
            message: continuousMonitoring ? 'HMRE process started and running continuously' : 'HMRE process completed successfully',
            databaseCreated: databaseCreated
        });
    } catch (error) {
        console.error('Error in startHMRE:', error);
        delete runningProcesses[lpar];
        res.status(500).json({ success: false, message: 'Error in HMRE process', error: error.message });
    } finally {
        if (!continuousMonitoring) {
            if (mysqlConnection) await mysqlConnection.end();
            if (ftpClient && ftpClient.connected) ftpClient.end();
        }
    }
}

function startContinuousMonitoring(lpar, metrics) {
    const checkInterval = parseInt(config.dds[lpar].hmre.checkInterval);

    monitoringIntervals[lpar] = setInterval(async () => {
        let mysqlConnection;
        let ftpClient;

        try {
            mysqlConnection = await mysql.createConnection({
                host: config.dds[lpar].hmre.mysql.host,
                user: config.dds[lpar].hmre.mysql.user,
                password: config.dds[lpar].hmre.mysql.password,
                database: lpar,
                multipleStatements: true
            });

            ftpClient = new FTP();
            await new Promise((resolve, reject) => {
                ftpClient.on('ready', resolve);
                ftpClient.on('error', reject);
                ftpClient.connect({
                    host: config.dds[lpar].ddsbaseurl,
                    user: config.dds[lpar].ddsuser,
                    password: config.dds[lpar].ddspwd,
                });
            });

            const visitedDirs = await new Promise((resolve, reject) => {
                hmreJSONcontroller.readLparData(lpar, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            const lastProcessedDate = Object.keys(visitedDirs).length > 0
                ? new Date(Math.max(...Object.values(visitedDirs).map(d => new Date(d))))
                : runningProcesses[lpar].startDate;

            await checkForNewFiles(ftpClient, mysqlConnection, lastProcessedDate, null, lpar, metrics);

        } catch (error) {
            console.error(`Error in continuous monitoring for ${lpar}:`, error);
        } finally {
            if (mysqlConnection) await mysqlConnection.end();
            if (ftpClient) ftpClient.end();
        }
    }, checkInterval * 60000);
}

async function clearDatabase(req, res) {
    const { lpar } = req.body;
    const mysqlConfig = {
        ...config.dds[lpar].hmre.mysql,
        database: lpar,
    };

    let connection;
    try {
        connection = await mysql.createConnection(mysqlConfig);

        const tables = ['hmrecsvs', 'hmrecsvd'];
        for (const table of tables) {
            await connection.query(`TRUNCATE TABLE ${table}`);
        }

        await new Promise((resolve, reject) => {
            hmreJSONcontroller.writeLparData(lpar, {}, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (runningProcesses[lpar]) {
            delete runningProcesses[lpar];
        }

        res.json({ success: true, message: `All tables in database ${lpar} and HMRE memory cleared successfully` });
    } catch (error) {
        console.error('Error clearing database and HMRE memory:', error);
        res.json({ success: false, message: 'Failed to clear database and HMRE memory: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
}

function stopContinuousMonitoring(req, res) {
    const { lpar } = req.body;
    console.log(`Attempting to stop HMRE process for ${lpar}`);

    if (runningProcesses[lpar]) {
        if (monitoringIntervals[lpar]) {
            clearInterval(monitoringIntervals[lpar]);
            delete monitoringIntervals[lpar];
        }

        if (runningProcesses[lpar].mysqlConnection) {
            runningProcesses[lpar].mysqlConnection.end();
        }

        if (runningProcesses[lpar].ftpClient) {
            runningProcesses[lpar].ftpClient.end();
        }

        delete runningProcesses[lpar];
        res.json({ success: true, message: `Stopped HMRE process for ${lpar}` });
    } else {
        res.status(400).json({ success: false, message: `No active HMRE process for ${lpar}` });
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
    startHMRE,
    clearDatabase,
    stopContinuousMonitoring,
    getRunningProcesses
}; 