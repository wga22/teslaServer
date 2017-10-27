#!/bin/env node
var express = require('express');
var fs  = require('fs');
var util = require('util');
var bodyParser = require('body-parser');
var nhlcommon = require('./nhl_common');

var ConfigJSON = nhlcommon.loadConfig();

//http://www.nicetimeonice.com/api

 var GetInfoSite = function() {

	//  Scope.
	var self = this;
	var fWriteChanges = false;


	/*  ================================================================  */
	/*  Helper functions.                                                 */
	/*  ================================================================  */

	/**
	 *  Set up server IP address and port # using env variables/defaults.
	 */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.NODEJS_IP;
        self.port      = process.env.NODEJS_PORT || 80;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() 
	{
		self.routes = { };
			
        self.routes['/'] = function(req, res) 
		{
			if(req.body && req.body.team)
			{
				handleWIFI(req.body.ssid, req.body.pass);
				handleTeamChange(req.body.team);
				handleTimeZone(req.body.timezone);
				persistJSON();
				
			}
			res.setHeader('Content-Type', 'text/html');
			res.append("teams",JSON.stringify(nhlcommon.teams) );
			res.append("myteam",ConfigJSON.myteam );
			res.append("timezones",JSON.stringify(nhlcommon.timezones) );
			//TODO: get the ssid choices?
			res.append("mytimezone",ConfigJSON.mytimezone );
			res.send(self.cache_get('index.html') );
			console.log("/");
        };
		
        self.routes['/nhlsettings.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/plain');
			//res.send( 'var teams=' + JSON.stringify(nhlcommon.teams) + ";\n");
			//res.send( 'var timezones=' + JSON.stringify(nhlcommon.timezones) + ";\n");
			//res.append("teams", );
			res.send(nhlcommon.teams);
			//res.send
        };
		
        self.routes['/shutdown'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
			res.send("<html><body>Shutting down....</body></html>");        
			handleShutdown(false);
			console.log("shutdown");
		};

        self.routes['/reboot'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
			res.send("<html><body>Rebooting....</body></html>");
			handleShutdown(true);
			console.log("reboot");
        };
    };
	
	function handleShutdown(fReboot)
	{
		var cmd = 'shutdown ' + (fReboot ? "-r" : "") + ' 0 ';
		if(process.platform == "linux")
		{
			var exec = require('child_process').exec;
			exec(cmd, function(error, stdout, stderr) { console.log("updated wifi...." + cmd)});				
		}
		else
		{
			console.log(cmd);
		}
	}
	
	function handleWIFI(sSSID, sPasswrd)
	{
		//TODO: convert to https://www.npmjs.com/package/node-wifi
		//test it first
		/*
		
		*/
		//console.log("OS: " + process.platform);
		var sPasswrd = sPasswrd + "";
		if(process.platform == "linux" && sSSID && sSSID.length > 2 && sPasswrd && (sPasswrd.length > 8 || sPasswrd.length == 0))
		{
			var exec = require('child_process').exec;
			var backupcmd = "cp /etc/wpa_supplicant/wpa_supplicant.conf /etc/wpa_supplicant/wpa_supplicant.conf.bak";
			exec(backupcmd, function(error, stdout, stderr) { console.log("backup wpasupp...." + backupcmd)});	
			//https://linux.die.net/man/8/wpa_passphrase
			//wpa_passphrase "test" "oh_yea_123"
			var cmd = 'wpa_passphrase "'+sSSID+'" "'+ sPasswrd + '" >> /etc/wpa_supplicant/wpa_supplicant.conf';
			exec(cmd, function(error, stdout, stderr) { console.log("updated wifi...." + cmd)});				
		}
	}
	
	function handleTimeZone(sTZ)
	{
		if(ConfigJSON.mytimezone != sTZ)
		{
			ConfigJSON.mytimezone = sTZ;
			fWriteChanges = true;
			//ln -sf /usr/share/zoneinfo/America/New_York /etc/localtime
			if(process.platform == "linux")
			{
				var cmd = "ln -sf /usr/share/zoneinfo/" + sTZ + " /etc/localtime";
				var exec = require('child_process').exec;
				exec(cmd, function(error, stdout, stderr) { console.log("updated timezone...." + cmd)});				
			}
		}
	}
	
	function handleTeamChange(sTeamID)
	{
		if(ConfigJSON.myteam != sTeamID)
		{
			ConfigJSON.myteam = sTeamID;
			fWriteChanges = true;
		}
	}
	
	function persistJSON()
	{
		if(fWriteChanges)
		{
			nhlcommon.writeConfig(ConfigJSON);
			fWriteChanges = false;
		}
	}
	
	
    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();
		self.app.use( bodyParser.json() );       					// to support JSON-encoded bodies
		self.app.use(bodyParser.urlencoded({extended: true}));     // to support URL-encoded bodies
	
        //  Add handlers for the app (from the routes).
        for (var r in self.routes) 
		{
			//TODO: fix to just use one, as I think this is causing stuff to be double called
			self.app.get(r, self.routes[r]);
			self.app.post(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */


/**
 *  main():  Main code.
 */
var zapp = new GetInfoSite();
zapp.initialize();
zapp.start();