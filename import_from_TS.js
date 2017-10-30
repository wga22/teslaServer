#!/usr/bin/env node

Object.defineProperty(Object.prototype, "extend", {
	enumerable: false,
	value: function(from) {
		var props = Object.getOwnPropertyNames(from);
		var dest = this;
		props.forEach(function(name) {
			if (name in dest) {
				var destination = Object.getOwnPropertyDescriptor(from, name);
				Object.defineProperty(dest, name, destination);
				console.log("EXTEND:" + name)
			}
		});
		return this;
	}
});


const util = require('util');
const http = require('http');
const querystring = require("querystring");
//var express    = require("express");
const mongodbClient      = require('mongodb').MongoClient, assert = require("assert");
const teslams = require('teslams');

var configJSON = {};
var oResults = {};
var nFieldsToLoad = 0;		//how many different function calls to make
var fTesting = true;
main();

function writeValuesToThingSpeak(tslaVals)
{
/*
	key
MD1PLM36IK1LO9NZ
 
http://api.thingspeak.com/update?api_key=MD1PLM36IK1LO9NZ&field1=battery_level&field2=speed&field3=heading&field4=battery_range&field5=est_battery_range&field6=ideal_battery_range&field7=33&field8=23&status=car_version
 
sample:
http://api.thingspeak.com/update?api_key=MD1PLM36IK1LO9NZ&field1=80&field2=0&field3=321&field4=239.02&field5=155.79&field6=275.09&field7=33&field8=23&status=6.3
https://nodejs.org/docs/v0.5.2/api/http.html#http.request
	request.on('response', function (response) {
	  response.on('data', function (chunk) {
		console.log('BODY: ' + chunk);
	  });
	});

*/

	var aFields = [];
	aFields.push(validField(tslaVals, "battery_level", "field1") );
	aFields.push(validField(tslaVals, "speed", "field2") );
	aFields.push(validField(tslaVals, "odometer", "field3") );
	aFields.push(validField(tslaVals, "battery_range", "field4") );
	aFields.push(validField(tslaVals, "est_battery_range", "field5") );
	aFields.push(validField(tslaVals, "ideal_battery_range", "field6") );
	aFields.push(validField(tslaVals, "latitude", "field7") );
	aFields.push(validField(tslaVals, "longitude", "field8") );
	aFields.push(validField(tslaVals, "car_version", "status") );
	
	//console.log(aFields.join(""));
	//return;
	//&field1=80&field2=0&field3=321&field4=239.02&field5=155.79&field6=275.09&field7=33&field8=23&status=6.3
	var sQS = aFields.join("");
	if(sQS.length > 10)
	{
		var options = {
		  host: 'api.thingspeak.com',
		  port: 80,
		  path: '/update?api_key=MD1PLM36IK1LO9NZ' + sQS,
		  method: 'GET'
		};
		var req = http.request(options, function(res) 
		{
		  if(fTesting) console.log('STATUS: ' + res.statusCode);
		  if(fTesting) console.log('HEADERS: ' + JSON.stringify(res.headers));
		  res.setEncoding('utf8');
		  res.on('data', function (chunk) 
		  {
			if(fTesting) console.log('BODY: ' + chunk);
		  });
		});

		req.on('error', function(e) {
		  console.log('problem with request: ' + e.message);
		});

		// write data to request body
		req.write('data\n');
		req.write('data\n');
		req.end();		
	}
	console.log("fields: " + sQS);
}


function main()
{
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	console.log("-----will_tesla.js : "+ (new Date()).toLocaleString() + "-----");
	var fs = require('fs');
	try {

		var jsonString = fs.readFileSync("./tesla_config.json").toString();
		configJSON = JSON.parse(jsonString);
		fTesting = (configJSON.debug == "1" || configJSON.debug == "true");
	} catch (err) 
	{
		console.warn("The file 'tesla_config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}
	mongodbClient.connect(configJSON.mongodburl, loadCSVVals);	
} //main

function loadCSVVals(err, db)
{
	assert.equal(null, err);
	if(fTesting) console.log('mongodb connect success ');
	var collection = db.collection(configJSON.mongocollection);
	var fs = require('fs'); 
	var counter = 0
	var parse = require('csv-parse');

	fs.createReadStream('feeds.csv')
	.pipe(parse({delimiter: ','}))
	.on('data', function(csvrow) {
		//console.log(csvrow);
		
/*
	aFields.push(validField(tslaVals, "battery_level", "field1") );
	aFields.push(validField(tslaVals, "speed", "field2") );
	aFields.push(validField(tslaVals, "odometer", "field3") );
	aFields.push(validField(tslaVals, "battery_range", "field4") );
	aFields.push(validField(tslaVals, "est_battery_range", "field5") );
	aFields.push(validField(tslaVals, "ideal_battery_range", "field6") );
	aFields.push(validField(tslaVals, "latitude", "field7") );
	aFields.push(validField(tslaVals, "longitude", "field8") );
	aFields.push(validField(tslaVals, "car_version", "status") );
*/
		var dToday = new Date();
		if(csvrow && csvrow[0] && (dToday > (new Date(csvrow[0]))))
		{
			var tslaVals = 	{timestamp: (new Date(csvrow[0]))}
			//console.log(tslaVals.timestamp.getDate());
			//return
			//addValToObject(tslaVals, "entry", csvrow[1]);
			var nHasVals =0;
			nHasVals += addNumericalValToObject(tslaVals, "battery_level", csvrow[2]);
			nHasVals += addNumericalValToObject(tslaVals, "speed", csvrow[3]);
			nHasVals += addNumericalValToObject(tslaVals, "heading", csvrow[4]);
			nHasVals += addNumericalValToObject(tslaVals, "battery_range", csvrow[5]);
			nHasVals += addNumericalValToObject(tslaVals, "est_battery_range", csvrow[6]);
			nHasVals += addNumericalValToObject(tslaVals, "ideal_battery_range", csvrow[7]);
			nHasVals += addNumericalValToObject(tslaVals, "latitude", csvrow[8]);
			nHasVals += addNumericalValToObject(tslaVals, "longitude", csvrow[9]);
			//addValToObject(tslaVals, "car_version", csvrow[10]);
			if(nHasVals > 2)
			{
				collection.insertOne(tslaVals, function(err, r){console.log("inserted: " + counter++)});
			}
		}
		
	})
	.on('end',function() {
	  //do something wiht csvData
	  //console.log(csvData);
	  db.close()
	});
}

function addNumericalValToObject(oObj, sLabel, nVal)
{
	var floatNum = parseFloat(nVal)
	if(floatNum > 0 || floatNum <=0)
	{
		oObj[sLabel] = floatNum;
		return 1;
	}
	return 0;
}





// Generic callback function to print the return value
function storeVals( jsonVals ) 
{
		writeValuesToMongoDB(oResults);
	//append these results to the main JSON object with results
	oResults = merge_options(oResults, jsonVals);
	nFieldsToLoad--;
	//when you are on the last of 3 field sets, then write them all to thingspeak
	if(nFieldsToLoad <=0)
	{
		oResults.timestamp = new Date();
		if(fTesting) pr(oResults);
		writeValuesToThingSpeak(oResults);
	}
}

// Generic callback function to print the return value
function pr( jsonVals ) {
	console.log( util.inspect( jsonVals ) );
}

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
function merge_options(obj1,obj2)
{
    //create a new object, to contain all the attributes from both of the original objects
	var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}


function validField(oObj, sField, sFieldName)
{
	if(!isNullOrUndefined(oObj) && !isNullOrUndefined(oObj[sField]))
	{
		return "&" + sFieldName + "=" + querystring.escape(oObj[sField]);
	}
	return "";
}

function isNullOrUndefined(oObj)
{
	return !((oObj && true) || oObj == 0)
}



/*
NOTES: 
get_charge_state:
	{ charging_state: null,
  charge_limit_soc: 84,
  charge_limit_soc_std: 90,
  charge_limit_soc_min: 50,
  charge_limit_soc_max: 100,
  charge_to_max_range: false,
  battery_heater_on: null,
  not_enough_power_to_heat: null,
  max_range_charge_counter: 0,
  fast_charger_present: false,
  fast_charger_type: '<invalid>',
  battery_range: 185.97,
  est_battery_range: 204.26,
  ideal_battery_range: 232.06,
  battery_level: 78,
  usable_battery_level: 78,
  battery_current: 0,
  charge_energy_added: 22.66,
  charge_miles_added_rated: 79,
  charge_miles_added_ideal: 98.5,
  charger_voltage: 1,
  charger_pilot_current: null,
  charger_actual_current: 0,
  charger_power: 0,
  time_to_full_charge: 0,
  trip_charging: null,
  charge_rate: 0,
  charge_port_door_open: false,
  motorized_charge_port: true,
  scheduled_charging_start_time: null,
  scheduled_charging_pending: false,
  user_charge_enable_request: null,
  charge_enable_request: true,
  eu_vehicle: false,
  charger_phases: null }
get_drive_state
{ shift_state: null,
  speed: null,
  latitude: 38.895555,
  longitude: -77.069788,
  heading: 266,
  gps_as_of: 1444400448 }
  
  
  			// USE teslams.get_charge_state( vid, pr );
			// USE teslams.get_drive_state( vid, pr );
			// USE teslams.get_vehicle_state( vid, pr );

			// teslams.wake_up( vid, pr );
			//
			// get some info
			//
			// teslams.mobile_enabled( vid, pr );
			// teslams.get_climate_state( vid, pr );
			 
			// teslams.get_gui_settings( vid, pr );
			//
			// cute but annoying stuff while debugging
			//
			// teslams.flash( vid, pr ); 
			// teslams.honk( vid, pr ); 
			// teslams.open_charge_port( vid, pr ) 
			//
			// control some stuff
			//
			// teslams.door_lock( { id: vid, lock: "lock" }, pr );
			// teslams.sun_roof( { id: vid, roof: "close" }, pr );
			// teslams.auto_conditioning( { id: vid, climate: "off" }, pr ); 
			// teslams.charge_range( { id: vid, range: "standard" }, pr ); 
			// teslams.charge_state( { id: vid, charge: "on" }, pr ); 
			// teslams.set_temperature( { id: vid, dtemp: 20 }, pr ); 
  
  
*/

