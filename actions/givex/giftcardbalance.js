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
const { payloadForRegisterCard, payloadForReversalRequest, payloadForGiftCardBalance, call } = require('../givex')
const xmlrpc = require("davexmlrpc");
// Main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // Create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    let responseData = {};  // To store response for Logging module
    var balance_result = {}; // To store response for API

    // setting data in responseData from payload to this action
    responseData["event_code"] = params.type;
    responseData["provider_id"] = params.source;
    responseData["event_id"] = params.event_id;
    responseData["entity"] = "Getting balance of gift-card";

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

    // Check if we have data in params with amount and card number and we have card number having some positive value
    if ((params.data) && (params.data.value) && (params.data.value.cardno)) {

      // Since parameters are correct, prepare response for this api with the details

      try {
        var givex_number = params.data.value.cardno

        // Generating Payload for GiftCard Balance Action of Givex (dc_995)
        var balancePayload = payloadForGiftCardBalance(params, givex_number)

        // Execute the givex API with generated payload for Gift Card Balance.
        var balanceResult = await call(params, 'dc_995', balancePayload)
        
        var result = {}
        var balance_response = {} // To store API response for logging module
        
        // Setting response for logging module
        balance_response['request'] = balancePayload
        balance_response['action'] = 'Fetching the Gift Card Balance'
        
        // API response check like if executed successfully with status 0 (true)
        if ((balanceResult.length > 0) && (balanceResult[1] == 0)) {
          
          // Set response if if API executed successfully
          result = {
            "transactionCode": balanceResult[0],
            "responseCode": balanceResult[1],
            "balance": balanceResult[2],
            "currency": balanceResult[3],
            "pointsBalance": balanceResult[4],
            "transHist": balanceResult[5],
            "totalRows": balanceResult[6],
            "isoSerial": balanceResult[7],
            "expirydate": balanceResult[8],
            "operatorMessage": balanceResult[9]
          };

          balance_response['status'] = true
          balance_response['response'] = result
          balance_result['balance'] = balanceResult[2];
          balance_result['currency_code'] = balanceResult[3];

        } else {
          // set result with error and details if API is a failure
          result = {
            "transactionCode": balanceResult[0],
            "responseCode": balanceResult[1],
            "errorMessage": balanceResult[2]
          };
          
          // Set response if API respond as a fialure
          balance_response['status'] = false
          balance_response['response'] = result
          balance_result['balance'] = 0;
          balance_result['currency_code'] = 'AUD';
          balance_result['response_code'] = balanceResult[1];
          balance_result['error_message'] = balanceResult[2];
        }
        
        // Set response data to be sent to Logging module
        responseData['givex_giftcard_balance'] = balance_response

      } catch (error) {

        // setting error response for the API with status code
        const errorResponse = {
          statusCode: 400,
          body: error
        }

        // returning error response for the API
        return errorResponse
      }

    }

    // setting response for the API with status code
    const response = {
      statusCode: 200,
      body: balance_result
    }

    // Log the response status code
    logger.info(`${response.statusCode}: successful request`)

    // returning response for the API
    return response
  } catch (error) {
    // Log any server errors
    logger.error(error)
    // Return with 500 status code
    return errorResponse(500, 'server error '+error, logger)
  }
}

exports.main = main
