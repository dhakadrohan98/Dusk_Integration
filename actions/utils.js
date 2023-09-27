/* 
* <license header>
*/

/* This file exposes some common utilities for your actions */

/**
 *
 * Returns a log ready string of the action input parameters.
 * The `Authorization` header content will be replaced by '<hidden>'.
 *
 * @param {object} params action input parameters.
 *
 * @returns {string}
 *
 */
function stringParameters (params) {
  // hide authorization token without overriding params
  let headers = params.__ow_headers || {}
  if (headers.authorization) {
    headers = { ...headers, authorization: '<hidden>' }
  }
  return JSON.stringify({ ...params, __ow_headers: headers })
}

/**
 *
 * Returns the list of missing keys giving an object and its required keys.
 * A parameter is missing if its value is undefined or ''.
 * A value of 0 or null is not considered as missing.
 *
 * @param {object} obj object to check.
 * @param {array} required list of required keys.
 *        Each element can be multi level deep using a '.' separator e.g. 'myRequiredObj.myRequiredKey'
 *
 * @returns {array}
 * @private
 */
function getMissingKeys (obj, required) {
  return required.filter(r => {
    const splits = r.split('.')
    const last = splits[splits.length - 1]
    const traverse = splits.slice(0, -1).reduce((tObj, split) => { tObj = (tObj[split] || {}); return tObj }, obj)
    return traverse[last] === undefined || traverse[last] === '' // missing default params are empty string
  })
}


function futuraDateFormat(futuraObj) {
  // Iterate through the object
  for (const key in futuraObj) {
    if (futuraObj.hasOwnProperty(key)) {
      //console.log("Key: " + key + ", Value: " + futuraObj[key]);
      if(isValidDate(futuraObj[key])) {
        futuraObj[key] = formatDateIso(futuraObj[key])
      }
    }
  }
  return futuraObj;
}

function isValidDate(dateString) {
  var regEx = /^\d{4}-\d{2}-\d{2}/
  //var regEx = /[a-zA-Z0-9]{4}-[a-zA-Z0-9]{2}-[a-zA-Z0-9]{2}/
  //return regEx.test(dateString)
  var d = new Date(dateString);
  //return regEx.test(dateString)
  var dNum = d.getTime();
  if(!dNum && dNum !== 0) return false; // NaN value, Invalid date
  var dateYmd = d.toISOString().slice(0,10);
  var dateYm = d.toISOString().slice(0,8);
  return dateYm != "1970-01-" && regEx.test(dateYmd)
}

// function isValidDate(dateString) {
//   var regEx = /^\d{4}-\d{2}-\d{2}/;
//   return regEx.test(dateString)
//   var d = new Date(dateString);
//   var dNum = d.getTime();
//   if(!dNum && dNum !== 0) return false; // NaN value, Invalid date
//   var dateYmd = d.toISOString().slice(0,10);
//   return regEx.test(dateYmd)
// }

function formatDateIso(dateinput) {
  var dateIso = new Date(dateinput)
  return dateIso.toISOString();
}

/**
 * Function to add object to array if key not found
 * @param obj
 * @param arr
 * @returns {*}
 */

function addObjtoArray(obj, arr, keys) {
  let found = false;
  if (arr.length > 0) {
    let obj1 = arr.find((o, i) => {
      if (o.keys === obj.keys) {
        arr[i].qty += obj.qty;
        found = true;
        return true;
      }
  });
  }
  if (!found) {
    arr.push(obj);
  }
  return arr;
}
/**
 * Get date as Ymd string
 * @param Isodate
 * @returns {string}
 */
function getdateasstring(Isodate)
{
  var date = new Date(Isodate);
  var year = date.toLocaleString("default", { year: "numeric" });
  var month = date.toLocaleString("default", { month: "2-digit" });
  var day = date.toLocaleString("default", { day: "2-digit" });

  // Generate yyyy-mm-dd date string
  var formattedDate = year + month + day;

  return formattedDate
}

/**
 *
 * Returns the list of missing keys giving an object and its required keys.
 * A parameter is missing if its value is undefined or ''.
 * A value of 0 or null is not considered as missing.
 *
 * @param {object} params action input parameters.
 * @param {array} requiredHeaders list of required input headers.
 * @param {array} requiredParams list of required input parameters.
 *        Each element can be multi level deep using a '.' separator e.g. 'myRequiredObj.myRequiredKey'.
 *
 * @returns {string} if the return value is not null, then it holds an error message describing the missing inputs.
 *
 */
function checkMissingRequestInputs (params, requiredParams = [], requiredHeaders = []) {
  let errorMessage = null

  // input headers are always lowercase
  requiredHeaders = requiredHeaders.map(h => h.toLowerCase())
  // check for missing headers
  const missingHeaders = getMissingKeys(params.__ow_headers || {}, requiredHeaders)
  if (missingHeaders.length > 0) {
    errorMessage = `missing header(s) '${missingHeaders}'`
  }

  // check for missing parameters
  const missingParams = getMissingKeys(params, requiredParams)
  if (missingParams.length > 0) {
    if (errorMessage) {
      errorMessage += ' and '
    } else {
      errorMessage = ''
    }
    errorMessage += `missing parameter(s) '${missingParams}'`
  }

  return errorMessage
}

/**
 *
 * Extracts the bearer token string from the Authorization header in the request parameters.
 *
 * @param {object} params action input parameters.
 *
 * @returns {string|undefined} the token string or undefined if not set in request headers.
 *
 */
function getBearerToken (params) {
  if (params.__ow_headers &&
      params.__ow_headers.authorization &&
      params.__ow_headers.authorization.startsWith('Bearer ')) {
    return params.__ow_headers.authorization.substring('Bearer '.length)
  }
  return undefined
}
/**
 *
 * Returns an error response object and attempts to log.info the status code and error message
 *
 * @param {number} statusCode the error status code.
 *        e.g. 400
 * @param {string} message the error message.
 *        e.g. 'missing xyz parameter'
 * @param {*} [logger] an optional logger instance object with an `info` method
 *        e.g. `new require('@adobe/aio-sdk').Core.Logger('name')`
 *
 * @returns {object} the error object, ready to be returned from the action main's function.
 *
 */
function errorResponse (statusCode, message, logger) {
  if (logger && typeof logger.info === 'function') {
    logger.info(`${statusCode}: ${message}`)
  }
  return {
    error: {
      statusCode,
      body: {
        error: message
      }
    }
  }
}

module.exports = {
  errorResponse,
  getBearerToken,
  isValidDate,
  formatDateIso,
  futuraDateFormat,
  stringParameters,
  addObjtoArray,
  getdateasstring,
  checkMissingRequestInputs
}
