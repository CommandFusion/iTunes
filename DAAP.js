/*
   _____                    _____  
  |  __ \   /\        /\   |  __ \ 
  | |  | | /  \      /  \  | |__) |
  | |  | |/ /\ \    / /\ \ |  ___/ 
  | |__| / ____ \  / ____ \| |     
  |_____/_/    \_\/_/    \_\_|     
                    JavaScript module for CommandFusion

==================================================================

  AUTHORS:  Arnault Raes
  CONTACT:  support@commandfusion.com
  URL:      www.commandfusion.com/scripting/examples/iTunes
  VERSION:  v0.1
  LAST MAJ: 13 December 2011

==================================================================

  INTERFACES:
	1. To decode a binary string from iTunes :
		X = DAAP.decode("mlog...");
	X is an object like :
		mlog --+
			   |-- mstt 4 000000c8 == 200 
			   |-- mlid 4 648a861f == 1686799903 # our new session-id
	
	2. To encode an objet to a binary string (DAAP Format)
	Y = DAAP.encode({
		mlog: {
			mstt: 200,
			mlid: 1686799903
		}
	});
	Y is something like : mlog...
  
==================================================================
*/

var DAAP = {
	/*
	** Convert a DAAP string to a readable object
	*/
	decode: function(data) {
		// Decoded object
		var obj = {};
		
		// Code of content
		var index = data.substr(0, 4);
		code = this.contentCodes[index];
		if (code == undefined) {
			CF.log("DAAP Decode: unknow code '" + index + "'");
			return obj;
		}

		// Length of content
		var length = this.decodeInt(data.substr(4, 4));
		if (length > data.length)
			length = data.length;

		// Content
		var data = data.substr(8, length);
		obj[index] = this.decodeNode(data, code);
		return obj;
	},
	
	/*
	** Decode a node
	*/
	decodeNode: function(data, code) {
		switch (code.type) {
			case 'int':
			case 'date':
				return this.decodeInt(data);
				
			case 'short':
				return this.decodeShort(data);
				
			case 'long':
				return this.decodeLong(data);
				
			case 'string':
				return this.decodeString(data);
				
			case 'byte':
				return this.decodeByte(data);
				
			case 'version':
				return this.decodeVersion(data);

			case 'hex':
				return this.decodeHex(data);
				
			case 'list':
				var obj = {};
				while (data.length > 0) {
					// Code of content
					var index = data.substr(0, 4);
					fieldCode = this.contentCodes[index];

					// Length of content
					var length = this.decodeInt(data.substr(4, 4));
					if (length > data.length)
						length = data.length;

					// Content
					var content = data.substr(8, length);
					data = data.substr(8+length);
					
					// If code is unknow we ignore it
					if (fieldCode == undefined) {
						CF.log("DAAP Decode, code unknow : " + index + " (" + length + ")");
						continue;
					}
					
					// If an object with the same code exist, we create an array
					if (obj[index] != undefined) {
						if (typeof(obj[index]) != 'object' || (typeof(obj[index]) == 'object' && obj[index].length == undefined)) {
							var temp = obj[index];
							obj[index] = new Array();
							obj[index].push(temp);
						}
						obj[index].push(this.decodeNode(content, fieldCode));
					} else {
						obj[index] = this.decodeNode(content, fieldCode);
					}
				}
				return obj;
		}
		// If type code is unkown
		return data;
	},
	
	/*
	** Decode a byte
	*/
	decodeByte: function(str) {
		var value = 0;
		value = parseInt(str.charCodeAt(0));
		return value;
	},
	
	/*
	** Decode an integer
	*/
	decodeInt: function(str) {
		var value = 0;
		value = parseInt(str.charCodeAt(0));
		value = value <<8;
		value = value + parseInt(str.charCodeAt(1));
		value = value << 8;
		value = value + parseInt(str.charCodeAt(2));
		value = value << 8;
		value = value + parseInt(str.charCodeAt(3));
		return value;
	},
	
	/*
	** Decode a short
	*/
	decodeShort: function(str) {
		var value = 0;
		value = parseInt(str.charCodeAt(0));
		value = value << 8;
		value = value + parseInt(str.charCodeAt(1));
		return value;
	},
	
	/*
	** Decode a long
	*/
	decodeLong: function(str) {
		var BigInt = CFBigInt("0x" + this.decodeHex(str));
		return BigInt.toStringBase(10);
	},

    /*
	** Converts a UTF-8 encoded string to ISO-8859-1  
	*/
	decodeString:function(str_data) {
		var tmp_arr = [], i = 0, ac = 0, c1 = 0, c2 = 0, c3 = 0;
		str_data += '';
		while (i < str_data.length) {
			c1 = str_data.charCodeAt(i);
			if (c1 < 128) {
				tmp_arr[ac++] = String.fromCharCode(c1);
				i++;
			} else if (c1 > 191 && c1 < 224) {
				c2 = str_data.charCodeAt(i + 1);
				tmp_arr[ac++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
				i += 2;
			} else {
				c2 = str_data.charCodeAt(i + 1);
				c3 = str_data.charCodeAt(i + 2);
				tmp_arr[ac++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
		return tmp_arr.join('');
	},
	
	/*
	** Decode a version
	*/
	decodeVersion: function(str) {
		var strVal = '';
		for (i=0; i<str.length; i++)
			strVal += "" + str.charCodeAt(i);
		return parseInt(strVal.substr(0,2))+"."+strVal.substr(2,1)+"."+strVal.substr(3,1);
	},
	
	/*
	** Decode an hexadecimal
	*/
	decodeHex: function(str) {
		var strVal = '';
		for (i=0; i<str.length; i++) {
			var val = str.charCodeAt(i);

			var num = (val >> 4);
			num = num + (( num > 9) ? 55 : 48);
			var first = String.fromCharCode(num);

			num = (val % 16);
			num = num + (( num > 9) ? 55 : 48);
			var second = String.fromCharCode(num);
                        
			strVal += first + second;
		}
		return strVal;
	},
	
	
	/*
	** Convert a readable object to a DAAP string
	*/
	encode: function(object) {
		var strOutput = "";
		for (var index in object) {
			// Code of content
			code = this.contentCodes[index];
			if (code == undefined) {
				CF.log("DAAP Encode, code unknow : " + index);
				continue;
			}
			
			// We encode depending on the type
			switch (code.type) {
				case 'int':
				case 'date':
					strOutput += index + this.encodeInt(4) + this.encodeInt(object[index]);
					break;

				case 'short':
					strOutput += index + this.encodeInt(2) + this.encodeShort(object[index]);
					break;
					
				case 'long':
					strOutput += index + this.encodeInt(8) + this.encodeLong(object[index]);
					break;
					
				case 'string':
					strOutput += index + this.encodeInt(object[index].length) + object[index];
					break;
					
				case 'byte':
					strOutput += index + this.encodeInt(1) + this.encodeByte(object[index]);
					break;
					
				case 'version':
					strOutput += index + this.encodeInt(4) + this.encodeVersion(object[index]);
					break;

				case 'hex':
					var data = this.encodeHex(object[index]);
					strOutput += index + this.encodeInt(data.length) + data;
					break;
					
				case 'list':
					var data = this.encode(object[index]);
					strOutput += index + this.encodeInt(data.length) + data;
					break;
					
				case 'null':
					strOutput += index + this.encodeInt(0);
					break;
			}
		}
		return strOutput;
	},

	/*
	** Encode Short to DAAP Format
	*/
	encodeShort: function(data) {
		output = String.fromCharCode(data & (255));
		data = data >> 8;
		output = String.fromCharCode(data & (255)) + output;
		return output;
	},

	/*
	** Encode Int to DAAP Format
	*/
	encodeInt: function(data) {
		output = String.fromCharCode(data & (255));
		data = data >> 8;
		output = String.fromCharCode(data & (255)) + output;
		data = data >> 8;
		output = String.fromCharCode(data & (255)) + output;
		data = data >> 8;
		output = String.fromCharCode(data & (255)) + output;
		return output;
	},

	/*
	** Encode Long to DAAP Format
	*/
	encodeLong: function(data) {
		var BigInt = CFBigInt(data);
		return this.encodeHex(BigInt.toStringBase(16));
	},
	
	/*
	** Encode Byte to DAAP Format
	*/	
	encodeByte: function(data) {
		output = String.fromCharCode(data & (255));
		return output;
	},
	
	/*
	** Encode version to DAAP Format
	*/
	encodeVersion: function(data) {
		var elems = data.split('.');
		var output = this.encodeShort(parseInt(elems[0]));
		output += this.encodeByte(parseInt(elems[1]));
		output += this.encodeByte(parseInt(elems[2]));
		return output;
	},
	
	/*
	** Encode hexadecimal to DAAP format
	*/
	encodeHex: function(data) {
		output = "";
		data = data.toUpperCase();
		for (i=0; i<data.length; i++) {
			var valueFirst = data.charCodeAt(i);
			valueFirst = valueFirst - ((valueFirst > 64) ? 55 : 48);
			var valueSecond = data.charCodeAt(++i);
			valueSecond = valueSecond - ((valueSecond > 64) ? 55 : 48);
			var value = valueFirst * 16 + valueSecond;
			output = output + String.fromCharCode(value);
		}
		return output;
	},

	
	/*
	** List of DAAP codes
	*/
	contentCodes: {
		mstt: { type: 'int',    name: 'dmap.status' },
		miid: { type: 'int',    name: 'dmap.itemid' },
		minm: { type: 'string', name: 'dmap.itemname' },
		mikd: { type: 'byte',   name: 'dmap.itemkind' },
		mper: { type: 'long',   name: 'dmap.persistentid' },
		mcon: { type: 'list',   name: 'dmap.container' },
		mcti: { type: 'int',    name: 'dmap.containeritemid' },
		mpco: { type: 'int',    name: 'dmap.parentcontainerid' },
		msts: { type: 'string', name: 'dmap.statusstring' },
		mimc: { type: 'int',    name: 'dmap.itemcount' },
		mctc: { type: 'int',    name: 'dmap.containercount' },
		mrco: { type: 'int',    name: 'dmap.returnedcount' },
		mtco: { type: 'int',    name: 'dmap.specifiedtotalcount' },
		mlcl: { type: 'list',   name: 'dmap.listing', isArray: true },
		mlit: { type: 'list',   name: 'dmap.listingitem' },
		mbcl: { type: 'list',   name: 'dmap.bag' },
		mdcl: { type: 'list',   name: 'dmap.dictionary', isArray: true },
		msrv: { type: 'list',   name: 'dmap.serverinforesponse' },
		msau: { type: 'byte',   name: 'dmap.authenticationmethod' },
		mslr: { type: 'byte',   name: 'dmap.loginrequired' },
		mpro: { type: 'version',name: 'dmap.protocolversion' },
		apro: { type: 'version',name: 'dmap.protocolversion' },
		msal: { type: 'byte',   name: 'dmap.supportsautologout' },
		msas: { type: 'byte',   name: 'dmap.authenticationschemes' },
		msup: { type: 'byte',   name: 'dmap.supoortsupdate' },
		mspi: { type: 'byte',   name: 'dmap.supportspersistentids' },
		msex: { type: 'byte',   name: 'dmap.supportsextensions' },
		msbr: { type: 'byte',   name: 'dmap.supportsbrowse' },
		msqy: { type: 'byte',   name: 'dmap.supportsquery' },
		msix: { type: 'byte',   name: 'dmap.supportsindex' },
		msrs: { type: 'byte',   name: 'dmap.supportsresolve' },
		mstm: { type: 'int',    name: 'dmap.timeoutinterval' },
		msdc: { type: 'int',    name: 'dmap.databasecount' },
		mstc: { type: 'date',   name: 'dmap.utctime' },
		msto: { type: 'int',    name: 'dmap.utcoffset' }, 
		mccr: { type: 'list',   name: 'dmap.contentcodesresponse' },
		mcnm: { type: 'string', name: 'dmap.contentcodesnumber' },
		mcna: { type: 'string', name: 'dmap.contentcodesname' },
		mcty: { type: 'short',  name: 'dmap.contentcodestype' },
		mlog: { type: 'list',   name: 'dmap.loginresponse' },
		mlid: { type: 'int',    name: 'dmap.sessionid' },
		mupd: { type: 'list',   name: 'dmap.updateresponse' },
		msur: { type: 'int',    name: 'dmap.serverrevision' },
		muty: { type: 'byte',   name: 'dmap.updatetype' },
		mudl: { type: 'list',   name: 'dmap.deletedidlisting' },
		avdb: { type: 'list',   name: 'dmap.serverdatabases' },
		abro: { type: 'list',   name: 'dmap.databasebrowse' },
		abal: { type: 'list',   name: 'dmap.browsealbumlisting', isArray: true },
		abar: { type: 'list',   name: 'dmap.browseartistlisting', isArray: true },
		abcp: { type: 'list',   name: 'dmap.browsecomposerlisting', isArray: true },
		abgn: { type: 'list',   name: 'dmap.browsegenrelisting', isArray: true },
		agal: { type: 'list',   name: 'dmap.groupalbum' },
		agar: { type: 'list',   name: 'dmap.groupartist' },
		adbs: { type: 'list',   name: 'dmap.databasesongs' },
		asal: { type: 'string', name: 'daap.songalbum' },
		asar: { type: 'string', name: 'daap.songartist' },
		asbt: { type: 'short',  name: 'daap.songbeatsperminute' },
		asbr: { type: 'short',  name: 'daap.songbitrate' },
		ascm: { type: 'string', name: 'daap.songcomment' },
		asco: { type: 'byte',   name: 'daap.songcompilation' },
		asda: { type: 'date',   name: 'daap.songdateadded' },
		asdm: { type: 'date',   name: 'daap.songdatemodified' },
		asdc: { type: 'short',  name: 'daap.songdisccount' },
		asdn: { type: 'short',  name: 'daap.songdiscnumber' },
		asdb: { type: 'byte',   name: 'daap.songdisabled' },
		aseq: { type: 'string', name: 'daap.songeqpreset' },
		asfm: { type: 'string', name: 'daap.songformat' },
		asgn: { type: 'string', name: 'daap.songgenre' },
		asdt: { type: 'string', name: 'daap.songdescription' },
		asrv: { type: 'byte',   name: 'daap.songrelativevolume' },
		assr: { type: 'int',    name: 'daap.songsamplerate' },
		assz: { type: 'int',    name: 'daap.songsize' },
		asst: { type: 'int',    name: 'daap.songstarttime' },
		assp: { type: 'int',    name: 'daap.songstoptime' },
		astm: { type: 'int',    name: 'daap.songtime' },
		astc: { type: 'short',  name: 'daap.songtrackcount' },
		astn: { type: 'short',  name: 'daap.songtracknumber' },
		asur: { type: 'byte',   name: 'daap.songuserrating' },
		asyr: { type: 'short',  name: 'daap.songyear' },
		asdk: { type: 'byte',   name: 'daap.songdatakind' },
		asul: { type: 'string', name: 'daap.songdataurl' },
		aply: { type: 'list',   name: 'daap.databaseplaylists' },
		abpl: { type: 'byte',   name: 'daap.baseplaylist' },
		apso: { type: 'list',   name: 'daap.playlistsongs' },
		prsv: { type: 'list',   name: 'dmap.resolve' },
		arif: { type: 'list',   name: 'dmap.resolveinfo' },
		ated: { type: 'short',  name: 'daap.ated' },
		
		cmst: { type: 'list',   name: 'dacp.status' },
		cmpa: { type: 'list',   name: 'dacp.pairinganswer' }, 
		cmpg: { type: 'hex',    name: 'dacp.pairingguid' },
		cmnm: { type: 'string', name: 'dacp.devicename' },
		cmty: { type: 'string', name: 'dacp.devicetype' },
		cmsr: { type: 'int',    name: 'dacp.serverrevision' },
		caps: { type: 'byte',   name: 'dacp.playstatus' },
		cash: { type: 'byte',   name: 'dacp.shufflestate' },
		carp: { type: 'byte',   name: 'dacp.repeatstate' },
		cavc: { type: 'byte',   name: 'dacp.unknown' },
		caas: { type: 'int',    name: 'dacp.unknown' },
		caar: { type: 'int',    name: 'dacp.unknown' },
		canp: { type: 'hex',    name: 'dacp.nowplayingguid' },
		cann: { type: 'string', name: 'dacp.nowplayingname' },
		cana: { type: 'string', name: 'dacp.nowplayingartist' },
		canl: { type: 'string', name: 'dacp.nowplayingalbum' },
		cang: { type: 'string', name: 'dacp.unknown' },
		asai: { type: 'long',   name: 'daap.songalbumid' },
		cmmk: { type: 'int',    name: 'dacp.unknown' },
		cant: { type: 'int',    name: 'dacp.remaininglength' },
		cast: { type: 'int',    name: 'dacp.totalength' },
		cmvo: { type: 'int',    name: 'dmcp.volume' },
		caci: { type: 'list',   name: 'dacp.controllers' },
		cmik: { type: 'byte',   name: 'dacp.cmik' },
		cmsp: { type: 'byte',   name: 'dacp.supportsplayback' },  /* guess !*/
		cmsv: { type: 'byte',   name: 'dacp.supportsvolume' },    /* guess !*/
		cass: { type: 'byte',   name: 'dacp.surroundsound' },     /* guess! */
		casu: { type: 'byte',   name: 'dacp.casu' },
		ceSG: { type: 'byte',   name: 'dacp.ceSG' },
		casp: { type: 'list',   name: 'dacp.speakers' },
		caia: { type: 'byte',   name: 'dacp.isactive' },
		msml: { type: 'list',   name: 'dmap.msml' },
		msma: { type: 'long',   name: 'dmap.msma' },
		cmgt: { type: 'list',   name: 'dmcp.getproperty' },
		aeSV: { type: 'version',name: 'com.apple.itunes.music-sharing-version' },
		aeFP: { type: 'byte',   name: 'aeFP' },
		msed: { type: 'byte',   name: 'dmap.editable' },		
		aeNV: { type: 'int',    name: 'com.apple.itunes.norm-volume' },
		aeSP: { type: 'byte',   name: 'com.apple.itunes.smart-playlist' },
		aeHV: { type: 'byte',   name: 'com.apple.itunes.has-video' },
		asaa: { type: 'string', name: 'daap.songalbumartist' },
		aeGG: { type: 'int',    name: 'com.apple.itunes.gapless-enc-dur' },
		aeGU: { type: 'long',   name: 'com.apple.itunes.gapless-dur' },
		aeGR: { type: 'long',   name: 'com.apple.itunes.gapless-resy' },
		aeGE: { type: 'int',    name: 'com.apple.itunes.gapless-enc-del' },
		asgp: { type: 'byte',   name: 'daap.songgapless' },
		aePS: { type: 'byte',   name: 'com.apple.itunes.special-playlist' },
		ased: { type: 'short',  name: 'daap.songextradata' },
		asdr: { type: 'date',   name: 'daap.songdatereleased' },
		asdp: { type: 'date',   name: 'daap.songdatepurchased' },
		ashp: { type: 'byte',   name: 'daap.songhasbeenplayed' },
		assn: { type: 'string', name: 'daap.sortname' },
		assa: { type: 'string', name: 'daap.sortartist' },
		assl: { type: 'string', name: 'daap.sortalbumartist' },
		assu: { type: 'string', name: 'daap.sortalbum' },
		assc: { type: 'string', name: 'daap.sortcomposer' },
		asss: { type: 'string', name: 'daap.sortseriesname' },
		asbk: { type: 'byte',   name: 'daap.bookmarkable' },
		asbo: { type: 'int',    name: 'daap.songbookmark' },
		aspu: { type: 'string', name: 'daap.songpodcasturl' },
		aeCR: { type: 'string', name: 'com.apple.itunes.content-rating' },
		asls: { type: 'long',   name: 'daap.songlongsize' },
		aeSG: { type: 'byte',   name: 'com.apple.itunes.saved-genius' },
		meds: { type: 'int',    name: 'dmap.editcommandssupported' },
		aeHD: { type: 'byte',   name: 'com.apple.itunes.is-hd-video' },
		ceJV: { type: 'int',    name: 'com.apple.itunes.jukebox-vote' },
		ceJC: { type: 'byte',   name: 'com.apple.itunes.jukebox-client-vote' },
		ceJI: { type: 'int',    name: 'com.apple.itunes.jukebox-current' },
		ceJS: { type: 'short',  name: 'com.apple.itunes.jukebox-score' },
		aeSE: { type: 'long',   name: 'com.apple.itunes.store-pers-id' },
		aeXD: { type: 'string', name: 'com.apple.itunes.xid' },
		aeMK: { type: 'int',    name: 'com.apple.itunes.extended-media-kind' },
		ceWM: { type: 'null',   name: 'ceWM' },
		ceVO: { type: 'byte',   name: 'ceVO' },
		asgr: { type: 'short',  name: 'daap.supportsgroups' },
		asse: { type: 'long',   name: 'asse' },
		aeMQ: { type: 'byte',   name: 'aeMQ' },
		aeFR: { type: 'byte',   name: 'aeFR' },
		aeTr: { type: 'byte',   name: 'aeTr' },
		aeSL: { type: 'byte',   name: 'aeSL' },
		aeSR: { type: 'byte',   name: 'aeSR' },
		aeSX: { type: 'long',   name: 'aeSX' },
		ppro: { type: 'version',name: 'ppro' },
		cafs: { type: 'byte',   name: 'dacp.fullscreen' },
		cavs: { type: 'byte',   name: 'dacp.visualizer' },
		ceGS: { type: 'byte',   name: 'dacp.geniusSelectable' },
		cafe: { type: 'byte',   name: 'cafe' },
		cave: { type: 'byte',   name: 'cave' },
		mshl: { type: 'int',    name: 'dmap.sortingheaderlisting' },		
	}	
};

// Add the module to iViewer
CF.modules.push({name: "DAAP", object:DAAP});