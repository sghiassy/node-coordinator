(function () {
    "use strict";

    require('require-kiss');

    var utm = require('./utm'),
        CONSTANTS = require('./constants');

    // convert lower-case characters to upper case, remove space delimeters, separate string into parts
    function parseUSNG_str(usngStr_input, parts)
    {
        var j = 0,
            k,
            usngStr = [],
            usngStr_temp = [];

        usngStr_temp = usngStr_input.toUpperCase();

        // put usgn string in 'standard' form with no space delimiters
        usngStr = usngStr_temp.replace(/%20/g, "");
        usngStr = usngStr_temp.replace(/ /g, "");

        if (usngStr.length < 7) {
            alert("This application requires minimum USNG precision of 10,000 meters");
            return 0;
        }

        // break usng string into its component pieces
        parts.zone = usngStr.charAt(j) * 10 + usngStr.charAt(j + 1); j += 2;
        parts.zoneLetter = usngStr.charAt(j); j+= 1;
        parts.sq1 = usngStr.charAt(j); j += 1;
        parts.sq2 = usngStr.charAt(j); j += 1;

        parts.precision = (usngStr.length-j) / 2;
        parts.east='';
        parts.north='';
        for (k = 0; k < parts.precision; k += 1) {
            parts.east += usngStr.charAt(j);
            j += 1;
        }

        if (usngStr[j] === " ") {
            j += 1;
        }
        for (k = 0; k < parts.precision; k += 1) {
            parts.north += usngStr.charAt(j);
            j += 1;
        }
    }

    /*
     * Converts USNG to UTM.
     *
     * USNGtoUTM(zone, zoneLetter, sq1, sq2, east, north, ret) 
     * Expected Input args:
     *     zone: Zone (integer), eg. 18
     *     zoneLetter: Zone letter, eg S
     *     sq1:  1st USNG square letter, eg U
     *     sq2:  2nd USNG square Letter, eg J 
     *     east:  Easting digit string, eg 4000
     *     north:  Northing digit string eg 4000
     *     ret:  saves zone, zoneLetter,Easting and Northing as properties ret 
     */ 
    function usngToUtm(zone, zoneLetter, sq1, sq2, east, north, ret) { 
        var zoneBase,
            segBase,
            eSqrs,
            appxEast,
            appxNorth,
            letNorth,
            nSqrs,
            zoneStart,
            USNGSqEast = "ABCDEFGHJKLMNPQRSTUVWXYZ";

        //Starts (southern edge) of N-S zones in millons of meters
        zoneBase = [1.1,2.0,2.9,3.8,4.7,5.6,6.5,7.3,8.2,9.1,   0, 0.8, 1.7, 2.6, 3.5, 4.4, 5.3, 6.2, 7.0, 7.9];

        segBase = [0,2,2,2,4,4,6,6,8,8,   0,0,0,2,2,4,4,6,6,6];  //Starts of 2 million meter segments, indexed by zone 

        // convert easting to UTM
        eSqrs = USNGSqEast.indexOf(sq1);          
        appxEast = 1 + eSqrs % 8; 

        // convert northing to UTM
        letNorth = "CDEFGHJKLMNPQRSTUVWX".indexOf(zoneLetter);
        if (zone % 2) { //odd number zone
            nSqrs = "ABCDEFGHJKLMNPQRSTUV".indexOf(sq2);
        } else { // even number zone
            nSqrs = "FGHJKLMNPQRSTUVABCDE".indexOf(sq2); 
        }

        zoneStart = zoneBase[letNorth];
        appxNorth = Number(segBase[letNorth]) + nSqrs / 10;
        if ( appxNorth < zoneStart) {
            appxNorth += 2;
        }

        ret.N = appxNorth * 1000000 + Number(north) * Math.pow(10, 5 - north.length);
        ret.E = appxEast * 100000 + Number(east) * Math.pow(10, 5 - east.length);
        ret.zone = zone;
        ret.letter = zoneLetter;

        return;
    }

    // parse a USNG string and feed results to USNGtoUTM, then the results of that to UTMtoLL

        // latlon is a 2-element array declared by calling routine
    function usngToLatLong(usngStr_input, latlon) {
        var usngp = {},
            coords = {};

        parseUSNG_str(usngStr_input, usngp);

        // convert USNG coords to UTM; this routine counts digits and sets precision
        usngToUtm(usngp.zone, usngp.zoneLetter, usngp.sq1, usngp.sq2, usngp.east, usngp.north, coords);

        // southern hemisphere case
        if (usngp.zoneLetter < 'N') {
            coords.N -= CONSTANTS.NORTHING_OFFSET;
        }

        utm.toLatLong(coords.N, coords.E, usngp.zone, coords);
        latlon[0] = coords.lat;
        latlon[1] = coords.lon;
    }

    // checks a string to see if it is valid USNG;
    //    if so, returns the string in all upper case, no delimeters
    //    if not, returns 0
    function isUsng(inputStr) {
        var usngStr = [],
            strregexp;

       // convert all letters to upper case
       usngStr = inputStr.toUpperCase();
     
       // get rid of space delimeters
       usngStr = usngStr.replace(/%20/g, "");
       usngStr = usngStr.replace(/ /g, "");

       if (usngStr.length > 15) {
          return 0;
       }

       strregexp = new RegExp("^[0-9]{2}[CDEFGHJKLMNPQRSTUVWX]$");
       if (usngStr.match(strregexp)) {
          alert("Input appears to be a UTM zone...more precision is required to display a correct result.");
          return 0;
       }

       strregexp = new RegExp("^[0-9]{2}[CDEFGHJKLMNPQRSTUVWX][ABCDEFGHJKLMNPQRSTUVWXYZ][ABCDEFGHJKLMNPQRSTUV]([0-9][0-9]){0,5}");
       if (!usngStr.match(strregexp)) {
          return 0;
       }

       if (usngStr.length < 7) {
          alert(usngStr+" Appears to be a USNG string, but this application requires precision of at least 10,000 meters");
          return 0;
       }

       // all tests passed...return the upper-case, non-delimited string
       return usngStr;

    }

    function getConverter (outputType) {
        var fn;

        switch (outputType.toLowerCase()) {
            case 'utm':
                fn = usngToUtm;
                break;
            case 'latlong':
                fn = usngToLatLong;
                break;
        }

        return fn;
    }

    module.exports.toUtm = usngToUtm;
    module.exports.toLatLong = usngToLatLong;
    module.exports.isUsng = isUsng;
    module.exports.getConverter = getConverter;

    provide('usng', module.exports);
}());