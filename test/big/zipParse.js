/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 08/02/13
 * Time: 11:37
 * To change this template use File | Settings | File Templates.
 */

var ZipParse = new function () {

    var fieldDelimiter, fieldDelimiterVal, lineDelimiter, lineDelimVal, quoteDelimiter, qDelimVal, firstTrue, readFields, lineNo;
    var escapeCharVal = "\\".charCodeAt(0);
    var first256 = [];
    var fileMetaData;
    var sampleRate = 10;

    var pb = 0;


    this.rowReader = function (strOrArray) {
        var field = 0;
        var fromI = 0, toI = 0;
        var use = readFields [field];
        var c;
        var str = [];
        var strLen = strOrArray.length;
        var quotes = false, esc = false;

        for (var n = 0; n < strLen; n++) {
            var sstr = strOrArray[n];
            c = sstr ? sstr : 0;

            if (quoteDelimiter && !esc && c == qDelimVal) {
                quotes = !quotes;
            }
            if (!quotes && (c === fieldDelimiterVal || n === strLen - 1)) {
                if (use) {
                    toI = n + ((n === strLen - 1) ? 1 : 0);
                    if (fromI === toI) {    // empty field, adjacent delimiters
                        str.push ("");
                    } else {
                        var newStr = String.fromCharCode.apply (null, strOrArray.slice(fromI, toI));
                        pb += (toI - fromI);
                        str.push (newStr);
                    }
                }
                field++;
                use = readFields [field] | false;
                fromI = n + 1;
            }

            esc = (c == escapeCharVal);
        }
        lineNo++;

        if (lineNo % 10000 === 0) {
            console.log ("Progress. Parsed line ",lineNo * sampleRate, ": ", str);
        }
        return str;
    };



    this.zipStreamSVParser2 = function (inflateFunc) {
        alert ("start partial parse with charcodes");
        var buff = new Array(1024);
        var blength = 1024;
        var out = [];
        var i, j;
        var bigOut = [];
        var k = 0;
        var esc = false, quotes = false;

        var stt = true;
        var ch, ch2, c;
        var utfwrap = 0;


        while((i = inflateFunc (buff, utfwrap, blength - utfwrap)) > 0) {

            i += utfwrap; // cos we may have chars left over from not processing utf chars chopped between buffer calls
            // and i only returns new chars added to the buffer from inflateFunc. Led to off by one(or two) errors.

            var n = 0;
            utfwrap = 0;


            if (stt) {
                var possbom = String.fromCharCode(buff[0]) + String.fromCharCode(buff[1]) + String.fromCharCode(buff[2]);
                console.log ("possbom [", possbom, "]");
                if (possbom == "\xEF\xBB\xBF") {
                    console.log ("UTF8 bytemark detected");
                    n = 3;
                }
                stt = false;
            }

            for (j = n; j < i; j++) {
                ch = buff[j];
                if (ch >= 128) {
                    utfchar (ch);
                }

                if (quoteDelimiter && !esc && ch == qDelimVal) {
                    quotes = !quotes;
                }
                else if (!quotes && ch == lineDelimVal) {  // end of line
                    if (k % sampleRate == 0) {
                        bigOut.push ((k >= fileMetaData.ignoreHeaderLines) ? ZipParse.rowReader (out) : undefined);
                    }
                    k++;
                    out.length = 0;
                } else if (ch !== undefined) {
                    out.push (ch);
                    if (ch2 !== undefined) {
                        out.push (ch2);
                        ch2 = undefined;
                    }
                }

                esc = (ch == escapeCharVal);
            }
            // console.log (out.length);

            if (utfwrap) {
                for (var m = 0; m < utfwrap; m++) {
                    buff[m] = buff [i - utfwrap + m];
                }
            }
        }

        // Last line may not be returned
        if (out.length > 0) {
            bigOut.push (ZipParse.rowReader (out));
        }

        function cantutf () {
            utfwrap = i - j;
            j = i;
            ch = undefined;
        }

        function utfchar (ch) {
            if( ch >= 0xC2 && ch < 0xE0 ) {
                if (j < i - 1) {
                    ch = (((ch&0x1F)<<6) + (buff[++j]&0x3F));
                } else {
                    cantutf();
                }
            } else if( ch >= 0xE0 && ch < 0xF0 ) {
                if (j < i - 2) {
                    ch = (((ch&0xFF)<<12) + ((buff[++j]&0x3F)<<6) + (buff[++j]&0x3F));
                } else {
                    cantutf();
                }
            } else if( ch >= 0xF0 && ch < 0xF5) {
                if (j < i - 3) {
                    var codepoint = ((ch&0x07)<<18) + ((buff[++j]&0x3F)<<12)+ ((buff[++j]&0x3F)<<6) + (buff[++j]&0x3F);
                    codepoint -= 0x10000;
                    var s =  String.fromCharCode (
                        (codepoint>>10) + 0xD800,
                        (codepoint&0x3FF) + 0xDC00
                    );
                    ch = s.charCodeAt[0];
                    ch2 = s.charCodeAt[1];
                } else {
                    cantutf();
                }
            }
        }

        console.log ("pulled out "+pb+" characters from zip");
        return bigOut;
    };


    this.set = function (dsvVals) {

        fieldDelimiter = dsvVals.fieldsTerminatedBy.replace ("\\t", "\t").replace("\\n", "\n");    // 'cos reading in from file doesn't escape tabs or return
        lineDelimiter = dsvVals.linesTerminatedBy.replace ("\\t", "\t").replace("\\n", "\n");
        quoteDelimiter = dsvVals.fieldsEnclosedBy.replace ("\\\"", "\"");
        readFields = dsvVals.readFields;
        fileMetaData = dsvVals;
        firstTrue = readFields.indexOf (true);
        fieldDelimiterVal = fieldDelimiter.charCodeAt (0);
        lineDelimVal = lineDelimiter.charCodeAt (0);
        qDelimVal = quoteDelimiter ? quoteDelimiter.charCodeAt (0) : -1;
        lineNo = 0;

        first256.length = 0;
        for (var k = 0; k < 256; k++) {
            first256.push (String.fromCharCode(k));
        }
    };
};
