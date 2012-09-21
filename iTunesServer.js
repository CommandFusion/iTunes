/*
   _ _______                     _____                          
  (_)__   __|                   / ____|                         
   _   | |_   _ _ __   ___  ___| (___   ___ _ ____   _____ _ __ 
  | |  | | | | | '_ \ / _ \/ __|\___ \ / _ \ '__\ \ / / _ \ '__|
  | |  | | |_| | | | |  __/\__ \____) |  __/ |   \ V /  __/ |   
  |_|  |_|\__,_|_| |_|\___||___/_____/ \___|_|    \_/ \___|_|   
                        JavaScript module for CommandFusion v0.1

==================================================================

  AUTHORS:  Florent Pillet, CommandFusion
            Arnault Raes
  CONTACT:  support@commandfusion.com
  URL:      www.commandfusion.com/scripting/examples/iTunes
  VERSION:  v0.1
  LAST MAJ: 2 December 2011

==================================================================

  USAGE :
  To use this script, please complete the following steps:
  1. Add this script to your project properties.
  2. Create a system in system manager named 'iTunesPairingServer':
     - Set the IP address to "localhost"
     - Check "Accept incoming connections"
     - Set the port to a port of your choosing for this system (will accept connections on this port)
     - Don't set the EOM
  3. Add a single feedback item named 'Pairing request' with regex as follows: GET /pair\?(.*)\n
     - You do not need to add anything else to the feedback item, just the name and regex.
  4. Add a Persistent Global Token to the project, named "iTunesPairedServices"

  NOTE: if you don't follow exactly the instructions above, this module will not work!
  
==================================================================
*/

var iTunesServer = {
	/*
	**  iTunesServer Variables
	*/
	publishing: false,
	pairingName: "iViewer",					// the remote name that shows up in iTunes (we add the actual device name to this name)
	pairingGUID: undefined,					// the string we use as the unique pairing GUID (automatically generated from device UDID)
	pairingCode: "0000",					// the pairing code you want to use. Set this
	pairingSystem: "iTunesPairingServer",	// the local System we use to receive pairing requests
	pairingFeedback: "Pairing Request",		// the feedback to match pairing requests
	pairingToken: "iTunesPairedServices",	// the global token to save pairing server
	pairingSystemPort: 0,					// the port on which we accept pairing requests
	pairedServices: [],						// the names (iTunes UIDs) of the services we are paired with
	activeServers: [],						// the current active iTunes instances on the network (an array on iTunesInstance objects)
	acceptingPairingCallback: undefined,	// callback function when pairing is ok

	/*
	**  Initialise the module
	*/
	setup: function() {
		// Prepare this device's pairing GUID based on the device UDID
		// returned by the OS. The GUID needs to be 32 chars (ASCII hex representation of 16 bytes)
		this.pairingGUID = CF.device.uuid.replace(/- /, "").toUpperCase();
		while (this.pairingGUID.length < 16)
			this.pairingGUID += "0";
		this.pairingGUID = this.pairingGUID.substr(0,16);

		// Locate the iTunesPairingServer system, use its port
		if (CF.systems.hasOwnProperty(this.pairingSystem)) {
			this.pairingSystemPort = CF.systems[this.pairingSystem].localPort;
			CF.watch(CF.FeedbackMatchedEvent, this.pairingSystem, this.pairingFeedback, this.processPairingRequest);
		}
		
		// If TCP server system is not found, we stop here
		if (this.pairingSystemPort === undefined) {
			CF.log("You need to have a TCP server system named 'iTunesPairingServer' defined in your GUI.");
		} else {
			// Get the global token that holds the already-paired service name, if any
			var that = this;
			CF.getJoin(CF.GlobalTokensJoin, function(join, value, tokens) {
				// Check whether the global token is defined in the GUI
				var savedPairings = tokens[that.pairingToken];
				if (savedPairings !== undefined) {
					if (savedPairings.length !== 0) {
						// Load the list of known paired services
						that.pairedServices = savedPairings.split("|");
						CF.log("iTunes setup complete");
						if (that.pairedServices.length !== 0) {
							CF.log("Known paired services:");
							CF.logObject(that.pairedServices);
						}
					} else {
						CF.log("iTunes setup complete - No saved paired services");
					}
					// We scan local network
					that.startNetworkLookup();
				} else {
					CF.log("You need to define a persisting global token named iTunesPairedServices for the iTunes module to use.");
				}
			});
		}
	},

	/*
	** Generate a random code for pairing
	*/
	generatePairingCode: function() {
		var code = "" + Math.round(Math.random() * 10000);
		code = code.substr(0,4);
		while (code.length < 4)
			code = "0" + code;
		return code;
	},

	/*
	** Get the published name for iTunes Servers
	*/
	getPublishedName: function() {
		return this.pairingName + " (" + CF.device.name + ")";
	},
	
	/*
	** Start publishing a Bonjour service on the network for remote pairing with iTunes
	*/
	startAcceptingPairingRequests: function(callback) {
		// Verification that the system is not already published
		if (!this.publishing) {
			// Generating a new pairing code
			this.pairingCode = this.generatePairingCode();
			CF.log("Pairing code : "+this.pairingCode);
			
			// Prepare the TXT record and publish (all components must be strings)
			var publishedName = this.pairingName + " (" + CF.device.name + ")";
			var txtData = {
				"DvNm": publishedName,
				"DvTy": CF.device.model,
				"Pair": this.pairingGUID,
				"RemV": "10000",
				"RemN": "Remote",
				"txtvers": "1"
			};
			CF.log("Start advertising iViewer Remote with pairing ID " + this.pairingGUID);
			CF.startPublishing("_touch-remote._tcp", "", this.pairingSystemPort, txtData, this.remotePairingPublishResult);
			
			// Record of publication
			this.publishing = true;
			
			// Callback function
			this.acceptingPairingCallback = callback;
			
			// Reference to the pairing code
			return this.pairingCode;
		}
	},	

	/*
	** Function called when the iTunes Bonjour Service was published
	*/
	remotePairingPublishResult: function(name, type, port, published, error) {
		// This function is called as a result of CF.startPublishing()
		if (!published) {
			CF.log("Failed publishing service for iTunes pairing, error: " + error);
			iTunesServer.publishing = false;
			iTunesServer.pairingCode = "0000";
		} else {
			CF.log("Ready for pairing with name="+name+", port="+port);
		}
	},	

	/*
	** We stop the service to pearing iTunes
	*/
	stopAcceptingPairingRequests: function() {
		CF.stopLookup("_touch-remote._tcp", "");
		iTunesServer.publishing = false;
	},	
	
	/*
	**  Function called when receiving pairing request
	*/
	processPairingRequest: function(feedbackItem, matchedStr) {
		//CF.log("Received pairing request: " + matchedStr);
		// We check if the request match
		var matches = matchedStr.match(/GET \/pair\?pairingcode=([0-9A-F]{32})&servicename=([0-9A-F]{16})/);
		if (matches.length !== 0) {
			// Validate the pairing hash
			var hash = matches[1];
			var validationStr = iTunesServer.pairingGUID;
			for (var i=0; i < iTunesServer.pairingCode.length; i++)
				validationStr += iTunesServer.pairingCode.charAt(i) + "\x00";
			// Verifiying validation hash
			CF.hash(CF.Hash_MD5, validationStr, function(validationHash) {
				if (validationHash == hash) {
					// The pairing code is valid, remember this pairing in the
					// global token and send confirmation
					CF.log("Hash is valid, pairing complete, sending pairing response");
					iTunesServer.pairedServiceName = matches[2];
					
					// Prepare the pairing valid response
					var reply = {
						"cmpa": {
							"cmnm": iTunesServer.pairingName + " (" + CF.device.name + ")",
							"cmty": CF.device.model,
							"cmpg": iTunesServer.pairingGUID
						}
					};
					
					// Send the response to iTunes
					var response = DAAP.encode(reply);
					CF.send(iTunesServer.pairingSystem, "HTTP/1.1 200 OK\r\nContent-Length: "+ response.length + "\r\n\r\n" + response);
					
					// Remember the paired service in our global token
					CF.log("We store Servicename: "+matches[2]);
					iTunesServer.pairedServices.push(matches[2]+";");
					CF.setToken(CF.GlobalTokensJoin, "iTunesPairedServices", iTunesServer.pairedServices.join("|"));
					
					// Stop publishing pearing
					iTunesServer.stopAcceptingPairingRequests();
					
					// We restart Network Scan
					iTunesServer.stopNetworkLookup();
					iTunesServer.startNetworkLookup();
					
					// We call the callack
					if (iTunesServer.acceptingPairingCallback !== undefined)
						iTunesServer.acceptingPairingCallback.apply(null, [matches[2]]);
				} else {
					CF.log("Hash is invalid, denying pairing");
					CF.send(iTunesServer.pairingSystem, "HTTP/1.1 401 Unauthorized\r\n\r\n");
				}
			});
		} else {
			CF.send(iTunes.pairingSystem, "HTTP/1.1 400 Bad Request\r\n\r\n");
		}
	},
		
	/*
	** Finding the list of itunes servers on the network
	*/
	startNetworkLookup: function() {
		// Call this function once to start browsing for live instances of iTunes on the network
		if (this.lookupActive)
			return;
		this.lookupActive = true;
		this.activeServers = [];
		// We start the research
		CF.startLookup("_touch-able._tcp.", "", function(added, removed, error) {
			function IDForService(service) {
				var serviceID = service.name;
				if (serviceID !== undefined) {
					var matches = serviceID.match(/[0-9A-F]{16}/);
					if (matches.length > 0) {
						return matches[0];
					}
				}
				return null;
			}

			// If an error occur
			if (error !== null) {
				CF.log(error);
				return;
			}
			
			// Add new services to the list of live iTunes instances
			var i, len, service;
			for (i=0, len=added.length; i < len; i++) {
				service = added[i];
				service.displayName = service.data["CtlN"];
				iTunesServer.activeServers.push(service);
			}

			// Remove disappearing services from the list
			for (i=0, len=removed.length; i < len; i++) {
				service = removed[i];
				service.displayName = service.data["CtlN"];
				// remove service from active iTunes instances
				for (var j=0, lj=iTunesServer.activeServers.length; j < lj; j++) {
					if (iTunesServer.activeServers[j].name == service.name) {
						iTunesServer.activeServers.splice(j);
						break;
					}
				}
			}

			// We update name of active server in iTunesServer.pairedServices
			for (var i=0, li=iTunesServer.pairedServices.length; i < li; i++) {
				var id = iTunesServer.pairedServices[i].substr(0, 16);
				for (var j=0, lj=iTunesServer.activeServers.length; j < lj; j++) {
					if (iTunesServer.activeServers[j].name == id)
						iTunesServer.pairedServices[i] = id + ";" + iTunesServer.activeServers[j].displayName;
				}
			}
			CF.setToken(CF.GlobalTokensJoin, "iTunesPairedServices", iTunesServer.pairedServices.join("|"));
		});
	},
	
	/*
	** Call this function to stop updating the list of iTunes instances on the network
	*/
	stopNetworkLookup: function() {
		CF.stopLookup(".touch-able.tcp.", "");
		iTunesServer.lookupActive = false;
	},
	
	/*
	** Return the list of active server in the network
	*/
	getPairedServices: function() {
		var list = [];
		for (var i=0, li=iTunesServer.pairedServices.length; i < li; i++) {
			var id = iTunesServer.pairedServices[i].substr(0, 16);
			var inline = 0;
			for (var j=0, lj=iTunesServer.activeServers.length; j < lj; j++) {
				if (iTunesServer.activeServers[j].name == id)
					inline = 1;
			}
			var item = {
				id: id,
				inline: inline,
				name: iTunesServer.pairedServices[i].substr(17),
			};
			list.push(item);
		}
		return list;
	},
	
	/*
	** Return the active server identified by the name
	*/
	getServiceByName: function(name) {
		for (var j=0, lj=iTunesServer.activeServers.length; j < lj; j++) {
			if (iTunesServer.activeServers[j].name == name)
				return iTunesServer.activeServers[j];
		}
		return null;
	},
};

// Add the module to iViewer
CF.modules.push({name: "iTunesServer", object:iTunesServer, setup:iTunesServer.setup});