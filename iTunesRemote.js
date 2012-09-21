var iTunesRemote = {
	/*
	**  iTunesRemote Variables
	*/
	iTunesDescr: undefined,			// the actual iTunes service description
	connected: false,				// 
	sessionID: "",					// 
	iTunesHTTPServer: undefined,
	revision: 1,					// Revision number for iTunes status
	lastAlbumID: "",				// Last Album ID
	statusTimer: undefined,			// Time for request iTunes Status
	databaseID: -1,					// Database ID
	databasePersistentID: -1,		// Database Persisten ID
	iTunesStatus: undefined,		// Current iTunes Status
	updateStatusError: false,
	
	/*
	**  Initialise the module
	*/
	setup: function() {
	},
	
	/*
	** Get the actual address of the iTunes instance, depending on whether
	** we are on IPv4 or IPv6 network.
	*/
	getAddress: function() {
		// If we don't select an iTunes instance
		if (iTunesRemote.iTunesDescr == undefined)
			return;

		var addrs = iTunesRemote.iTunesDescr.addresses;
		var i, len = addrs.length;
		
		// If we are on IPv4
		if (CF.ipv4address.length > 0) {
			for (i=0; i < len; i++) {
				if (addrs[i].indexOf(":") == -1)
					return addrs[i];
			}
		}
		
		// If we are on IPv6
		for (i=0; i < len; i++) {
			if (addrs[i].charAt(0) == "[")
				return addrs[i];
		}
	},
	
	
	/*
	** Encode decimal to hexadecimal
	*/
	encodeHex: function(data) {
		var BigInt = CFBigInt(""+data);
		return BigInt.toStringBase(16).toUpperCase();
	},
	
	
	/*
	** Escape and encode data for DAAP protocol
	*/
	escapeAndEncode: function(str) { 
		str = str.replace(/\\/g, "\\\\");
		str = str.replace(/\'/g, "\\'");
		str = str.replace(/\"/g, "\\\"");
		return encodeURIComponent(str);
	},
	
	/*
	** Send a DAAP request to iTunes, wait for result, decode DAAP object and pass it to callback
	*/
	sendRequest: function(command, params, additionalHeaders, callback) {
		// Build the URL
		var url = "http://" + iTunesRemote.getAddress() + ":3689/" + command;
		var args = "";
		for (var index in params)
			args += "&" + index + "=" + params[index];
		if (args != "")
			url += "?" + args.substr(1);

		CF.log("URL: " + url);
			
		// Send the request
		var headers = {
			"Client-DAAP-Version": "3.10", 
			"Accept-Encoding": "gzip",
			"Accept": "*/*",
			"User-Agent": "Remote",
			"Viewer-Only-Client": "1"
		};
		for (var index in additionalHeaders)
			headers[index] = additionalHeaders[index];
		CF.request(url, "GET", headers,	function(status, headers, body) {		
			// if status OK or with an empty body
			if (status == 200 || status == 204 ) {
				// Call the callback with the returned object
				if (body != "")
					body = DAAP.decode(body)
				callback.apply(null, [body, null]);
			} else {
				// Call the callback with an error
				callback.apply(null, [null, "Request failed with status " + status]);
				if (status == -1) {
					// when timing out having to log in again :/
					iTunesRemote.revision = 1;
					setTimeout(function() {
						iTunesRemote.login();
					}, 5000);
				}
			}
		});	
	},

	
	/*
	** Get description
	*/
	description: function() {
		return "<Library " + iTunesRemote.iTunesDescr.displayName + " @ " + iTunesRemote.getAddress() + ">";
	},
	
	/*
	** Connect to a new iTunes
	*/
	connect: function(server, callback) {
		// Initialisation of variables
		this.iTunesDescr = server;
		this.connected = false;
		this.sessionID = "";
		
		iTunesRemote.serverInfo(function () {
			iTunesRemote.contentCodes(function () {
				iTunesRemote.login(function () {
					// If we were given a callback
					if (callback !== undefined) {
						callback.apply(null, []);
					}
				});
			});
		});
	},
	
	/*
	** Retrieve server informations
	*/
	serverInfo: function(callback) {
		// If we don't select an iTunes instance
		if (iTunesRemote.iTunesDescr == undefined)
			return;

		// Get server info
		this.sendRequest("server-info", {}, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to get server info from ", iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				// If we were given a callback
				if (callback !== undefined) {
					callback.apply(null, []);
				}
			}
		});
	},

	/*
	** Retrieve content codes
	*/
	contentCodes: function(callback) {
		// If we don't select an iTunes instance
		if (iTunesRemote.iTunesDescr == undefined)
			return;

		// Get content codes
		this.sendRequest("content-codes", {}, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to get content codes from ", iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				// We update our list of DAAP code
				var listCodes = result.mccr.mdcl
				for (i = 0; i < listCodes.length; i++) {
					if (listCodes[i].mcnm.length == 4) {
						// We create missing code
						if (DAAP.contentCodes[listCodes[i].mcnm] == undefined) {
							switch (listCodes[i].mcty) {
								case 1: case 2: type = 'byte'; break;
								case 3: case 4: type = 'short'; break;
								case 5: case 6: type = 'int'; break;
								case 7: case 8: type = 'long'; break;
								case 9: type = 'string'; break;
								case 10: type = 'date'; break;
								case 11: type = 'version'; break;
								case 12: type = 'list'; break;
							}
							DAAP.contentCodes[listCodes[i].mcnm] = {
								type: type,
								name: listCodes[i].mcna
							};
						}
					}
				}
				
				// If we were given a callback
				if (callback !== undefined) {
					callback.apply(null, []);
				}
			}
		});
	},
	
	
	/*
	** We init session with iTunes and retrieve sessionID
	*/
	login: function(callback) {
		// If we don't select an iTunes instance
		if (iTunesRemote.iTunesDescr == undefined)
			return;
			
		// We create our request
		var params = {
			"pairing-guid": "0x"+iTunesServer.pairingGUID
		};
		iTunesRemote.sendRequest("login", params, {}, function(result, error) {
			if (error !== null) {
				// Failed login in
				CF.log("Trying to get login info from "+ iTunesRemote.description());
				CF.log("Error = ", error);
				this.connected = false;
				this.sessionID = "";
			} else {
				// Takes a DAAP packet obj and then extracts the SessionID
				iTunesRemote.sessionID = result.mlog.mlid;
				CF.log("Login session ID = "+ iTunesRemote.sessionID);
				
				if (iTunesRemote.updateStatusError)
					iTunesRemote.updateStatus(iTunesGUI.iTunesStatusUpdate);

				// If we were given a callback
				if (callback !== undefined) {
					callback.apply(null, []);
				}
			}
		});
	},
	
	/*
	** Ask status of iTunes instance
	*/
	updateStatus: function(updateFunction) {
		// If we don't select an iTunes instance
		if (iTunesRemote.iTunesDescr == undefined)
			return;

		// We store a reference of the classe
		var self = this;
		
		// We create our request
		var params = {
			//"revision-number": self.revision,
			"revision-number": 1,
			"session-id": self.sessionID
		};
		var additionalHeaders = {
			"Connection": "keep-alive"
		};
		iTunesRemote.sendRequest("ctrl-int/1/playstatusupdate", params, additionalHeaders, function(result, error) {
			if (error !== null) {
				// Failed login in
				CF.log("Trying to get status from "+ iTunesRemote.description());
				CF.log("Error = ", error);
				iTunesRemote.updateStatusError = true;
			} else {
				// We store revision number
				self.revision = result.cmst.cmsr;
				
				// We define artwork status
				if (result.cmst.asai == undefined) {
					artwork = "clear";
				} else {
					if (self.lastAlbumID == undefined)
						artwork = "update";
					else
						artwork = ((self.lastAlbumID.indexOf(result.cmst.asai) == -1) ? "update" : "nothing");
				}

				// We create our object for the GUI
				var statusiTunes = {
					playstatus: ((result.cmst.caps == 4) ? "playing" : "pause"),
					shuffle: ((result.cmst.cash == 1) ? "on" : "off"),
					repeat: ((result.cmst.carp == 0) ? "none" : ((result.cmst.carp == 1) ? "single" : "all")),
					track: result.cmst.cann,
					artist: result.cmst.cana,
					album: result.cmst.canl,
					albumid: result.cmst.asai,
					progressRemain: result.cmst.cant,
					progressTotal: result.cmst.cast,
					fullscreen: ((result.cmst.cafs > 0) ? "on" : "off"),
					visualizer: ((result.cmst.cavs > 0) ? "on" : "off"),
					geniusSelectable: result.cmst.ceGS,
					artwork: artwork,
				};
				
				// We store current album ID
				self.lastAlbumID = statusiTunes.albumid;
				
				// We store iTunes status
				iTunesRemote.iTunesStatus = statusiTunes;
				
				// If we were given a callback
				if (updateFunction !== undefined) {
					updateFunction.apply(null, [statusiTunes]);
				}
				
				// We ask in one seconde
				setTimeout(function() { self.updateStatus(updateFunction); }, 1000);
			}
		});
	},

	/*
	** We update artwork of current playing album
	*/
	updateNowPlayingArtwork: function(join, dimension) {
		CF.setToken(join, "HTTP:Client-DAAP-Version", 3.10);
		CF.setToken(join, "HTTP:Viewer-Only-Client", 1);
		CF.setJoin(join, "http://" + iTunesRemote.getAddress() + ":3689/ctrl-int/1/nowplayingartwork?mw=" + dimension + "&mh=" + dimension + "&session-id=" + iTunesRemote.sessionID);
	},

	/*
	** This function ask for databases ID
	*/
	getDatabaseIDs: function(callback) {
		// We store a reference of the classe
		var self = this;

		// We create our request
		var params = {
			"session-id": self.sessionID
		};
		iTunesRemote.sendRequest("databases", params, {}, function(result, error) {
			if (error !== null) {
				// Failed login in
				CF.log("Trying to get status from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				// We find your library
				for (var index in result.avdb.mlcl.mlit) {
					if (result.avdb.mlcl.mlit[index].minm == self.iTunesDescr.displayName) {
						self.databaseID = result.avdb.mlcl.mlit[index].miid;
						self.databasePersistentID = result.avdb.mlcl.mlit[index].mper;
					}
				}

				// If we were given a callback
				if (callback !== undefined) {
					callback.apply(null, []);
				}

			}
		});
	},
	

	/*
	** We retrieve music Library
	*/
	getListMusicLibrary: function(callback) {
		// We ask for databases ID
		this.getDatabaseIDs(function() {
			// We create our request
			var params = {
				"session-id": iTunesRemote.sessionID,
				"meta": "dmap.itemname,dmap.itemcount,dmap.itemid,dmap.persistentid,daap.baseplaylist,com.apple.itunes.special-playlist,com.apple.itunes.smart-playlist,com.apple.itunes.saved-genius,dmap.parentcontainerid,dmap.editcommandssupported"
			};
			iTunesRemote.sendRequest("databases/" + iTunesRemote.databaseID + "/containers", params, {}, function(result, error) {
				if (error !== null) {
					// Failed login in
					CF.log("Trying to get status from "+ iTunesRemote.description());
					CF.log("Error = ", error);
				} else {
					var listPlaylist = {
						MusicID: -1,
						MovieID: -1,
						TVShowID: -1,
						Playlists: new Array(),
					};
					
					// We parse list of Playlist
					var listItems = result.aply.mlcl.mlit;
					for (var index in listItems) {
						var name = listItems[index].minm;
						
						switch (name) {
							case "Musique":
								listPlaylist.MusicID = listItems[index].miid;
								break;
								
							case "Films":
								listPlaylist.MovieID = listItems[index].miid;
								break;
								
							case "Séries TV":
								listPlaylist.TVShowID = listItems[index].miid;
								break;
								
							case "Locations":
							case "Podcasts":
							case "iTunes U":
							case "Livres":
								break;
								
							default:
								// abpl = 1  : Main music library
								// aePS = 2  : iTunes DJ
								// aePS = 12 : Genius
								// aePS = 15 : Mix Genius
								// aePS = 16 : Mix
								// mimc : Nb items
								if ((listItems[index].abpl != 1 || listItems[index].abpl == undefined) && 
								    (listItems[index].aePS != 2 || listItems[index].aePS == undefined) &&
									(listItems[index].aePS != 12 || listItems[index].aePS == undefined) &&
									(listItems[index].aePS != 15 || listItems[index].aePS == undefined) && 
									(listItems[index].aePS != 16 || listItems[index].aePS == undefined) && 
									(listItems[index].mimc > 0)) {
									if (listItems[index].aePS == 8) {
										type = "Store";
									} else if (listItems[index].aePS == 9) {
										type = "StoreDevice";
									} else if (listItems[index].aeSG == 1) {
										type = "Genius";
									} else if (listItems[index].aeSP == 1) {
										type = "Smart";
									} else {
										type = "Standard";
									}
									var item = {
										name: listItems[index].minm,
										id: listItems[index].miid,
										persistentid: listItems[index].mper,
										type: type,
									};
									listPlaylist.Playlists.push(item);
								}
								break;
						}
					}

					// If we were given a callback
					if (callback !== undefined) {
						callback.apply(null, [listPlaylist]);
					}

				}
			});
		});
	},


	/*
	** We ask albums from playlist
	*/
	requestAlbums: function(playlistID, perid, search, sort, callback) {		
		var params = {
			"meta": "dmap.itemname,dmap.itemid,daap.songartist,daap.songalbum,dmap.persistentid,daap.songtime,daap.songalbumid,dmap.containeritemid",
			"type": "music",
			"include-sort-headers": "1",
			"session-id": iTunesRemote.sessionID
		};
		switch (sort) {
			case "album":
				params["sort"] = "album";
				params["group-type"] = "albums";
				break;
			case "artist":
				params["sort"] = "album";
				params["group-type"] = "artists";
				break;
			case "playlist":
				break;
		}
		// If we define a search request
		if (search != "") {
			var query_search = "";
			var data = search.split(' ');
			for (var index in data) {
				if (query_search != "")
					query_search += "+";
				query_search += "'daap.songalbum:*" + iTunesRemote.escapeAndEncode(data[index]) + "*'";
			}
			params["query"] = "(" + query_search + "+('com.apple.itunes.mediakind:1','com.apple.itunes.mediakind:32')+'daap.songalbum!:')";
		}

		// We ask for data
		iTunesRemote.sendRequest("databases/" + iTunesRemote.databaseID + "/containers/" + playlistID + "/groups" , params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to get albums from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				var listAlbums = new Array();
				var currentAlbum = {
					album: ""
				};
				
				// We recreate array if we have only one entry
				var listItems = result.apso.mlcl.mlit;
				if (listItems == undefined)
					listItems = new Array();
				if (listItems.length == undefined) {
					saveItem = listItems;
					listItems = new Array();
					listItems.push(saveItem);
				}

				// We parse list of Playlist
				for (var index in listItems) {
					// We store album
					var album = listItems[index].asal;
					if (album != currentAlbum.album) {
						// We store last album
						if (currentAlbum.album != "")
							listAlbums.push(currentAlbum);

						// We store new album
						currentAlbum = {
							id:	listItems[index].asai,
							playlistperid: perid,
							album: album,
							artist: listItems[index].asar,
							artwork: "http://" + iTunesRemote.getAddress() + ":3689/databases/" + iTunesRemote.databaseID + "/items/" + listItems[index].miid + "/extra_data/artwork?mw=128&mh=128&session-id=" + iTunesRemote.sessionID,							
							songs: new Array()
						};
					}
					// Various artists ?
					if (currentAlbum.artist != listItems[index].asar)
						currentAlbum.artist = "Divers artistes";
					// We add song to list
					currentAlbum.songs.push(currentSong = {
						id: listItems[index].miid,
						perid: listItems[index].mper,
						containeritemid: listItems[index].mcti,
						title: listItems[index].minm,
						duration: listItems[index].astm,
					});
				}
				// We store last album
				if (currentAlbum.album != "")
					listAlbums.push(currentAlbum);

				// If we were given a callback
				if (callback !== undefined) {
					callback.apply(null, [listAlbums]);
				}
			}
		});
	},


	/*
	** We ask albums from playlist
	*/
	requestArtists: function(search, callback) {
		var params = {
			"meta": "dmap.itemname,dmap.itemid,dmap.persistentid,daap.songartist,daap.groupalbumcount",
			"type": "music",
			"group-type": "artists",
			"sort": "album",
			"include-sort-headers": "1",
			"query": "(('com.apple.itunes.mediakind:1','com.apple.itunes.mediakind:32')+'daap.songartist!:')",
			"session-id": iTunesRemote.sessionID
		};
		// If we define a search request
		if (search != "") {
			var query_search = "";
			var data = search.split(' ');
			for (var index in data) {
				if (query_search != "")
					query_search += "+";
				query_search += "'daap.songartist:*" + iTunesRemote.escapeAndEncode(data[index]) + "*'";
			}
			params["query"] = "(" + query_search + "+('com.apple.itunes.mediakind:1','com.apple.itunes.mediakind:32')+'daap.songartist!:')";
		}
		
		// We ask for data
		iTunesRemote.sendRequest("databases/" + iTunesRemote.databaseID + "/groups" , params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to get albums from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				// We init variable
				var listArtists = new Array();
				
				// We recreate array if we have only one entry
				var listItems = result.agar.mlcl.mlit;
				if (listItems == undefined)
					listItems = new Array();
				if (listItems.length == undefined) {
					saveItem = listItems;
					listItems = new Array();
					listItems.push(saveItem);
				}
				
				// We parse list of Playlist
				for (var index in listItems) {
					// We store artist
					listArtists.push({
						artist: listItems[index].minm,
						nbAlbums: listItems[index].agac,
						nbSongs: listItems[index].mimc,
						artwork: "http://" + iTunesRemote.getAddress() + ":3689/databases/" + iTunesRemote.databaseID + "/groups/" + listItems[index].miid + "/extra_data/artwork?mw=128&mh=128&group-type=artists&session-id=" + iTunesRemote.sessionID,							
					});
				}

				// If we were given a callback
				if (callback !== undefined) {
					callback.apply(null, [listArtists]);
				}
			}
		});
	},	


	/*
	** We ask albums from playlist
	*/	
	requestSongs: function(id, search, callback) {
		var params = {
			"meta": "dmap.itemname,dmap.itemid,daap.songartist,daap.songalbumartist,daap.songalbum,dmap.containeritemid,com.apple.itunes.mediakind,daap.songtime",
			"type": "music",
			"sort": "name",
			"include-sort-headers": "1",
			"session-id": iTunesRemote.sessionID
		};
		// If we define a search request
		if (search != "") {
			var query_search = "";
			var data = search.split(' ');
			for (var index in data) {
				if (query_search != "")
					query_search += "+";
				query_search += "'dmap.itemname:*" + iTunesRemote.escapeAndEncode(data[index]) + "*'";
			}
			params["query"] = "(" + query_search + "+('com.apple.itunes.mediakind:1','com.apple.itunes.mediakind:32'))";
		}
		
		// We ask for data
		iTunesRemote.sendRequest("databases/" + iTunesRemote.databaseID + "/containers/" + id + "/items" , params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to get songs from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				// We init variable
				var listSongs = new Array();
				var offset = 0;
				
				// We recreate array if we have only one entry
				var listItems = result.apso.mlcl.mlit;
				if (listItems == undefined)
					listItems = new Array();
				if (listItems.length == undefined) {
					saveItem = listItems;
					listItems = new Array();
					listItems.push(saveItem);
				}
								
				// We parse list of Playlist
				for (var index in listItems) {
					// We store artist
					listSongs.push({
						artwork: "http://" + iTunesRemote.getAddress() + ":3689/databases/" + iTunesRemote.databaseID + "/items/" + listItems[index].miid + "/extra_data/artwork?mw=128&mh=128&session-id=" + iTunesRemote.sessionID,
						id: listItems[index].miid,
						title: listItems[index].minm,
						album: listItems[index].asal,
						artist: listItems[index].asar,
						duration: listItems[index].astm,
						index: offset++
					});
				}

				// If we were given a callback
				if (callback !== undefined) {
					callback.apply(null, [listSongs]);
				}
			}
		});
	},	

	
	/*
	** This function return songs from albums
	*/
	requestSongsFromAlbum: function(albumID, callback) {
		var params = {
			"meta": "dmap.itemname,dmap.itemid,dmap.persistentid,daap.songartist,daap.songdatereleased,dmap.itemcount,daap.songtime,dmap.persistentid,daap.songalbumid,daap.songtracknumber,daap.songalbum,daap.songdatereleased",
			"type": "music",
			"group-type": "albums",
			"sort": "album",
			"include-sort-headers": "1",
			"query": "(('com.apple.itunes.mediakind:1','com.apple.itunes.mediakind:32')+'daap.songalbumid:" + albumID + "')",
			"session-id": iTunesRemote.sessionID
		};
		iTunesRemote.sendRequest("databases/" + iTunesRemote.databaseID + "/items" , params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to get albums from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				var album = null;
				var listItems = result.adbs.mlcl.mlit;
				var offset = 0;
				
				// We recreate array if we have only one entry
				if (listItems.length == undefined) {
					saveItem = listItems;
					listItems = new Array();
					listItems.push(saveItem);
				}
				
				// We parse songs of album
				for (var index in listItems) {
					var song = listItems[index];
					// We store album information
					if (album == null) {
						if (song.asdr) {
							var monthLetters = new Array("Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre");
							var dateRelease = new Date(song.asdr * 1000);
							releaseDate = dateRelease.getDate() + " " + monthLetters[dateRelease.getMonth()] + " " + dateRelease.getFullYear();
						} else {
							releaseDate = "";
						}
						album = {
							id: song.asai,
							name: song.asal,
							nb: result.adbs.mtco,
							artist: song.asar,
							releaseDate: releaseDate,
							artwork: "http://" + iTunesRemote.getAddress() + ":3689/databases/" + iTunesRemote.databaseID + "/items/" + listItems[index].miid + "/extra_data/artwork?mw=128&mh=128&session-id=" + iTunesRemote.sessionID,
							duration: 0,
							songs: new Array()
						};
					}
					// Various artists ?
					if (album.artist != song.asar)
						album.artist = "Divers artistes";
					// We add song to list
					album.songs.push(currentSong = {
						id: song.mper,
						index: offset,
						title: song.minm,
						duration: song.astm,
						tracknumber: song.astn,
					});
					album.duration += song.astm;
					offset += 1;
				}

				// If we were given a callback
				if (callback !== undefined) {
					callback.apply(null, [album]);
				}
			}
		});		
	},


	/*
	** Request a list of song from an artist
	*/
	requestSongsFromArtist: function(artist, callback) {
		var params = {
			"meta": "dmap.itemname,dmap.itemid,dmap.persistentid,daap.songartist,daap.songdatereleased,dmap.itemcount,daap.songtime,dmap.persistentid,daap.songalbumid,daap.songtracknumber,daap.songalbum,daap.songdatereleased",
			"type": "music",
			"group-type": "albums",
			"sort": "album",
			"include-sort-headers": "1",
			"query": "(('com.apple.itunes.mediakind:1','com.apple.itunes.mediakind:32')+('daap.songartist:" + iTunesRemote.escapeAndEncode(artist) + "','daap.songalbumartist:" + iTunesRemote.escapeAndEncode(artist) + "'))",
			"session-id": iTunesRemote.sessionID
		};
		iTunesRemote.sendRequest("databases/" + iTunesRemote.databaseID + "/items" , params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to get albums from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				var albums = new Array();
				var currentAlbum = {
					title: ""
				};
				var listItems = result.adbs.mlcl.mlit;
				var offset = 0;
				
				// We recreate array if we have only one entry
				if (listItems.length == undefined) {
					saveItem = listItems;
					listItems = new Array();
					listItems.push(saveItem);
				}
				
				// We parse songs of album
				for (var index in listItems) {
					var song = listItems[index];
					// If we have a new album
					if (song.asal != currentAlbum.title) {
						if (currentAlbum.title != "")
							albums.push(currentAlbum);
						
						currentAlbum = {
							id: song.asai,
							title: song.asal,
							artist: artist,
							artwork: "http://" + iTunesRemote.getAddress() + ":3689/databases/" + iTunesRemote.databaseID + "/items/" + listItems[index].miid + "/extra_data/artwork?mw=128&mh=128&session-id=" + iTunesRemote.sessionID,
							duration: 0,
							songs: new Array()
						};
						offset = 0;
					}
					
					// We add song to list
					currentAlbum.songs.push({
						id: song.mper,
						index: offset,
						title: song.minm,
						duration: song.astm,
						tracknumber: song.astn,
					});
					offset++;
				}
				
				// We add last album
				if (currentAlbum.title != "")
					albums.push(currentAlbum);
					
					
				// If we were given a callback
				if (callback !== undefined) {
					callback.apply(null, [albums]);
				}
			}
		});
	},
	
	
	/*
	** Play a song from an album
	*/
	playSongFromAlbum: function(album, index) {
		var params = {
			"command": "clear",
			"session-id": iTunesRemote.sessionID,
		};
		iTunesRemote.sendRequest("ctrl-int/1/cue", params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to clear from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				var params = {
					"command": "play",
					"query": "'daap.songalbumid:" + album + "'",
					"index" : index,
					"sort": "album",
					"session-id": iTunesRemote.sessionID,
				};
				iTunesRemote.sendRequest("ctrl-int/1/cue", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to play song from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});
			}
		});		
	},
	
	
	/*
	** Play a song from an artist
	*/
	playSongFromArtist: function(artist, songalbumid, index) {
		var params = {
			"command": "clear",
			"session-id": iTunesRemote.sessionID,
		};
		iTunesRemote.sendRequest("ctrl-int/1/cue", params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to clear from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				var params = {
					"command": "play",
					"query": "(('daap.songartist:" + iTunesRemote.escapeAndEncode(artist) + "','daap.songalbumartist:" + iTunesRemote.escapeAndEncode(artist) + "')+('com.apple.itunes.mediakind:1','com.apple.itunes.mediakind:32')+'daap.songalbumid:" + songalbumid + "')",
					"index" : index,
					"sort": "album",
					"session-id": iTunesRemote.sessionID,
				};
				iTunesRemote.sendRequest("ctrl-int/1/cue", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to play song from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});
			}
		});
	},
	

	/*
	** Play a song from all the library
	*/
	playSongFromLibrary: function(index) {
		var params = {
			"command": "clear",
			"session-id": iTunesRemote.sessionID,
		};
		iTunesRemote.sendRequest("ctrl-int/1/cue", params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to clear from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				var params = {
					"command": "play",
					"query": "('com.apple.itunes.mediakind:1','com.apple.itunes.mediakind:32')",
					"index" : index,
					"sort": "name",
					"session-id": iTunesRemote.sessionID,
				};
				iTunesRemote.sendRequest("ctrl-int/1/cue", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to play song from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});
			}
		});
		
	},
	
	
	/*
	** Start playing a song from a playlist
	*/
	playSongFromPlaylist: function(id, containeritemid, playlistid) {
		// We retrieve playlist ID
		var params = {
			"command": "clear",
			"session-id": iTunesRemote.sessionID,
		};
		iTunesRemote.sendRequest("ctrl-int/1/cue", params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to clear from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				var params = {
					"database-spec": "'dmap.persistentid:0x" + iTunesRemote.encodeHex(iTunesRemote.databasePersistentID) + "'",
					"container-spec": "'dmap.persistentid:0x" + iTunesRemote.encodeHex(playlistid) + "'",
					"container-item-spec": "'dmap.containeritemid:0x" + iTunesRemote.encodeHex(containeritemid) + "'",
					"session-id": iTunesRemote.sessionID,
				};
				iTunesRemote.sendRequest("ctrl-int/1/playspec", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to play song from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});
			}
		});		
	},

	
	/*
	** Play a song from a search query
	*/
	playSearchSong: function(query, indexsearch) {
		var params = {
			"command": "clear",
			"session-id": iTunesRemote.sessionID,
		};
		iTunesRemote.sendRequest("ctrl-int/1/cue", params, {}, function(result, error) {
			if (error !== null) {
				CF.log("Trying to play from "+ iTunesRemote.description());
				CF.log("Error = ", error);
			} else {
				// We define our query
				var query_search = "";
				var data = query.split(' ');
				for (var index in data) {
					if (query_search != "")
						query_search += "+";
					query_search += "'dmap.itemname:*" + iTunesRemote.escapeAndEncode(data[index]) + "*'";
				}
				query_search = "(" + query_search + "+('com.apple.itunes.mediakind:1','com.apple.itunes.mediakind:32'))";
				// We define our request
				var params = {
					"command": "play",
					"query": query_search,
					"index" : indexsearch,
					"sort": "name",
					"session-id": iTunesRemote.sessionID,
				};
				iTunesRemote.sendRequest("ctrl-int/1/cue", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to play song from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});
			}
		});		
	},
	
	
	/*
	** We send iTunes commands
	*/	
	iTunesActions: function(cmd, value) {
		// We store a reference of the classe
		var self = this;

		// We create our request
		switch(cmd) {
			// We change the Play/Pause
			case "playpause":
				var params = {
					"session-id": self.sessionID,
				};
				iTunesRemote.sendRequest("ctrl-int/1/playpause", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to change the paly/pause status from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});
				break;
		
			// We select prev song
			case "back":
				var params = {
					"session-id": self.sessionID,
				};
				iTunesRemote.sendRequest("ctrl-int/1/previtem", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to select prev song from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});
				break;
		
			// We select next song
			case "next":
				var params = {
					"session-id": self.sessionID,
				};
				iTunesRemote.sendRequest("ctrl-int/1/nextitem", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to select next song from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});
				break;
		
			// We change repeat state
			case "repeat":
				switch (iTunesRemote.iTunesStatus.repeat) {
					case "none":
						repeatState = 2;
						break;
					case "all":
						repeatState = 1;
						break;
					case "single":
						repeatState = 0;
						break;
				}
				var params = {
					"session-id": self.sessionID,
					"dacp.repeatstate": repeatState
				};
				iTunesRemote.sendRequest("ctrl-int/1/setproperty", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to change repeat status from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});				
				break;
		
			// We change shuffle state
			case "shuffle":
				var params = {
					"session-id": self.sessionID,
					"dacp.shufflestate": ((iTunesRemote.iTunesStatus.shuffle == "on") ? 0 : 1)
				};
				iTunesRemote.sendRequest("ctrl-int/1/setproperty", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to change suffle status from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});				
				break;
				
			// We seek in the track
			case "seek":
				var params = {
					"session-id": self.sessionID,
					"dacp.playingtime": Math.round(iTunesRemote.iTunesStatus.progressTotal * value / 100)
				};
				iTunesRemote.sendRequest("ctrl-int/1/setproperty", params, {}, function(result, error) {
					if (error !== null) {
						CF.log("Trying to change suffle status from "+ iTunesRemote.description());
						CF.log("Error = ", error);
					}
				});				
				break;
		}
	},
};

// Add the module to iViewer
CF.modules.push({name: "iTunesRemote", object:iTunesRemote, setup:iTunesRemote.setup});