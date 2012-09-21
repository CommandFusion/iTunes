var iTunesGUI = {
	/*
	** List of variables
	*/
	joins: {
		// List of pages
		pageNoLibrary:		10,
		pageMainPage:		100,
		pageSearch:			700,
		pageBanner:			800,
		pageCommand:		900,
		pageLibrary: 		1000,
		pageLibraryNothing:	1001,
		pageLibraryList: 	1002,
		pageLibraryAdd: 	1003,
		pageShowAlbumClose:	1100,
		pageShowAlbum:		1101,
		
		// List of lists
		listLibraryList:	1011,
		listPlaylist:		400,
		listAlbums:			500,
		listArtists:		1300,
		listArtistsSongs:	1400,
		listSongs:			1500,
		listSongsAlbum:		1110,
		listPlaylistSongs:	1200,
		listSearch:			1600,
	},
	
	/*
	**  Initialise the module
	*/
	setup: function() {
		// We check if we have aa previous library selected
		CF.getJoin(CF.GlobalTokensJoin, function(join, value, tokens) {
			// Clear lists
			CF.setJoins([
				{join: "l" + iTunesGUI.joins.listLibraryList, value: "0x"},
			]);
				
			// We show page
			CF.setJoins([
				{join: "d" + iTunesGUI.joins.pageNoLibrary, value: 1},
				{join: "d" + iTunesGUI.joins.pageMainPage, value: 1},
				{join: "d" + iTunesGUI.joins.pageSearch, value: 0},
				{join: "d" + iTunesGUI.joins.pageBanner, value: 1},
				{join: "d" + iTunesGUI.joins.pageCommand, value: 1},
				{join: "d" + iTunesGUI.joins.pageLibrary, value: 0},
				{join: "d" + iTunesGUI.joins.pageLibraryNothing, value: 0},
				{join: "d" + iTunesGUI.joins.pageLibraryList, value: 0},
				{join: "d" + iTunesGUI.joins.pageLibraryAdd, value: 0},
				{join: "d" + iTunesGUI.joins.pageShowAlbum, value: 0},
			]);
			
			// We hide all lists of albums, artists, songs
			CF.setProperties([
				{join: "l" + iTunesGUI.joins.listAlbums, opacity: 0},
				{join: "l" + iTunesGUI.joins.listArtists, opacity: 0},
				{join: "l" + iTunesGUI.joins.listArtistsSongs, opacity: 0},
				{join: "l" + iTunesGUI.joins.listSongs, opacity: 0},
				{join: "a1520", opacity: 0},
				{join: "l" + iTunesGUI.joins.listPlaylistSongs, opacity: 0},
			], 0.0, 0.0);

			
			// Check whether the global token is defined in the GUI
			var lastServices = tokens["LastServices"];
			if (lastServices == "") {
				// We hide button from banner
				iTunesGUI.hideBannerButtons();
			} else {
				// We wait 2s for all module loading
				setTimeout(function() {
					iTunesGUI.selectLibrary(lastServices);
				}, 2000);
			}
		});
	
		// We watch the search field
		CF.watch(CF.JoinChangeEvent, "s701", iTunesGUI.searchAction);
	},
	
	/*
	**  Show the popup of library selection
	*/
	showLibrarySelection: function() {
		// Show Library Selection
		CF.setJoin("d"+this.joins.pageLibrary, 1);
		// Select subpage
		pairedServers = iTunesServer.getPairedServices();
		if (pairedServers.length == 0) {
			// We show pages
			CF.setJoin("d"+this.joins.pageLibraryNothing, 1);
			CF.setJoin("d"+this.joins.pageLibraryList, 0);
			CF.setJoin("d"+this.joins.pageLibraryAdd, 0);
		} else {
			// We create list
			CF.setJoin("l" + this.joins.listLibraryList, "0x");
			var list = [];
			for (var i=0, li=pairedServers.length; i < li; i++) {
				var obj = pairedServers[i];
				var item = {};
				item["s"+(this.joins.listLibraryList+1)] = {
					properties: {
						opacity: ((i == 0) ? 0 : 1)
					}
				};
				item["d"+(this.joins.listLibraryList+2)] = obj.inline;
				item["s"+(this.joins.listLibraryList+3)] = obj.name;
				item["d"+(this.joins.listLibraryList+4)] = {
					tokens: {
						"[id]": obj.id
					}
				};
				list.push(item);
			}
			CF.listAdd("l" + this.joins.listLibraryList, list);
			
			// We show pages
			CF.setJoin("d"+this.joins.pageLibraryNothing, 0);
			CF.setJoin("d"+this.joins.pageLibraryList, 1);
			CF.setJoin("d"+this.joins.pageLibraryAdd, 0);
		}
	},
	
	/*
	**  Hide the popup of library selection
	*/
	hideLibrarySelection: function() {
		// Hide pages
		CF.setJoin("d"+this.joins.pageLibrary, 0);
		CF.setJoin("d"+this.joins.pageLibraryNothing, 0);
		CF.setJoin("d"+this.joins.pageLibraryList, 0);
		CF.setJoin("d"+this.joins.pageLibraryAdd, 0);
		// We stop the process of pairing
		iTunesServer.stopAcceptingPairingRequests();
	},
	
	/*
	**  Start pairing process
	*/
	startPairingProcess: function() {
		// We start de process of pairing
		code = iTunesServer.startAcceptingPairingRequests(iTunesGUI.pairingProcessFinished);
		if (code != undefined) {
			// We update the code in the GUI
			CF.setJoins([
				{ join:"s1021", value:"library-code-"+code.substr(0,1)+".png" },   // 1er digit
				{ join:"s1022", value:"library-code-"+code.substr(1,1)+".png" },   // 2eme digit
				{ join:"s1023", value:"library-code-"+code.substr(2,1)+".png" },   // 3eme digit
				{ join:"s1024", value:"library-code-"+code.substr(3,1)+".png" },   // 4eme digit
			]);
			// We update description
			CF.setJoin("s1025", "Pour ajouter une bibliothèque iTunes, ouvrez iTunes sur vore ordinateur puis sélectionnez « "+iTunesServer.getPublishedName()+" » dans la liste Appareils.");
			// We show subpages
			CF.setJoin("d"+this.joins.pageLibraryNothing, 0);	// Hide no paired library
			CF.setJoin("d"+this.joins.pageLibraryList, 0);		// Hide list library
			CF.setJoin("d"+this.joins.pageLibraryAdd, 1);		// Show add library
		}
	},
	
	/*
	** Function called when the pairing is validated
	*/
	pairingProcessFinished: function(servicename) {
		iTunesGUI.hideLibrarySelection();
		iTunesGUI.selectLibrary(servicename);
	},

	/*
	** Select a library and init login process
	*/
	selectLibrary: function(servicename) {
		var service = iTunesServer.getServiceByName(servicename);

		iTunesRemote.connect(service, function () {
			iTunesRemote.updateStatus(iTunesGUI.iTunesStatusUpdate);
			iTunesGUI.loadiTunesLibrary();
			CF.setJoin("d"+iTunesGUI.joins.pageNoLibrary, 0);
			iTunesGUI.showBannerButtons();
		});
	},

	/*
	** Ask for playlist an create our list in the GUI 
	*/
	loadiTunesLibrary: function() {
		iTunesRemote.getListMusicLibrary(function(playlists) {
			// We create list
			CF.setJoin("l" + iTunesGUI.joins.listPlaylist, "0x");
			setTimeout(function() {
				var list = [{
					s413: {
						properties: {
							opacity: 0
						}
					},
					s410: "list_icon_musique.png",
					s411: "Musique",
					d412: {
						tokens: {
							"[type]": "music",
							"[id]": playlists.MusicID
						}
					}
				}, /*{
					s410: "list_icon_films.png",
					s411: "Films",
					d412: {
						tokens: {
							"[type]": "films",
							"[id]": playlists.MovieID
						}
					}
				}, {
					s410: "list_icon_seriestv.png",
					s411: "Séries TV",
					d412: {
						tokens: {
							"[type]": "tvshow",
							"[id]": playlists.TVShowID
						}
					}
				}*/];
				
				for (var index in playlists.Playlists) {
					var obj = playlists.Playlists[index];
					if (obj.type != "StoreDevice") {
						var item = {};
						item.s411 = obj.name;
						item.d412 = {
							tokens: {
								"[type]": "playlist",
								"[id]": obj.id,
								"[perid]": obj.persistentid,
							}
						};
						list.push(item);
					}
				}
				CF.listAdd("l" + iTunesGUI.joins.listPlaylist, list);
				
				// We ask for default list
				iTunesGUI.selectBDDItem("music", playlists.MusicID, "");
			}, 500);
		});
	},
	
	
	/*
	** This function is called when an item is selected in the left list
	*/
	selectBDDItem: function(type, id, perid) {
		switch (type) {
			case "music":
				CF.getJoin(CF.GlobalTokensJoin, function(join, value, tokens) {
					switch (tokens["LibraryDisplay"]) {
						case "Albums":
							iTunesRemote.requestAlbums(id, perid, "", "album", iTunesGUI.albumRequestUpdate);
							break;
							
						case "Artists":
							iTunesRemote.requestArtists("", iTunesGUI.artistRequestUpdate);
							break;
							
						case "Songs":
							iTunesRemote.requestSongs(id, "", iTunesGUI.songRequestUpdate);
							break;
					}
				
					// We display good playlist
					CF.setProperties([
						{join: "s399", opacity: 1},
						{join: "l" + iTunesGUI.joins.listAlbums, opacity: 0},
						{join: "l" + iTunesGUI.joins.listArtists, opacity: 0},
						{join: "l" + iTunesGUI.joins.listArtistsSongs, opacity: 0},
						{join: "l" + iTunesGUI.joins.listSongs, opacity: 0},
						{join: "a1520", opacity: 0},
						{join: "l" + iTunesGUI.joins.listPlaylistSongs, opacity: 0},
						{join: "l" + iTunesGUI.joins.listSearch, opacity: 0},
					], 0.0, 0.0);
					
					// We show buttons
					iTunesGUI.showBannerButtons();
					
					// We hide searchBar
					iTunesGUI.hideSearchPage();
				});
				break;
				
			case "playlist":
				// We ask for default list
				iTunesRemote.requestAlbums(id, perid, "", "playlist", iTunesGUI.playlistRequestUpdate);
				
				// We display good playlist
				CF.setProperties([
					{join: "s399", opacity: 1},
					{join: "l" + iTunesGUI.joins.listAlbums, opacity: 0},
					{join: "l" + iTunesGUI.joins.listArtists, opacity: 0},
					{join: "l" + iTunesGUI.joins.listArtistsSongs, opacity: 0},
					{join: "l" + iTunesGUI.joins.listSongs, opacity: 0},
					{join: "a1520", opacity: 0},
					{join: "l" + iTunesGUI.joins.listPlaylistSongs, opacity: 1},
					{join: "l" + iTunesGUI.joins.listSearch, opacity: 0},
				], 0.0, 0.0);
				
				// We hide buttons
				iTunesGUI.hidePlaylistButtons();
				
				// We hide searchBar
				iTunesGUI.hideSearchPage();
				break;
		}
	},
	
	
	/*
	** This function receive a list of albums and add items to lists
	*/
	albumRequestUpdate: function(albums) {
		// We init variables
		var entry = {};
		var nb_item = 0;
		var list_entries = new Array();
		// We create list
		CF.setJoin("l" + iTunesGUI.joins.listAlbums, "0x");
		for (var index in albums) {
			var album = albums[index];
			nb_item++;
			entry["s" + (500 + nb_item * 10)] = {
				value: album.artwork,
				tokens: {
					"HTTP:Client-DAAP-Version": 3.10,
					"HTTP:Viewer-Only-Client": 1
				}
			};
			entry["s" + (500 + nb_item * 10 + 1)] = album.album;
			entry["s" + (500 + nb_item * 10 + 2)] = album.artist;
			entry["d" + (500 + nb_item * 10 + 3)] = {
				tokens: {
					"[id]": album.id
				}
			};
			
			// If we have 5 items we start a new line
			if (nb_item == 5) {
				list_entries.push(entry);
				entry = {};
				nb_item = 0;
			}
		}
		if (nb_item > 0)
			list_entries.push(entry);
		// We add data to the list
		CF.listAdd("l" + iTunesGUI.joins.listAlbums, list_entries);
		
		// If our list is not a multiple of 5
		if ((nb_item % 5) != 0) {
			var line = list_entries.length-1;
			for (i = 0; i < 5 - nb_item; i++) {
				CF.setProperties([
					{join: "l" + iTunesGUI.joins.listAlbums + ":" + line + ":s" + (500 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listAlbums + ":" + line + ":s" + (501 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listAlbums + ":" + line + ":s" + (502 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listAlbums + ":" + line + ":d" + (503 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listAlbums + ":" + line + ":s" + (504 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listAlbums + ":" + line + ":s" + (505 + (5-i) * 10), opacity: 0.0},
				], 0.0, 0.0);
			}
		}
		
		// We hide progress text
		CF.setProperties([
			{join: "l" + iTunesGUI.joins.listAlbums, opacity: 1},
			{join: "s399", opacity: 0}
		], 0.0, 0.0);
	},
	
	
	/*
	** We update our list of artist
	*/
	artistRequestUpdate: function(artists) {
		// We init variables
		var entry = {};
		var nb_item = 0;
		var list_entries = new Array();
		// We create list
		CF.setJoin("l" + iTunesGUI.joins.listArtists, "0x");
		for (var index in artists) {
			var artist = artists[index];
			nb_item++;
			entry["s" + (1300 + nb_item * 10)] = {
				value: artist.artwork,
				tokens: {
					"HTTP:Client-DAAP-Version": 3.10,
					"HTTP:Viewer-Only-Client": 1
				}
			};
			entry["s" + (1300 + nb_item * 10 + 1)] = artist.artist;
			entry["s" + (1300 + nb_item * 10 + 2)] = artist.nbAlbums+" album"+((artist.nbAlbums>1) ? "s":"")+", "+artist.nbSongs+" morceau"+((artist.nbSongs>1)?"x":"");
			entry["d" + (1300 + nb_item * 10 + 3)] = {
				tokens: {
					"[artist]": artist.artist
				}
			};
			
			// If we have 5 items we start a new line
			if (nb_item == 5) {
				list_entries.push(entry);
				entry = {};
				nb_item = 0;
			}
		}
		if (nb_item > 0)
			list_entries.push(entry);
		// We add data to the list
		CF.listAdd("l" + iTunesGUI.joins.listArtists, list_entries);
		
		// If our list is not a multiple of 5
		if ((nb_item % 5) != 0) {
			var line = list_entries.length-1;
			for (i = 0; i < 5 - nb_item; i++) {
				CF.setProperties([
					{join: "l" + iTunesGUI.joins.listArtists + ":" + line + ":s" + (1300 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listArtists + ":" + line + ":s" + (1301 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listArtists + ":" + line + ":s" + (1302 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listArtists + ":" + line + ":d" + (1303 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listArtists + ":" + line + ":s" + (1304 + (5-i) * 10), opacity: 0.0},
					{join: "l" + iTunesGUI.joins.listArtists + ":" + line + ":s" + (1305 + (5-i) * 10), opacity: 0.0},
				], 0.0, 0.0);
			}
		}
		
		// We hide progress text
		CF.setProperties([
			{join: "l" + iTunesGUI.joins.listArtists, opacity: 1},
			{join: "s399", opacity: 0}
		], 0.0, 0.0);
	},
	
	
	/*
	** We update our list of songs
	*/
	songRequestUpdate: function(songs) {
		// We init variables
		var entry = {};
		var list_entries = new Array();
		var lastletter = "";
		var indexLetter = 0;
		var listIndexLetter = "";
		// We create list
		CF.setJoin("l" + iTunesGUI.joins.listSongs, "0x");
		for (var index in songs) {
			// We replace unused words
			var songTitle = songs[index].title;
			var words = [ ["\"", ""], ["a ", ""], ["à", "a"], ["ç", "c"], ["l'", ""], ["d'", ""], ["the ", ""], ["un ", ""], ["une ", ""], ["la ", ""], ["le ", ""], ["les ", ""], ["des ", ""], ["...", ""], ["(", ""], ["é", "e"], ["è", "e"] ];
			for (var index2 in words) {
				var searchWord = words[index2][0];
				if (songTitle.substr(0, searchWord.length).toLowerCase() == searchWord)
					songTitle = words[index2][1] + songTitle.substring(searchWord.length);
			}
			
			// If we chage letter
			var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			var currentLetter = songTitle.substr(0, 1).toUpperCase();
			if (letters.indexOf(currentLetter, 0) == -1)
				currentLetter = "#";
			if (currentLetter != lastletter) {
				list_entries.push({
					title: true,
					s1502: currentLetter
				});
				lastletter = currentLetter;
				if (listIndexLetter != "") listIndexLetter += ";";
				listIndexLetter += currentLetter+":"+indexLetter++;
			}
			
			// We add current song
			list_entries.push({
				s1502: songs[index].title,
				s1503: songs[index].album,
				s1504: songs[index].artist,
				s1505: iTunesGUI.convertMillisecondsToMinute(songs[index].duration),
				d1506: {
					tokens: {
						"[index]": songs[index].index
					}
				}
			});
			indexLetter++;
		}
		// We define our token
		CF.setToken("a1520", "[letters]", listIndexLetter);
		// We add data to the list
		CF.listAdd("l" + iTunesGUI.joins.listSongs, list_entries);
		// We show items
		CF.setProperties([
			{join: "l" + iTunesGUI.joins.listSongs, opacity: 1},
			{join: "a1520", opacity: 1},
			{join: "s399", opacity: 0}
		], 0.0, 0.0);
	},
	
	
	/*
	** This function receive a list of albums and add items to lists
	*/
	playlistRequestUpdate: function(albums) {
		// We init variables
		var list_entries = new Array();
		// We create list
		CF.setJoin("l" + iTunesGUI.joins.listPlaylistSongs, "0x");
		for (var index in albums) {
			// Variables
			var album = albums[index];
			var pushEntry = false;
			var nb_item = 0;
			var songAlbum = 0;
			var entry = {};
			// Album description
			entry["title"] = true;
			entry["s1201"] = {
				value: album.artwork,
				tokens: {
					"HTTP:Client-DAAP-Version": 3.10,
					"HTTP:Viewer-Only-Client": 1
				}
			};
			entry["s1202"] = album.album;
			entry["s1203"] = album.artist;

			// We hide empty song
			for (cpt=album.songs.length+1; cpt<=3; cpt++) {
				entry["s" + (1201 + cpt*10)] = "";
				entry["s" + (1202 + cpt*10)] = "";
				entry["s" + (1203 + cpt*10)] = { properties: { opacity: 0 } };
			}

			// List of songs
			for (var subindex in album.songs) {
				songAlbum++;
				var song = album.songs[subindex];
				if (nb_item < 3) {
					entry["s" + (1211 + (nb_item*10))] = song.title;
					entry["s" + (1212 + (nb_item*10))] = iTunesGUI.convertMillisecondsToMinute(song.duration);
					entry["d" + (1214 + (nb_item*10))] = {
						tokens: {
							"[id]": song.id,
							"[containeritemid]": song.containeritemid,
							"[playlistid]": album.playlistperid
						}
					};
				} else {
					// We add 3 first song
					if (pushEntry == false) {
						list_entries.push(entry);
						pushEntry = true;
					}
					// We add new song
					entry = {
						s1241: song.title,
						s1242: iTunesGUI.convertMillisecondsToMinute(song.duration),
						d1244: {
							tokens: {
								"[id]": song.id,
								"[containeritemid]": song.containeritemid,
								"[playlistid]": album.playlistperid
							}
						}
					}
					if (songAlbum == album.songs.length)
						entry["s1243"] = { properties: { opacity: 0 } };
					list_entries.push(entry);
				}
				nb_item++;
			}
			// We add date to the list
			if (pushEntry == false) {
				list_entries.push(entry);
				pushEntry = true;
			}
		}
		// We add data to the list
		CF.listAdd("l" + iTunesGUI.joins.listPlaylistSongs, list_entries);		
		// We hide progress text
		CF.setProperties([{join: "s399", opacity: 0}], 0.0, 0.0);
	},
	
	
	/*
	** Function to show songs from Albums
	*/
	showSongsAlbum: function(idAlbum) {
		iTunesRemote.requestSongsFromAlbum(idAlbum, function(album) {
			// Set Album Desc
			CF.setJoins([
				{ join:"s1103", value:album.artwork, tokens: { "HTTP:Client-DAAP-Version": 3.10, "HTTP:Viewer-Only-Client": 1 } },
				{ join:"s1104", value:album.name },
				{ join:"s1105", value:album.artist },
				{ join:"s1106", value: ((album.releaseDate=="")?"":"Sortie le "+album.releaseDate+", ") + album.nb + " morceau" + ((album.nb>1)?"s":"") + ", " + Math.floor(album.duration/60000) + " minutes" },
			]);

			// List songs
			CF.setJoin("l" + iTunesGUI.joins.listSongsAlbum, "0x");
			setTimeout(function() {
				var list_songs = new Array();
				for (var index in album.songs) {
					var song = album.songs[index];
					var entry = {
						s1112: song.tracknumber + ".",
						s1113: song.title,
						s1114: iTunesGUI.convertMillisecondsToMinute(song.duration),
						d1115: {
							tokens: {
								"[album]": album.id,
								"[id]": song.id,
								"[index]": song.index,
							}
						}
					};
					list_songs.push(entry);
				}
				// We add data to the list
				CF.listAdd("l" + iTunesGUI.joins.listSongsAlbum, list_songs);
			}, 200);
			
			// Show Album page
			CF.setJoin("d"+iTunesGUI.joins.pageShowAlbumClose, 1);
			setTimeout(function() {
				CF.setJoin("d"+iTunesGUI.joins.pageShowAlbum, 1);
			}, 300);
		});
	},
	
	
	/*
	** Function to hide the popup of Album Songs
	*/
	hideSongsAlbum: function() {
		CF.setJoin("d"+iTunesGUI.joins.pageShowAlbum, 0);
		setTimeout(function() {
			CF.setJoin("d"+iTunesGUI.joins.pageShowAlbumClose, 0);
		}, 500);
	},
	
	
	/*
	** Show a list of songs of an artist
	*/
	showSongsArtist: function(artist) {
		iTunesRemote.requestSongsFromArtist(artist, function(albums) {
			// We init variables
			var list_entries = new Array();
			// We create list
			CF.setJoin("l" + iTunesGUI.joins.listArtistsSongs, "0x");
			for (var index in albums) {
				// Variables
				var album = albums[index];
				var pushEntry = false;
				var nb_item = 0;
				var songAlbum = 0;
				var entry = {};
				// Album description
				entry["title"] = true;
				entry["s1401"] = {
					value: album.artwork,
					tokens: {
						"HTTP:Client-DAAP-Version": 3.10,
						"HTTP:Viewer-Only-Client": 1
					}
				};
				entry["s1402"] = album.title;
				entry["s1403"] = album.artist;

				// We hide empty song
				for (cpt=album.songs.length+1; cpt<=3; cpt++) {
					entry["s" + (1401 + cpt*10)] = "";
					entry["s" + (1402 + cpt*10)] = "";
					entry["s" + (1403 + cpt*10)] = { properties: { opacity: 0 } };
				}

				// List of songs
				for (var subindex in album.songs) {
					songAlbum++;
					var song = album.songs[subindex];
					if (nb_item < 3) {
						entry["s" + (1411 + (nb_item*10))] = song.title;
						entry["s" + (1412 + (nb_item*10))] = iTunesGUI.convertMillisecondsToMinute(song.duration);
						entry["d" + (1414 + (nb_item*10))] = {
							tokens: {
								"[artist]": album.artist,
								"[songalbumid]": album.id,
								"[index]": song.index
							}
						};
					} else {
						// We add 3 first song
						if (pushEntry == false) {
							list_entries.push(entry);
							pushEntry = true;
						}
						// We add new song
						entry = {
							s1441: song.title,
							s1442: iTunesGUI.convertMillisecondsToMinute(song.duration),
							d1444: {
								tokens: {
									"[artist]": album.artist,
									"[songalbumid]": album.id,
									"[index]": song.index
								}
							}
						}
						if (songAlbum == album.songs.length)
							entry["s1443"] = { properties: { opacity: 0 } };
						list_entries.push(entry);
					}
					nb_item++;
				}
				// We add date to the list
				if (pushEntry == false) {
					list_entries.push(entry);
					pushEntry = true;
				}
			}
			// We add data to the list
			CF.listAdd("l" + iTunesGUI.joins.listArtistsSongs, list_entries);					
			
			// We display good playlist
			CF.setProperties([
				{join: "s399", opacity: 0},
				{join: "l" + iTunesGUI.joins.listAlbums, opacity: 0},
				{join: "l" + iTunesGUI.joins.listArtists, opacity: 0},
				{join: "l" + iTunesGUI.joins.listArtistsSongs, opacity: 1},
				{join: "l" + iTunesGUI.joins.listSongs, opacity: 0},
				{join: "a1520", opacity: 0},
				{join: "l" + iTunesGUI.joins.listPlaylistSongs, opacity: 0},
				{join: "l" + iTunesGUI.joins.listSearch, opacity: 0},
			], 0.0, 0.0);
		});
	},
	
	
	/*
	** We want to slide to a letter in the list of songs
	*/
	listSongsSlideTo: function(sliderVal) {
		CF.getJoin("a1520", function(j, v, t) {
			// Retrieve letter
			letter = String.fromCharCode(96 + parseInt(sliderVal)).toUpperCase();
			if (sliderVal == 27)
				letter = "#";
			// Retrieve list
			listLetters = t["[letters]"].split(';');
			for (var index in listLetters) {
				var cletter = listLetters[index].split(":");
				if (cletter[0] == letter) {
					CF.listScroll("l" + iTunesGUI.joins.listSongs, parseInt(cletter[1]), CF.TopPosition, false);
				}
			}
		});
	},
	
	
	/*
	** Function called when we do a research
	*/
	searchAction: function(join, value, tokens) {
		if (value != "") {
			// We display good playlist
			CF.setProperties([
				{join: "s399", opacity: 1},
				{join: "l" + iTunesGUI.joins.listAlbums, opacity: 0},
				{join: "l" + iTunesGUI.joins.listArtists, opacity: 0},
				{join: "l" + iTunesGUI.joins.listArtistsSongs, opacity: 0},
				{join: "l" + iTunesGUI.joins.listSongs, opacity: 0},
				{join: "a1520", opacity: 0},
				{join: "l" + iTunesGUI.joins.listPlaylistSongs, opacity: 0},
				{join: "l" + iTunesGUI.joins.listSearch, opacity: 0},
			], 0.0, 0.0);

			CF.getJoin("l" + iTunesGUI.joins.listPlaylist + ":0:d412", function(j, v, t) {
				// We ask for default list
				iTunesRemote.requestAlbums(t["[id]"], "", value, "album", function(albums) {
					iTunesRemote.requestArtists(value, function (artists) {
						iTunesRemote.requestSongs(t["[id]"], value, function(songs) {
							// We init variables
							var list_entries = new Array();
							// We create list
							CF.setJoin("l" + iTunesGUI.joins.listSearch, "0x");
							
							// Albums title
							entry = {
								title: true,
								s1601: albums.length + " album" + ((albums.length > 1) ? "s" : ""),
							}
							list_entries.push(entry);
							// Albums entry
							for (var index in albums) {
								album = albums[index];
								entry = {
									subpage: "iTunesSearchItemAlbum",
									s1611: {
										value: album.artwork,
										tokens: {
											"HTTP:Client-DAAP-Version": 3.10,
											"HTTP:Viewer-Only-Client": 1
										}
									},
									s1612: album.album,
									s1613: album.artist,
									d1614: {
										tokens: {
											"[id]": album.id
										}
									}
								};
								list_entries.push(entry);
							}
							
							// Artists title
							entry = {
								title: true,
								s1601: artists.length + " artiste" + ((artists.length > 1) ? "s" : ""),
							}
							list_entries.push(entry);
							// Artists entry
							for (var index in artists) {
								artist = artists[index];
								entry = {
									subpage: "iTunesSearchItemArtist",
									s1621: {
										value: artist.artwork,
										tokens: {
											"HTTP:Client-DAAP-Version": 3.10,
											"HTTP:Viewer-Only-Client": 1
										}
									},
									s1622: artist.artist,
									d1624: {
										tokens: {
											"[artist]": artist.artist
										}
									}
								};
								list_entries.push(entry);
							}
							
							// Songs title
							entry = {
								title: true,
								s1601: songs.length + " chanson" + ((songs.length > 1) ? "s" : ""),
							}
							list_entries.push(entry);
							// Songs entry
							for (var index in songs) {
								song = songs[index];
								entry = {
									subpage: "iTunesSearchItemSong",
									s1631: {
										value: song.artwork,
										tokens: {
											"HTTP:Client-DAAP-Version": 3.10,
											"HTTP:Viewer-Only-Client": 1
										}
									},
									s1632: song.title,
									s1633: song.artist,
									d1634: {
										tokens: {
											"[query]": value,
											"[index]": song.index
										}
									}
								};
								list_entries.push(entry);
							}
														
							// We add data to the list
							CF.listAdd("l" + iTunesGUI.joins.listSearch, list_entries);					
					
							// We display good playlist
							CF.setProperties([
								{join: "s399", opacity: 0},
								{join: "l" + iTunesGUI.joins.listSearch, opacity: 1},
							], 0.0, 0.0);
							
							// We hide search bar
							iTunesGUI.hideSearchPage();
						});
					});
				});
					
				// We show buttons
				iTunesGUI.hidePlaylistButtons();
			});
		}
	},
	
	
	/*
	** Function called when we receive an update status form iTunes
	*/
	iTunesStatusUpdate: function(state) {
		// We update artwork ?
		if (state.artwork == "update")
			iTunesRemote.updateNowPlayingArtwork("s601", 163);
		if (state.artwork == "clear")
			CF.setJoin("s601", "transparent.png");
			
		// We select repeat theme
		switch (state.repeat) {
			case "all":
				CF.setProperties({join: "d607", theme: "BtnRepeatOn"});
				break;
			case "single":
				CF.setProperties({join: "d607", theme: "BtnRepeatOn1"});
				break;
			default:
				CF.setProperties({join: "d607", theme: "BtnRepeatOff"});
		}
		// We update data
		if (state.track == undefined) {
			CF.setJoins([
				{ join:"s602", value: "" },   // Album and song
				{ join:"s907", value: "" },   // Artist
				{ join:"s603", value: "00:00" },   // Progress
				{ join:"a604", value: 0 },    // Progress
				{ join:"s605", value: "00:00" },   // Remain
				{ join:"d608", value: ((state.playstatus == "playing") ? 1 : 0) },   // Play Pause
				{ join:"d606", value: ((state.shuffle == "on") ? 1 : 0) },   // Shuffle
			]);
		} else {
			CF.setJoins([
				{ join:"s602", value: state.album+" - "+state.track },   // Album and song
				{ join:"s907", value: "Ecoute: "+state.artist },   // Artist
				{ join:"s603", value: iTunesGUI.convertMillisecondsToMinute(state.progressTotal - state.progressRemain) },   // Progress
				{ join:"a604", value: (state.progressTotal - state.progressRemain) * 65535 / state.progressTotal },   // Progress
				{ join:"s605", value: "-" + iTunesGUI.convertMillisecondsToMinute(state.progressRemain) },   // Remain
				{ join:"d608", value: ((state.playstatus == "playing") ? 1 : 0) },   // Play Pause
				{ join:"d606", value: ((state.shuffle == "on") ? 1 : 0) },   // Shuffle
			]);
		}
	},
	
	/*
	** Function convert milliseconds to a string in minutes and secondes
	*/
	convertMillisecondsToMinute: function(ms) {
		var sec = Math.floor(ms/1000)
		var min = Math.floor(sec/60)
		sec = sec % 60
		return min + ":" + ((sec > 9) ? "" : "0") + sec;
	},
	
	/*
	** Function called when no library selected
	*/
	hideBannerButtons: function() {
		CF.setProperties([
			{join: "d" + (iTunesGUI.joins.pageBanner + 1), opacity: 0},
			{join: "d" + (iTunesGUI.joins.pageBanner + 2), opacity: 0},
			{join: "d" + (iTunesGUI.joins.pageBanner + 4), opacity: 0},
			{join: "d" + (iTunesGUI.joins.pageBanner + 5), opacity: 0},
			{join: "d" + (iTunesGUI.joins.pageBanner + 6), opacity: 0},
		], 0.0 , 0.0, CF.AnimationCurveLinear); 
	},

	/*
	** Function called when playlist selected
	*/
	hidePlaylistButtons: function() {
		CF.setProperties([
			{join: "d" + (iTunesGUI.joins.pageBanner + 4), opacity: 0},
			{join: "d" + (iTunesGUI.joins.pageBanner + 5), opacity: 0},
			{join: "d" + (iTunesGUI.joins.pageBanner + 6), opacity: 0},
		], 0.0 , 0.0, CF.AnimationCurveLinear); 
	},
	
	/*
	** Function called when library selected
	*/
	showBannerButtons: function() {
		CF.setProperties([
			{join: "d" + (iTunesGUI.joins.pageBanner + 1), opacity: 1},
			{join: "d" + (iTunesGUI.joins.pageBanner + 2), opacity: 1},
			{join: "d" + (iTunesGUI.joins.pageBanner + 4), opacity: 1},
			{join: "d" + (iTunesGUI.joins.pageBanner + 5), opacity: 1},
			{join: "d" + (iTunesGUI.joins.pageBanner + 6), opacity: 1},
		], 0.0 , 0.0, CF.AnimationCurveLinear);
		
		// We retrieve the global tokens display for the library
		CF.getJoin(CF.GlobalTokensJoin, function(join, value, tokens) {
			CF.setJoins([
				{join: "d" + (iTunesGUI.joins.pageBanner + 4), value: ((tokens["LibraryDisplay"] == "Albums") ? 1 : 0)},
				{join: "d" + (iTunesGUI.joins.pageBanner + 5), value: ((tokens["LibraryDisplay"] == "Artists") ? 1 : 0)},
				{join: "d" + (iTunesGUI.joins.pageBanner + 6), value: ((tokens["LibraryDisplay"] == "Songs") ? 1 : 0)},
			]);
		});
	},
	
	/*
	** Select main library by 
	*/
	showLibraryBy: function(type) {
		CF.setJoins([
			{join: "d" + (iTunesGUI.joins.pageBanner + 4), value: ((type == "Albums") ? 1 : 0)},
			{join: "d" + (iTunesGUI.joins.pageBanner + 5), value: ((type == "Artists") ? 1 : 0)},
			{join: "d" + (iTunesGUI.joins.pageBanner + 6), value: ((type == "Songs") ? 1 : 0)},
		]);
		CF.setToken(CF.GlobalTokensJoin, "LibraryDisplay", type);
		CF.getJoin("l" + iTunesGUI.joins.listPlaylist + ":0:d412", function(j, v, t) {
			iTunesGUI.selectBDDItem("music", t["[id]"], "");
		});
	},
	
	/*
	** Show/Hide search subpage
	*/
	showhideSearchPage: function() {
		CF.getProperties("d" + iTunesGUI.joins.pageSearch, function(j) {
			if (j.y == 84) {
				CF.setProperties({join: "d" + iTunesGUI.joins.pageSearch, y: 0}, 0, 0.5, CF.AnimationCurveLinear, function() {
					CF.setJoin("d" + iTunesGUI.joins.pageSearch, 0);
					iTunesGUI.clearSearchField();
				});
			} else {
				CF.setJoin("d" + iTunesGUI.joins.pageSearch, 1);
				CF.setProperties({join: "d" + iTunesGUI.joins.pageSearch, y: 84}, 0, 0.5, CF.AnimationCurveEaseOut);
			}
		});
	},
	
	/*
	** Hide search subpage
	*/
	hideSearchPage: function() {
		CF.setProperties({join: "d" + iTunesGUI.joins.pageSearch, y: 0}, 0, 0.5, CF.AnimationCurveLinear, function() {
			CF.setJoin("d" + iTunesGUI.joins.pageSearch, 0);
			iTunesGUI.clearSearchField();
		});
	},
	
	/*
	** Clear search field
	*/
	clearSearchField: function() {
		CF.setJoin("s701", "");
	},
	
	/*
	** Play/Pause button
	*/
	playPauseBtn: function(join) {
		iTunesRemote.iTunesActions("playpause");
	},
	
	/*
	** Back button
	*/
	backBtn: function(join) {
		iTunesRemote.iTunesActions("back");
	},
	
	/*
	** Next button
	*/
	nextBtn: function(join) {
		iTunesRemote.iTunesActions("next");
	},
	
	/*
	** Repeat button
	*/
	repeatBtn: function(join) {
		iTunesRemote.iTunesActions("repeat");
	},
	
	/*
	** Shuffle button
	*/
	shuffleBtn: function(join) {
		iTunesRemote.iTunesActions("shuffle");
	},
	
	/*
	** Define the value of the progress bar
	*/
	setProgress: function(data) {
		iTunesRemote.iTunesActions("seek", data);
	},
};

// Add the module to iViewer
CF.modules.push({name: "iTunesGUI", object:iTunesGUI, setup:iTunesGUI.setup});