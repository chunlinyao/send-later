var EXPORTED_SYMBOLS = ["sendlater3DateParse", "sendlater3DateToSugarDate", "sendlater3SugarLocale"];

// Using mozIJSSubScriptLoader instead of Cu.import because I want to
// preserve sugar.min.js unmodified from the official
// distribution, and it doesn't define EXPORTED_SYMBOLS, which is
// required by CU.import.
var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                       .getService(Components.interfaces.mozIJSSubScriptLoader); 
loader.loadSubScript("resource://sendlater3/sugar.min.js"); 

var didLocale = false;
var locale;

function getLocale() {
    if (! didLocale) {
	var localeService = Components.classes["@mozilla.org/intl/nslocaleservice;1"]
            .getService(Components.interfaces.nsILocaleService);
	var localeObj = localeService.getApplicationLocale();
	locale = localeObj.getCategory("NSILOCALE_TIME");
	// Sugar may not recognize the locale. It throws an error when
	// an unrecognized locale is passed in and the locale is
	// needed.

	try {
	    Date.create().format(null, locale);
	}
	catch (ex) {
	    locale = null;
	}
	didLocale = true;
    }
    return locale;
}

function sendlater3DateParse(date) {
    var locale = getLocale();
    var obj = Date.future(date, locale);
    if (! (obj.isValid() || locale.substr(0, 2) == "en")) {
	// Fall back on English date rules
	obj = Date.future(date);
    }
    return obj;
}

function sendlater3DateToSugarDate(date) {
    try {
	return Date.create(date);
    }
    catch (e) {
	var d = new Date();
	d.setTime(date.getTime());
	return d;
    }
}

function sendlater3SugarLocale() {
    return getLocale();
}
