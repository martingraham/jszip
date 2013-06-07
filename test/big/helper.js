/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 07/06/13
 * Time: 15:58
 * To change this template use File | Settings | File Templates.
 */
var Helper = new function () {
    this.getText = function (xhr) {
        var textLoaded; // = xhr && (xhr.response || xhr.responseText);

        if (/*$.browser.msie*/ xhr.responseBody !== undefined) {
            console.log ("Having to get binary out of XHR using VBScript in IE.");
            textLoaded = Helper.getBinaryFromXHR (xhr); // calling VBScript if in IE, cos IE is brok
        }
        else {
            textLoaded = xhr && (xhr.response || xhr.responseText);
        }
        return textLoaded;
    };

    // Until JQuery supports binary reads in IE
    this.xhr2 = function(url, mime, callback) {
        var req = new XMLHttpRequest ();

        if (arguments.length < 3) {
            callback = mime, mime = null;
        }
        else if (mime && req.overrideMimeType) {
            //req.overrideMimeType(mime);
        }
        req.open("GET", url, true);
        req.responseType = "arraybuffer";

        if (mime) {
            req.setRequestHeader("Accept", mime);
        }
        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                var s = req.status;
                callback(!s && req.response || s >= 200 && s < 300 || s === 304 ? req : null);
            }
        };
        req.send(null);
    };

    // IE Fudge
    // Adapted from http://stackoverflow.com/questions/1095102/how-do-i-load-binary-image-data-using-javascript-and-xmlhttprequest
    // IE-specific logic here
    // helper to convert from responseBody to a "responseText" like thing
    this.getBinaryFromXHR = function (xhr) {
        var binary = xhr.responseBody; // only available in ie
        var byteMapping = {};
        for ( var i = 0; i < 256; i++ ) {
            for ( var j = 0; j < 256; j++ ) {
                byteMapping[ String.fromCharCode( i + (j << 8) ) ] =
                    String.fromCharCode(i) + String.fromCharCode(j);
            }
        }
        var rawBytes = IEBinaryToArray_ByteStr(binary);
        var lastChr = IEBinaryToArray_ByteStr_Last(binary);
        return rawBytes.replace(/[\s\S]/g, function( match ) {
            return byteMapping[match];
        }) + lastChr;
    };
};