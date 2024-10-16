const axios = require('axios');
const { Pool } = require('pg');
const https = require('https');
var RMFPPparser = require('../parser/RMFPPparser') //importing the RMFMonitor3parser file
try{
  var ddsconfig = require("../../config/Zconfig.json");
}catch(e){
  var ddsconfig = {}
}
var apiml_http_type = ddsconfig.apiml_http_type;
var apiml_IP = ddsconfig.apiml_IP;
var apiml_port = ddsconfig.apiml_port;
var username = ddsconfig.apiml_username;
var password = ddsconfig.apiml_password;
var apiml_auth = ddsconfig.apiml_auth_type;

const pool = new Pool({
  user: 'root',
  host: 'localhost',
  database: 'test',
  password: '',
  port: 5432,
});

/**
 * RMFPPgetRequest is the Function for Sending GET Request to RMF Monitor I (Post-Processor Report).
 * @param {string} baseurl - The the IP address or the symbolic name of the DDS server, obtained from Zconfig file. 
 * @param {string} baseport - The port of the DDS server, obtained from Zconfig file.
 * @param {string} rmfppfilename - The filename of the XML document you want to retrieve, followed by the extension .xml (rmfm3.xml), obtained from Zconfig file. 
 * @param {string} urlReport - Monitor I report name, obtained from URL User Input.
 * @param {string} urlDate - Monitor I report start and end date(e.g 20200615,20200620), obtained from URL User Input.
 * @param {XML} fn - Callback function which returns an XML containing data from Monitor III.
 */ 
 function RMFPPgetRequest(ddshttp, baseurl, baseport, rmfppfilename, urlReport, urlDate, ddsid, ddspass, ddsauth, fn) { //fn is to return value from callback
    //Use backtick for URL string formatting
    var RMFPPURL = `${ddshttp}://${baseurl}:${baseport}/gpm/${rmfppfilename}?reports=${urlReport}&date=${urlDate}`; //Dynamically create URL
    if(ddsauth === 'true'){
      axios.get(RMFPPURL, {
        auth: {
          username: ddsid,
          password: ddspass
        }
      })
      .then(function (response) {
        // handle success
        fn(response.data);
      })
      .catch(function (error) {
        // handle error
        //console.log(error)
        try{
          if(parseInt(error.response.status) === 401){
            fn("UA");
          }else{
            fn(error["errno"]);
          }
        }catch(e){
          fn(error["errno"]);
        }
      })
      .then(function () {
        // always executed
      });
    }else{
      axios.get(RMFPPURL)
      .then(function (response) {
        // handle success
        fn(response.data);
      })
      .catch(function (error) {
        // handle error
        //console.log(error)
        try{
          if(parseInt(error.response.status) === 401){
            fn("UA");
          }else{
            fn(error["errno"]);
          }
        }catch(e){
          fn(error["errno"]);
        }
      })
      .then(function () {
        // always executed
      });
    }
};

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
        //continue
        fn("OK") // User logged into API ML evident by presence of apiauthenticationtoken cookie
      }else{ // Login User
        await apimllogin(username, password, function(result){
          if(result.toUpperCase() === "ERROR"){
            //end this
            fn("LOGIN FAILED")
            //console.log(`status ${status}`)
          }else{
            //flow continues
            fn("OK") // User loggin into API ML Successful
          }
        });
      }
    })
  }else if(apiml_auth.toUpperCase() === "BYPASS"){
    fn("OK") // Bypass API ML Authentication 
  }
}

function parseTimestamp(timeString) {
  const [datePart, timePart]= timeString.split('-');
  const [month, day, year]= datePart.split('/');
  const [hour, minute, second] =timePart.split('.');
  return new Date(year, month - 1, day, hour, minute, second);
}

//replace the existing replaceNulls function with this 
function replaceNulls(obj) {
  if (obj===null|| obj=== undefined|| obj ==="") {
    return 0;
  } else if (Array.isArray(obj)) {
    return obj.map(replaceNulls);
  } else if (typeof obj ==='object') {
    const result ={};
    for (const [key, value] of Object.entries(obj)) {
      result[key]= replaceNulls(value);
    }
    return result;
  }
  return obj;
}

async function insertData(client,data) {
  console.log("Starting insertData function");
  console.log("Data received:",typeof data, Object.keys(data));
  try {
    for (const [rootVar, rootData] of Object.entries(data)) {
      console.log(`Processing rootVar: ${rootVar}`);
      for (const [ssidKey, ssidData] of Object.entries(rootData)) {
        if (ssidKey.startsWith('Cache Subsystem Activity for SSID')) {
          console.log(`Processing SSID: ${ssidKey}`);
          const ssid = parseInt(ssidKey.split(' ').pop());
          
          //parsing timestamps
          const timestamp =parseTimestamp(rootData.Timestamp);
          const cacheIntervalStart = parseTimestamp(rootData['Cache Interval'].Start);
          
          //parsing interval duration
          const [minutes, seconds] =rootData['Cache Interval']['Interval (mm.ss)'].split('.');
          const cacheIntervalDuration= `${minutes || 0} minutes ${seconds || 0} seconds`;

          console.log("Preparing data for INSERT query...");
          const insertData =[
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
          console.log("Data prepared:", insertData);

          console.log("Executing INSERT query...");
          await client.query(`
            INSERT INTO cache_subsystem_activity (
              root_variable, report, system, timestamp, cache_interval_start, cache_interval_duration,
              ssid, storage_subsystem_descriptor, subsystem_storage_and_status, cache_subsystem_overview,
              miscellaneous_cache_activities, host_adapter_activity, disk_activity, cache_subsystem_device_overview
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, insertData);
          console.log("INSERT query executed successfully");
        }
      }
    }
  } catch (error) {
    console.error("Error in insertData function:",error);
    throw error;
  }
  console.log("insertData function completed");
}

async function RMFIJSON(req, res, status){
  switch(status){
    case "OK" :
      var lpar = ddsconfig["dds"][req.params.lpar];
      var urlReportNumber, urlSvcCls, urlWlkd, urlTime, urlDuration, timestart, timeend;
      var urlReport = (req.params.report).toUpperCase(); //variable for report parameter in the User Specified URL
      //variable for date parameter in the User Specified URL
      if (req.query.start && req.query.end) {
        // convert to DDS format
        let date, year, month, day;
        [year, month, day] = req.query.start.split('-');
        date = `${year}${month}${day}`;
        [year, month, day] = req.query.end.split('-');
        date = date.concat(`,${year}${month}${day}`);
        urlDate = date.toUpperCase();
      } else {
        // use current date as range if none provided
        let date, year, month, day;
        date = new Date();
        month = '' + (date.getMonth() + 1);
        day = '' + date.getDate();
        year = date.getFullYear();
        if (month.length < 2)
          month = '0' + month;
        if (day.length < 2)
          day = '0' + day; 
        urlDate = `${year}${month}${day},${year}${month}${day}`;
      }
      if (req.query.reportnumber) {
          urlReportNumber = (req.query.reportnumber).toUpperCase(); //variable for reportnumber parameter in the User Specified URL
      }
      if (req.query.SvcCls) {
          urlSvcCls = (req.query.SvcCls).toUpperCase(); //variable for reportnumber parameter in the User Specified URL
      }
      if (req.query.Wlkd) {
          urlWlkd = (req.query.Wlkd).toUpperCase(); //variable for reportnumber parameter in the User Specified URL
      }
      if (req.query.Time) {
          urlTime = (req.query.Time).toUpperCase(); //variable for reportnumber parameter in the User Specified URL
      }
      if (req.query.duration) {
          urlDuration = (req.query.duration).toUpperCase(); //variable for reportnumber parameter in the User Specified URL
          var cduration = urlDuration.split(","); //Split the user specified duration into timestart and timeend
          timestart = cduration[0]; //timestart from user specified duration
          timeend = cduration[1]; //timeend from user specified duration  
      }
      //if (urlReport.length >= 3 && urlReport.slice(0,3) === "CPU") { //if user specified CPU as report name
        RMFPPgetRequest(lpar["ddshhttptype"], lpar["ddsbaseurl"], lpar["ddsbaseport"], lpar["rmfppfilename"], urlReport, urlDate, lpar["ddsuser"], lpar["ddspwd"], lpar["ddsauth"], async function (data) { //A call to the getRequestpp function made with a callback function as parameter
            console.log("RMFPPgetRequest completed. Data received:", typeof data, data.length);
            if (data === "DE" || data === "NE" || data === "UA" || data === "EOUT") { 
              console.log("Error received from RMFPPgetRequest:", data);
              var string = encodeURIComponent(`${data}`);
              res.redirect('/rmfpp/error?emsg=' + string);
            } else{
              console.log("Parsing data with RMFPPparser...");
              RMFPPparser.parse(data, async function (result) { //data returned by the getRequestpp callback function is passed to bodyParserforRmfPP function
                console.log("RMFPPparser completed. Result:", typeof result, Object.keys(result));
                if (result["msg"]) {
                  console.log("Error in parsing:", result["msg"]);
                  var data = result["data"];
                  res.redirect(`/rmfpp/error?emsg=${data}`);
                } else{
                  console.log("Attempting to insert data into PostgreSQL...");
                  const client = await pool.connect();
                  try {
                    await client.query('BEGIN');
                    console.log("Transaction begun");
                    await insertData(client, result);
                    console.log("Data insertion completed");
                    await client.query('COMMIT');
                    console.log("Transaction committed. Data successfully inserted into the database");
                  } catch (error) {
                    console.error("Error during database insertion:", error);
                    await client.query('ROLLBACK');
                    console.log("Transaction rolled back due to error");
                  } finally {
                    client.release();
                    console.log("Database client released");
                  }

                  res.json(result);
                  console.log("Response sent to client");
                }
              });
            }
        });
      //}
      /* } else if (urlReport.length >= 5 && urlReport.slice(0,5) === "WLMGL") { //if user specified WLMGL as report name
        RMFPPgetRequest(lpar["ddshhttptype"], lpar["ddsbaseurl"], lpar["ddsbaseport"], lpar["rmfppfilename"], req.params.report, urlDate, lpar["ddsuser"], lpar["ddspwd"], lpar["ddsauth"], function (data) { //A call to the getRequestpp function made with a callback function as parameter
          if (data === "DE" || data === "NE" || data === "UA" || data === "EOUT") { 
            var string = encodeURIComponent(`${data}`);
            res.redirect('/rmfpp/error?emsg=' + string);
          } else {
          RMFPPparser.bodyParserforRmfWLMPP(data, function (result) { //data returned by the getRequestpp callback function is passed to bodyParserforRmfPP function
            if(result["msg"]){ //Data Error from parser, when parser cannor parse the XML file it receives 
              var data = result["data"];
              res.redirect(`/rmfpp/error?emsg=${data}`);
            } else {
            if (urlSvcCls != undefined) { //if user has specify value for the SvcCls(service classs) parameter
              try {
              var preSvcCls = 'Service Class '; //String
              filterClass(result, preSvcCls, urlSvcCls, urlTime, timestart, timeend, function (rdata) { //Call filterClass function
                res.json(rdata); //Express Respond with the JSON returned by the filterClass function
              });
              } catch (err) { //catch error
                res.json(result);//Express Respond with the Error returned by the filterClass function
              }
            } else if (urlWlkd) { //if user has specify value for the Wlkd(workload) parameter
                try {
                var preWlkd = 'Workload '; //String
                filterClass(result, preWlkd, urlWlkd, urlTime, timestart, timeend, function (rdata) { //Call filterClass function
                    res.json(rdata); //Express Respond with the JSON returned by the filterClass function
                });
                } catch (err) { //catch error
                res.json(result);//Express Respond with the Error returned by the filterClass function
                }
            } else {
                res.json(result); //Express Respond with the full worload report if SvcCls or Wlkd parameters were not specified by user
            }
            }
          });
        }}); */
      break;
    case "LOGIN FAILED" :
      console.log("API ML Login failed");
      res.json("Login to API ML Failed");
      break;
  }
}
/**
 * Rmfpp handles Monitor I data processing
 * @param {string} req - User Request
 * @param {JSON} res - Express Response
 */
module.exports.rmfpp = async function (req, res) {//Controller Function for Realtime Report Processing
  var status = "OK"; // A variable to track function flow status
    if(req.params.lpar){
        if(req.params.apiml){
          await apimlverification(req, function(result){
            status = result;
            RMFIJSON(req, res, status);
          })   
        }else{
          RMFIJSON(req, res, status);
        }
    }
    
  };
  
  /**
   * filterClass function filters Monitor I report based on user specified parameter in the URL
   * @param {string} data - Parsed(JSON) monitor I data returned by post processor parser
   * @param {string} preamble - a Service class/Workload class prefix
   * @param {string} SvcCls - used for 2 purposes, represents either SvcCls and wlkd values specified by user in the URL, depending on when the user calls filterClass function.
   * @param {string} CurrentTime - The value specified by user for time parameter in the URL
   * @param {string} timestart - The value for timestart from duration parameter specified by the user in the URL
   * @param {string} timeend - The value for timeend from duration parameter specified by the user in the URL
   * @param {JSON} fn - The callback function for JSON returned by filterClass Function
   */
  function filterClass(data, preamble, SvcCls, CurrentTime, timestart, timeend, fn) { //Functio for wokload pp service classes filter
    if (CurrentTime === undefined && timestart === undefined && timeend === undefined) { //Checks if user did not specify any parameter in the query URL
      Allresponse = []; //Allresponse collection
      for (i in data) { //looping through all workload report
        var foundit; // indicator for when service class or workload class specified by user is found 
        var response = {} //JSON response collection 
        reportSegments = data[i]['ReportSegments'] //selecting a report segment based on the value of "i"
        var value = preamble + SvcCls; //construct value variable by adding the the value of preamble and SvcCls 
        for (j in reportSegments) { //loop through report segment 
          if (reportSegments[j][value]) {//if report segment contains "value" variable 
            foundit = reportSegments[j]; //foundit variable should be updated 
          }
        } //Prepare response JSON
        response['Report'] = data[i]['Report']; // JSON Response report key value pair
        response['Timestamp'] = data[i]['Timestamp']; //JSON Response timestamp key value pair
        response[preamble.trim()] = foundit; //JSON Response preamble string key value pair
        Allresponse.push(response) //Push response JSON to Allrespose collection
      }
      fn(Allresponse); //return Allresponse collection 
    } else if (timestart === undefined && timeend === undefined) { //if timestart and timeend are specified in the URL
      for (i in data) { //looping through all workload report
        var foundit; // indicator for when service class or workload class specified by user is found 
        var response = {}; // JSON response collection
        var timestamp = data[i]['Timestamp'].split("-"); //Split workload report timestamp
        if (timestamp[1] === CurrentTime) { //Checks if time from timestamp matches the time value specified by user in the URL
          reportSegments = data[i]['ReportSegments'] //Select report segment from the workload report 
          var value = preamble + SvcCls; // concatenate preamble and svccls values
          for (j in reportSegments) { //lopp through report segment 
            if (reportSegments[j][value]) { // check if report segment contains value we are looking for
              foundit = reportSegments[j]; // populate found it variable
            }
          }
          response['Report'] = data[i]['Report']; // JSON Response report key value pair
          response['Timestamp'] = data[i]['Timestamp']; //JSON Response timestamp key value pair
          response[preamble.trim()] = foundit; //JSON Response preamble string key value pair
          break; //stop loop
        }
      }
      fn(response); // return the JSON response
    } else { // if duration parameter is specified
      Allresponse = [];
      var rlist = []; //dummy list
      timeduration(timestart, timeend, rlist, function (timerange) { //call timeduration function
        for (i in data) { //loop through parsed workload report
          var foundit; // indicator for when service class or workload class specified by user is found
          var response = {}; // JSON response collection
          var timestamp = data[i]['Timestamp'].split("-"); // split workload report timestamp
          for (a in timerange) { //loop 
            if (timestamp[1] === timerange[a]) { // if workload report time matches a time within user specicified duration
              reportSegments = data[i]['ReportSegments'] // Select report segment
              var value = preamble + SvcCls; // concatenate preamble and svccls values
              for (j in reportSegments) { //loop through report segment
                if (reportSegments[j][value]) { // if reportsegment matches the value we are looking for
                  foundit = reportSegments[j]; //populate found it
                }
              }
              response['Report'] = data[i]['Report']; // JSON Response report key value pair
              response['Timestamp'] = data[i]['Timestamp']; //JSON Response timestamp key value pair
              response[preamble.trim()] = foundit;//JSON Response preamble string key value pair
              Allresponse.push(response); // push response JSON into Allresponse array
            }
          }
        }
      });
      fn(Allresponse); //return Allresponse Array
    }
  }
  
  /**
   * Newtime function increae the provided time with the number of minutes specified by the ppminuteInterval in the Zconfig.json file.
   * @param {string} time - time provided
   * @param {string} timeInterval - amount of time to add to time provided to produce new time
   * @param {string} fn - Callback function that returns the new time.
   */
  function newTime(time, timeInterval, fn) {
    var ntime = time.split("."); //splits time provided by "."
    var hour = parseInt(ntime[0]); // select hour section
    var minutes = parseInt(ntime[1]); // select minutes section
    var seconds = parseInt(ntime[2]); // select seconds section
    var newminutes; // new variable
    newminutes = minutes + parseInt(timeInterval); // increase minutes with the time interval provided
    if (newminutes >= 60) { // in new minutes equals or greater than 60
      minutes = newminutes - 60; // subtract 60 from new minutes
      hour += 1; // increase hour +1
      if (hour === 24) { // check if hour is now greater than or equal to 24
        return; // stop
      }
  
    } else { // if new minutes is not greater than 60
      minutes = newminutes; //populate minutes variable with new minutes
    }
  
    var formatedHour = ("0" + hour).slice(-2);//format hour to 2 digita
    var formatedminutes = ("0" + minutes).slice(-2); //format minutes to 2 digits
    var formatedseconds = ("0" + seconds).slice(-2); //format seconds to 2 digits
  
    var timeNow = formatedHour + "." + formatedminutes + "." + formatedseconds; // populate time now with new time
    fn(timeNow); //return timenow as new time
  }
  
  /**
   * timeduration function returns an array of times for a specific duration differenctiated by number of minutes specified by the ppminuteInterval in the Zconfig.json file.
   * @param {string} timestart - the starting time in the duration provided
   * @param {string} timeend - the timeend of the duration provided 
   * @param {string} clist - an array to populate the the time within the duration specified .. very important
   * @param {array} fn - Callback that returns the array with new times within the duration specified.
   */
  function timeduration(timestart, timeend, clist, fn) {
    var flist = clist; //take over clist
    var timeendhour = parseInt(timeend[0]); // timeend hour
    var timeendminutes = parseInt(timeend[1]); //timeend minutes 
    var timestarthour = parseInt(timestart[0]); //timestart hour
    var timestartminutes = parseInt(timestart[1]); // timestart minutes
    var timenow = timestart; // populate timenow with value of timestart
    clist.push(timenow); // push timenow to clist array
    //do something with time now
    if (timestarthour === timeendhour && timestartminutes === timeendminutes) { //if timestart is equal to timenow
      timenow = timeend; // timenow is equal to timeend
      clist.push(timenow); // push timenow to clist array
    } else { //if timestart is not equal to timenow
      newTime(timenow, minutesInterval, function (data) { //pass timenow to newtime function which will increase timenow with number of minutes specified by the ppminuteInterval in the Zconfig.json file.
        timeduration(data, timeend, clist, function (data) {  // pass returned time to timeduration function
          //do nothing with returned list
        });
      });
    };
    fn(flist);
  }