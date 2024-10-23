const axios = require('axios');
const mysql = require('mysql2/promise');
const RMFPPparser = require('../parser/RMFPPparser');
const path = require('path');
const fs = require('fs');

function loadZconfig() {
  const configPath = path.join(__dirname, '..', '..', 'config', 'Zconfig.json');
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error("Error loading Zconfig:", error);
    return {};
  }
}

const ddsconfig = loadZconfig();

const apiml_http_type = ddsconfig.apiml_http_type;
const apiml_IP = ddsconfig.apiml_IP;
const apiml_port = ddsconfig.apiml_port;
const username = ddsconfig.apiml_username;
const password = ddsconfig.apiml_password;
const apiml_auth = ddsconfig.apiml_auth_type;

function RMFPPgetRequest(ddshttp, baseurl, baseport, rmfppfilename, urlReport, urlDate, ddsid, ddspass, ddsauth, fn) {
  var RMFPPURL = `${ddshttp}://${baseurl}:${baseport}/gpm/${rmfppfilename}?reports=${urlReport}&date=${urlDate}`;
  if(ddsauth === 'true'){
    axios.get(RMFPPURL, {
      auth: {
        username: ddsid,
        password: ddspass
      }
    })
    .then(function (response) {
      fn(response.data);
    })
    .catch(function (error) {
      try{
        if(parseInt(error.response.status) === 401){
          fn("UA");
        }else{
          fn(error["errno"]);
        }
      }catch(e){
        fn(error["errno"]);
      }
    });
  }else{
    axios.get(RMFPPURL)
    .then(function (response) {
      fn(response.data);
    })
    .catch(function (error) {
      try{
        if(parseInt(error.response.status) === 401){
          fn("UA");
        }else{
          fn(error["errno"]);
        }
      }catch(e){
        fn(error["errno"]);
      }
    });
  }
}

async function getAPIMLCookie(req, fn){
  if (req.cookies.apimlAuthenticationToken == undefined){
    fn("No Cookie");
  }else{
    fn(req.cookies.apimlAuthenticationToken);
  }
}

async function apimllogin(user, pass, fn){
  axios.post(`${apiml_http_type}://${apiml_IP}:${apiml_port}/api/v1/gateway/auth/login`, {
    "username": user,
    "password": pass
  })
  .then(function (response) {
    if(response.headers["set-cookie"]){
      var res_head = response.headers["set-cookie"][0].split("=");
      var token_split = res_head[1].split(";");
      var token = token_split[0];
      fn(token);
    }else{
      fn("error");
    }
  })
  .catch(function (error) {
    fn("error");
  });
}

async function apimlverification(req, fn){
  if(apiml_auth.toUpperCase() === "ZOWEJWT"){
    await getAPIMLCookie(req, async function(result){
      if(result.toUpperCase() != "NO COOKIE"){
        fn("OK")
      }else{
        await apimllogin(username, password, function(result){
          if(result.toUpperCase() === "ERROR"){
            fn("LOGIN FAILED")
          }else{
            fn("OK")
          }
        });
      }
    })
  }else if(apiml_auth.toUpperCase() === "BYPASS"){
    fn("OK")
  }
}

function parseTimestamp(timeString) {
  const [datePart, timePart] = timeString.split('-');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split('.');
  return new Date(year, month - 1, day, hour, minute, second);
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

async function createDatabaseAndTable(connection, lpar) {
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${lpar}`);
    await connection.query(`USE ${lpar}`);
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
    
    // Create indexes without 'IF NOT EXISTS' (MySQL doesn't support this for indexes)
    const indexQueries = [
      'CREATE INDEX idx_cache_timestamp_ssid ON cache_subsystem_activity (`timestamp`, ssid)',
      'CREATE INDEX idx_cache_root_variable ON cache_subsystem_activity (root_variable)',
      'CREATE INDEX idx_subsystem_id ON cache_subsystem_activity (subsystem_id)'
    ];

    for (const query of indexQueries) {
      try {
        await connection.query(query);
      } catch (error) {
        // If the index already exists, it will throw an error. We can ignore this.
        if (error.code !== 'ER_DUP_KEYNAME') {
          throw error;
        }
      }
    }

    console.log(`Database and table created/checked for ${lpar}`);
  } catch (error) {
    console.error('Error creating database and table:', error);
    throw error;
  }
}

async function insertData(connection, data) {
  console.log("Starting insertData function");
  try {
    for (const [rootVar, rootData] of Object.entries(data)) {
      console.log(`Processing rootVar: ${rootVar}`);
      for (const [ssidKey, ssidData] of Object.entries(rootData)) {
        if (ssidKey.startsWith('Cache Subsystem Activity for SSID')) {
          console.log(`Processing SSID: ${ssidKey}`);
          const ssid = parseInt(ssidKey.split(' ').pop());
          
          const timestamp = parseTimestamp(rootData.Timestamp);
          const cacheIntervalStart = parseTimestamp(rootData['Cache Interval'].Start);
          
          const [minutes, seconds] = rootData['Cache Interval']['Interval (mm.ss)'].split('.');
          const cacheIntervalDuration = `${minutes || 0}:${seconds || 0}:00`;

          console.log("Preparing data for INSERT query...");
          const insertData = [
            parseInt(rootVar),
            rootData.Report,
            rootData.System,
            timestamp,
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

          console.log("Executing INSERT query...");
          await connection.query(`
            INSERT INTO cache_subsystem_activity (
              root_variable, report, \`system\`, timestamp, cache_interval_start, cache_interval_duration,
              ssid, storage_subsystem_descriptor, subsystem_storage_and_status, cache_subsystem_overview,
              miscellaneous_cache_activities, host_adapter_activity, disk_activity, cache_subsystem_device_overview
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, insertData);
          console.log("INSERT query executed successfully");
        }
      }
    }
  } catch (error) {
    console.error("Error in insertData function:", error);
    throw error;
  }
  console.log("insertData function completed");
}

async function RMFIJSON(req, res, status) {
  if (status !== "OK") {
    console.log("API ML Login failed");
    return res.json("Login to API ML Failed");
  }

  const lpar = ddsconfig["dds"][req.params.lpar];
  const urlReport = (req.params.report).toUpperCase();
  let urlDate;

  if (req.query.start && req.query.end) {
    let [year, month, day] = req.query.start.split('-');
    urlDate = `${year}${month}${day}`;
    [year, month, day] = req.query.end.split('-');
    urlDate = urlDate.concat(`,${year}${month}${day}`);
  } else {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    urlDate = `${year}${month}${day},${year}${month}${day}`;
  }

  RMFPPgetRequest(lpar["ddshhttptype"], lpar["ddsbaseurl"], lpar["ddsbaseport"], lpar["rmfppfilename"], urlReport, urlDate, lpar["ddsuser"], lpar["ddspwd"], lpar["ddsauth"], async function (data) {
    if (data === "DE" || data === "NE" || data === "UA" || data === "EOUT") { 
      console.log("Error received from RMFPPgetRequest:", data);
      return res.json({ error: data });
    }

    console.log("Parsing data with RMFPPparser...");
    RMFPPparser.parse(data, async function (result) {
      if (result["msg"]) {
        console.log("Error in parsing:", result["msg"]);
        return res.json({ error: result["data"] });
      }

      const mysqlConfig = lpar.hmai && lpar.hmai.mysql;
      if (mysqlConfig && !req.query.populateDB) {
        // If MySQL is configured and we haven't decided about populating yet
        return res.json({ 
          promptUser: true, 
          message: "MySQL is configured. Do you want to populate the database?",
          data: result
        });
      }

      if (mysqlConfig && req.query.populateDB === 'true') {
        let connection;
        try {
          connection = await mysql.createConnection(mysqlConfig);
          await createDatabaseAndTable(connection, req.params.lpar);
          await connection.beginTransaction();
          await insertData(connection, result);
          await connection.commit();
          console.log("Data successfully inserted into the database");
          res.json({ success: true, message: "Data successfully inserted into the database", data: result });
        } catch (error) {
          console.error("Error during database operation:", error);
          if (connection) {
            await connection.rollback();
          }
          res.json({ error: "Database operation failed", details: error.message, data: result });
        } finally {
          if (connection) {
            await connection.end();
          }
        }
      } else {
        // Always return the result data
        res.json(result);
      }
    });
  });
}

module.exports.rmfpp = async function (req, res) {
  if (!req.params.lpar) {
    return res.status(400).json({ error: "LPAR parameter is required" });
  }

  if (req.params.apiml) {
    await apimlverification(req, function(result) {
      RMFIJSON(req, res, result);
    });
  } else {
    RMFIJSON(req, res, "OK");
  }
};
