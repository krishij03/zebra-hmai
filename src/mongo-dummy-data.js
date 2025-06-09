const mongoose = require('mongoose');
const cpcdoc = require('./app_server/Models/cpcdocSchema').cpcdocs;
const procdoc = require('./app_server/Models/procdocSchema').procdocs;
const usagedoc = require('./app_server/Models/usagedocSchema').usagedocs;
const workloaddoc = require('./app_server/Models/workloaddocSchema').wokloaddocs;

// Configuration
const config = {
    mongoUrl: 'mongodb://localhost:27017/zebraDB',
    daysOfData: 7,
    samplesPerDay: 24,
    lpars: ['RPRT', 'QCK2', 'TRNG', 'VIDVLP', 'VIRPT']
};

mongoose.connect(config.mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
    generateData();
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Helper function to generate random value between min and max
function randomBetween(min, max, decimals = 2) {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
}

// Helper function to generate random utilization value
function generateUtilization() {
    return randomBetween(5, 95, 1);
}

// Helper to generate timestamps for the specified period
function generateTimestamps() {
    const timestamps = [];
    const endDate = new Date();

    for (let day = 0; day < config.daysOfData; day++) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - day);

        for (let hour = 0; hour < config.samplesPerDay; hour++) {
            const timestamp = new Date(date);
            timestamp.setHours(Math.floor(24 / config.samplesPerDay * hour));
            timestamp.setMinutes(0);
            timestamp.setSeconds(0);
            timestamps.push(timestamp);
        }
    }

    return timestamps.sort((a, b) => a - b); // Sort chronologically
}

// Generating the CPC data
function generateCPCData(lpar, timestamp) {
    const utilization = generateUtilization();

    return {
        lparname: lpar,
        title: "CPC Activity",
        datetime: timestamp,
        caption: {
            "CPCCRCAT": "Physical Capacity: 4",
            "CPCLPCAT": "Logical Cores: 8",
            "CPCACP": "Average CP Utilization"
        },
        lpar: [
            {
                "CPCPPNAM": lpar,
                "CPCPPTOU": utilization.toString(),
                "CPCPPWGT": randomBetween(80, 120).toString(),
                "CPCPEFU": randomBetween(utilization * 0.8, utilization * 1.1, 1).toString(),
                "CPCPMSU": randomBetween(10, 50, 1).toString(),
                "CPCPCSMB": randomBetween(4096, 16384, 0).toString()
            }
        ]
    };
}

// Generating PROC data
function generatePROCData(lpar, timestamp) {
    return {
        lparname: lpar,
        title: "Processor Delay",
        datetime: timestamp,
        lpar_proc: generateProcesses(lpar, 10)
    };
}

// Generating random processes
function generateProcesses(lpar, count) {
    const processes = [];
    const processNames = ['CICS', 'DB2', 'IMS', 'JES2', 'RACF', 'VTAM', 'TSO', 'CATALOG', 'TCPIP', 'ZFS', 'OMVS', 'WLM'];

    for (let i = 0; i < count; i++) {
        processes.push({
            "PRCPJOB": processNames[Math.floor(Math.random() * processNames.length)] + (i + 1),
            "PRCPSID": lpar,
            "PRCPPSVC": randomBetween(0, 2).toFixed(2),
            "PRCPPCPU": randomBetween(0, 95, 1).toString(),
            "PRCPPCLA": randomBetween(0, 5, 1).toString(),
            "PRCPPSIO": randomBetween(0, 10, 1).toString(),
            "PRCPPHIO": randomBetween(0, 8, 1).toString(),
            "PRCPPMES": randomBetween(0, 3, 1).toString()
        });
    }

    return processes;
}

// Generating USAGE data
function generateUSAGEData(lpar, timestamp) {
    return {
        lparname: lpar,
        title: "System Usage",
        datetime: timestamp,
        lpar_usage: generateUsageEntries(lpar, 15)
    };
}

// Generating random usage entries
function generateUsageEntries(lpar, count) {
    const entries = [];
    const jobNames = ['CICSREG', 'DB2MSTR', 'IMSCTL', 'JES2', 'RACFDS', 'VTAMCSS', 'TSOUSR', 'CATALOG', 'TCPIP', 'ZFS', 'OMVS', 'WLM'];

    for (let i = 0; i < count; i++) {
        entries.push({
            "JUSPJOB": jobNames[Math.floor(Math.random() * jobNames.length)] + (i + 1),
            "JUSPSID": lpar,
            "JUSPCPUS": randomBetween(0, 100, 2).toString(),
            "JUSPCPUD": randomBetween(0, 60, 2).toString(),
            "JUSPRSYS": randomBetween(100, 500, 0).toString(),
            "JUSPRSEC": randomBetween(10, 200, 0).toString(),
            "JUSPEXCP": randomBetween(1000, 10000, 0).toString()
        });
    }

    return entries;
}

// Generating Workload data
function generateWorkloadData(lpar, timestamp) {
    // Create SYSINFO and SYSSUM data that can be joined
    const sysinfo = generateSYSINFOData(lpar, 8);
    const syssum = generateSYSSUMData(lpar, 8);

    return {
        lparname: lpar,
        title: "Workload Activity",
        datetime: timestamp,
        Caption: {
            "SYSAUPVC": "Using processor utilization %",
            "SYSRSPM": "Resource group PEs used / 1000",
            "SYSADUVC": "Using delay utilization %"
        },
        Class: joinWorkloadData(sysinfo, syssum)
    };
}

// Generating SYSINFO data
function generateSYSINFOData(lpar, count) {
    const entries = [];
    const serviceClasses = ['STCHIGH', 'STCMED', 'STCLOW', 'TSOHIGH', 'TSOMED', 'TSOLOW', 'BATCHHI', 'BATCHLO'];

    for (let i = 0; i < count; i++) {
        entries.push({
            "SYSNAMVC": serviceClasses[i % serviceClasses.length],
            "SYSTYPVC": "Service class",
            "SYSWFLVC": randomBetween(1, 99, 0).toString(),
            "SYSTUSVC": randomBetween(5, 95, 1).toString(),
            "SYSAUSVC": randomBetween(5, 95, 1).toString(),
            "SYSTRSVC": randomBetween(1, 50, 1).toString(),
            "SYSAFCVC": randomBetween(0, 20, 1).toString(),
            "SYSRSPM": randomBetween(100, 900, 0).toString(),
            "SYSDDSIN": i.toString(),
            "SYSDDSIT": "STC",
            "SYSDDSIP": lpar
        });
    }

    return entries;
}

// Generating SYSSUM data
function generateSYSSUMData(lpar, count) {
    const entries = [];

    for (let i = 0; i < count; i++) {
        entries.push({
            "SUMGRP": "SYSSTC",
            "SUMTYP": "Service Class",
            "SUMRCTNT": randomBetween(100, 900, 0).toString(),
            "SUMIMP": randomBetween(1, 5, 0).toString(),
            "SUMEVG": randomBetween(80, 100, 0).toString(),
            "SUMEVA": randomBetween(80, 100, 0).toString(),
            "SUMDDSIN": i.toString(),
            "SUMDDSIT": "STC",
            "SUMDDSIP": lpar,
            "SUMARTW": randomBetween(0.1, 2, 2).toString(),
            "SUMARTA": randomBetween(0.1, 2, 2).toString(),
            "SUMARTT": randomBetween(0.1, 2, 2).toString(),
            "SUMARTQ": randomBetween(0.1, 1, 2).toString(),
            "SUMARTR": randomBetween(0.1, 1, 2).toString()
        });
    }

    return entries;
}

// Join SYSINFO and SYSSUM data
function joinWorkloadData(sysinfo, syssum) {
    let joinedData = [];

    for (let i = 0; i < sysinfo.length; i++) {
        let found = false;
        for (let j = 0; j < syssum.length; j++) {
            if (sysinfo[i]["SYSDDSIN"] === syssum[j]["SUMDDSIN"] &&
                sysinfo[i]["SYSDDSIT"] === syssum[j]["SUMDDSIT"] &&
                sysinfo[i]["SYSDDSIP"] === syssum[j]["SUMDDSIP"]) {
                found = true;
                joinedData.push({
                    ...sysinfo[i],
                    ...syssum[j]
                });
                break;
            }
        }

        if (!found) {
            joinedData.push({
                ...sysinfo[i],
                SUMGRP: "",
                SUMTYP: "",
                SUMRCTNT: "",
                SUMIMP: "",
            });
        }
    }

    return joinedData;
}

// Generating and save all data
async function generateData() {
    try {
        const timestamps = generateTimestamps();
        console.log(`Generating data for ${config.lpars.length} LPARs over ${config.daysOfData} days (${timestamps.length} timestamps per LPAR)`);

        // Clearing existing data before inserting new ones
        console.log('Clearing existing data...');
        await cpcdoc.deleteMany({});
        await procdoc.deleteMany({});
        await usagedoc.deleteMany({});
        await workloaddoc.deleteMany({});

        let totalDocuments = 0;

        for (const lpar of config.lpars) {
            console.log(`Generating data for LPAR: ${lpar}`);
            let lparDocuments = 0;

            for (const timestamp of timestamps) {
                const cpcData = generateCPCData(lpar, timestamp);
                await new cpcdoc(cpcData).save();

                const procData = generatePROCData(lpar, timestamp);
                await new procdoc(procData).save();

                const usageData = generateUSAGEData(lpar, timestamp);
                await new usagedoc(usageData).save();

                const workloadData = generateWorkloadData(lpar, timestamp);
                await new workloaddoc(workloadData).save();

                lparDocuments += 4; // 4 documents per timestamp

                if (lparDocuments % 100 === 0) {
                    console.log(`  Generated ${lparDocuments} documents for ${lpar}...`);
                }
            }

            totalDocuments += lparDocuments;
            console.log(`  Completed ${lparDocuments} documents for ${lpar}`);
        }

        console.log(`Data generation complete! Generated ${totalDocuments} total documents.`);
        mongoose.disconnect();

    } catch (error) {
        console.error('Error generating data:', error);
        mongoose.disconnect();
    }
}