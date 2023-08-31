/*
* <license header>
*/

/**
 * This is a sample action showcasing how to access an external API
 *
 * Note:
 * You might want to disable authentication and authorization checks against Adobe Identity Management System for a generic action. In that case:
 *   - Remove the require-adobe-auth annotation for this action in the manifest.yml of your application
 *   - Remove the Authorization header from the array passed in checkMissingRequestInputs
 *   - The two steps above imply that every client knowing the URL to this deployed action will be able to invoke it without any authentication and authorization checks against Adobe Identity Management System
 *   - Make sure to validate these changes against your security requirements before deploying the action
 */


const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils')
const { payloadForPostAuthAmount, payloadForPreAuthAmount, call } = require('../givex')
const xmlrpc = require("davexmlrpc");
// main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {

    // --- 

    let responseData = {};

    responseData["event_code"] = (params.type) ? params.type : 'com.givex.authorisegiftcard';
    responseData["provider_id"] = params.source;
    responseData["event_id"] = params.event_id;
    responseData["entity"] = "Redeem a Gift Card";

    var generated_card_response = {}
    var amount = 0;

    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // check for missing request input parameters and headers
    const requiredParams = [/* add required params */]
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      // return and log client errors
      return errorResponse(400, errorMessage, logger)
    }

    // extract the user Bearer token from the Authorization header
    const token = getBearerToken(params)
    var preAuthResponse = []
    var all_response = []

    if ((params.data) && (params.data.value) && (params.data.value.amount) && (params.data.value.cardno) && (params.data.value.cardno.length > 0)) 
    {
      var amount = parseFloat(params.data.value.amount)
      var cardno = params.data.value.cardno

      for (let index = 0; index < cardno.length; index++) {
        var givexNumber = cardno[index]
        var payloadPreAuth = payloadForPreAuthAmount(params, givexNumber, amount)
        var preAuthResult = await call(params, 'dc_920', payloadPreAuth)
        
        if ((preAuthResult) && (preAuthResult[1] == 0)) {
          var authorise_amount = parseFloat(preAuthResult[3])
          amount = parseFloat(amount) - parseFloat(authorise_amount)
          preAuthResponse.push(
            {
              "cardno": givexNumber,
              "authorise_amount": parseFloat(authorise_amount),
              "referenceno": preAuthResult[2],
            }
          )
        } else {
          preAuthResponse.push(
            {
              "cardno": givexNumber,
              "authorise_amount": 0,
              "error": preAuthResult[2],
            }
          )
        }

      }
    } else {
      preAuthResponse = false;
    }

    const response = {
      statusCode: 200,
      body: preAuthResponse
    }

    // log the response status code
    logger.info(`${response.statusCode}: successful request`)
    return response
  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error ' + error, logger)
  }
}

exports.main = main
