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
// Main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // Create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try { 
    // To store response for Logging module
    let responseData = {};

    // Setting response for Logging module
    responseData["event_code"] = (params.type) ? params.type : 'com.givex.authorisegiftcard';
    responseData["provider_id"] = params.source;
    responseData["event_id"] = params.event_id;
    responseData["entity"] = "Redeem a Gift Card";

    var amount = 0; // To store GiftCard amount

    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // Log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // Check for missing request input parameters and headers
    const requiredParams = [/* add required params */]
    const requiredHeaders = []

    // Check for any missing parameters
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    
    // If we get parameters missing then will log the error and return
    if (errorMessage) {

      // Return and log client errors
      return errorResponse(400, errorMessage, logger)

    }

    // Extract the user Bearer token from the Authorization header
    const token = getBearerToken(params)

    // To store response for this API
    var preAuthResponse = []
    
    // Check if we have data in params with amount and card number and we have card number having some positive value
    if ((params.data) && (params.data.value) && (params.data.value.amount) && (params.data.value.cardno) && (params.data.value.cardno.length > 0)) 
    {
      // Creating Response for the API after verifying valid payload
    
      var amount = parseFloat(params.data.value.amount)  // To store Gift Card amount
      var cardno = params.data.value.cardno  // To store Gift Card number

      for (let index = 0; index < cardno.length; index++) {
        var givexNumber = cardno[index]
        
        // Generating Payload for Pre Auth Action of Givex (dc_920)
        var payloadPreAuth = payloadForPreAuthAmount(params, givexNumber, amount)

        // Execute the givex API with generated payload for Pre Auth action.
        var preAuthResult = await call(params, 'dc_920', payloadPreAuth)
        
        // API response if executed successfully with status 0 (true)
        if ((preAuthResult) && (preAuthResult[1] == 0)) {

          // After success call of authorise API, setting pre auth result response
          var authorise_amount = parseFloat(preAuthResult[3])

          // setting amount after deductions for captured amount
          amount = parseFloat(amount) - parseFloat(authorise_amount)
          preAuthResponse.push(
            {
              "cardno": givexNumber,
              "authorise_amount": parseFloat(authorise_amount),
              "referenceno": preAuthResult[2],
            }
          )
        } else {

          // Setting pre auth result response with the authorise amount as zero and error message as API returned status false
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

      // when we don't have correct parameter or card number , setting response to false
      preAuthResponse = false;
    }

    // setting response with status code
    const response = {
      statusCode: 200,
      body: preAuthResponse
    }

    // Log the response status code
    logger.info(`${response.statusCode}: successful request`)
    return response
  } catch (error) {
    
    // Log any server errors
    logger.error(error)
    
    // return with 500 status code
    return errorResponse(500, 'server error ' + error, logger)
  }
}

exports.main = main
