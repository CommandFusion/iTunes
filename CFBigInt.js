/*
    _____ ______ ____  _       _____       _   
   / ____|  ____|  _ \(_)     |_   _|     | |  
  | |    | |__  | |_) |_  __ _  | |  _ __ | |_ 
  | |    |  __| |  _ <| |/ _` | | | | '_ \| __|
  | |____| |    | |_) | | (_| |_| |_| | | | |_ 
   \_____|_|    |____/|_|\__, |_____|_| |_|\__|
                          __/ |   JavaScript module 
                         |___/    for CommandFusion

==================================================================

  AUTHORS:  Arnault Raes
  CONTACT:  support@commandfusion.com
  URL:      www.commandfusion.com/scripting/examples/iTunes
  VERSION:  v0.1
  LAST MAJ: 13 December 2011

==================================================================

  INTERFACES:
	x = CFBigInt("1234567890123456789012345678901234567890");
	y = CFBigInt("0x123456789abcdef0123456789abcdef0");
	x.toStringBase(16)
	y.toStringBase(10)
  
==================================================================
*/						

var CFBigInt = function(value) {
	/*
	** Variables
	*/
	var self = {
		bigint_sign: true,
		bigint_len: 1,
		bigint_digits: new Array(1)
	};
	
	/*
	** Private function
	** Initialise the variables
	*/
	function init(length, sign) {
		self.bigint_sign = (sign ? true : false);
		self.bigint_len = length;
		self.bigint_digits = new Array(length);
		for (i = 0; i < length; i++)
			self.bigint_digits[i] = 0;
	}
	
	/*
	** Private function
	** Create a bigint
	*/
	function bigint_from_any(x) {
		if (typeof(x) == "string")
			bigint_from_string(x);

		if (typeof(x) == "number")
			bigint_from_int(x);
	}
	
	/*
	** Private function
	** Create a new BigInt from an Int
	*/
	function bigint_from_int(n) {
		var sign, big, i;
		
		if (n < 0) {
			n = -n;
			sign = false;
		} else {
			sign = true;
		}
		n &= 0x7fffffff;

		if (n <= 0xffff) {
			init(1, 1);
			self.bigint_digits[0] = n;
		} else {
			init(2, 1);
			self.bigint_digits[0] = (n & 0xffff);
			self.bigint_digits[1] = ((n>>16) & 0xffff);
		}
	}
	
	/*
	** Private function
	** Create a new BigInt from a string
	*/
	function bigint_from_string(str, base) {
		var str_i, sign, c, len, z, zds, num, i, blen;
		str_i = 0;
		blen = 1;
		sign = true;
		
		// Terminator;
		str += "@";

		// Sign
		if (str.charAt(str_i) == "+") {
			str_i++;
		} else if (str.charAt(str_i) == "-") {
			str_i++;
			sign = false;
		}

		// Null ??
		if (str.charAt(str_i) == "@")
			return null;

		// Detect base if necessary
		if (!base) {
			if (str.charAt(str_i) == "0") {
				c = str.charAt(str_i + 1);
				if (c == "x" || c == "X") {
					base = 16;
				} else if (c == "b" || c == "B") {
					base = 2;
				} else {
					base = 8;
				}
			} else {
				base = 10;
			}
		}

		if (base == 8) {
			while (str.charAt(str_i) == "0")
				str_i++;
			len = 3 * (str.length - str_i);
		} else {
			// base == 10, 2 or 16
			if (base == 16 && str.charAt(str_i) == '0' && (str.charAt(str_i+1) == "x" || str.charAt(str_i+1) == "X"))
				str_i += 2;
			if (base == 2 && str.charAt(str_i) == '0' && (str.charAt(str_i+1) == "b" || str.charAt(str_i+1) == "B"))
				str_i += 2;
			while (str.charAt(str_i) == "0")
				str_i++;
			if (str.charAt(str_i) == "@")
				str_i--;
			len = 4 * (str.length - str_i);
		}

		len = (len>>4)+1;
		init(len, sign);

		while (true) {
			c = str.charAt(str_i++);
			if (c == "@")
				break;
			switch (c) {
				case '0': c = 0; break;
				case '1': c = 1; break;
				case '2': c = 2; break;
				case '3': c = 3; break;
				case '4': c = 4; break;
				case '5': c = 5; break;
				case '6': c = 6; break;
				case '7': c = 7; break;
				case '8': c = 8; break;
				case '9': c = 9; break;
				case 'a': case 'A': c = 10; break;
				case 'b': case 'B': c = 11; break;
				case 'c': case 'C': c = 12; break;
				case 'd': case 'D': c = 13; break;
				case 'e': case 'E': c = 14; break;
				case 'f': case 'F': c = 15; break;
				default: c = base; break;
			}
			if (c >= base)
				break;
			i = 0;
			num = c;
			while (true) {
				while (i<blen) {
					num += self.bigint_digits[i] * base;
					self.bigint_digits[i++] = (num & 0xffff);
					num >>>= 16;
				}
				if (num) {
					blen++;
					continue;
				}
				break;
			}
		}
		
		var len = self.bigint_len;
		var ds = self.bigint_digits;
		while (len-- && !ds[len])
			;
		self.bigint_len = ++len;
	}
	
	/*
	** Convert the BigInt into a string with the good base
	** Supported base : 16, 10, 8 and 2
	*/
	self.toStringBase = function(base) {
		var i, j, hbase, t, ds, c;

		i = self.bigint_len;
		if (i == 0)
			return "0";
		if (i == 1 && !self.bigint_digits[0])
			return "0";

		switch (base) {
			default:
			case 10:
				j = Math.floor((2*8*i*241)/800)+2;
				hbase = 10000;
				break;

			case 16:
				j = Math.floor((2*8*i)/4)+2;
				hbase = 0x10000;
				break;

			case 8:
				j = (2*8*i)+2;
				hbase = 010000;
				break;

			case 2:
				j = (2*8*i)+2;
				hbase = 020;
				break;
		}

		ds = new Array(self.bigint_len);
		for (ia = 0; ia < self.bigint_len; ia++)
			ds[ia] = self.bigint_digits[ia];
		s = "";

		while (i && j) {
			var k = i;
			var num = 0;

			while (k--) {
				num = (num<<16) + ds[k];
				if (num < 0)
					num += 4294967296;
				ds[k] = Math.floor(num / hbase);
				num %= hbase;
			}

			if (ds[i-1] == 0)
				i--;
			k = 4;
			while (k--) {
				c = (num % base);
				s = "0123456789abcdef".charAt(c) + s;
				j -= 1;
				num = Math.floor(num / base);
				if (i == 0 && num == 0)
					break;
			}
		}

		i = 0;
		while(i < s.length && s.charAt(i) == "0")
			i++;
		if (i)
			s = s.substring(i, s.length);
		if (!self.bigint_sign)
			s = "-" + s;
		return s;
	}
	
	// Create our BigInt
	bigint_from_any(value);
	
	return self;
};