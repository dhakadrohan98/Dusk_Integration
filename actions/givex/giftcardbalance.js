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
// main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {

    let responseData = {};
    var balance_result = {};

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

    if ((params.data) && (params.data.value) && (params.data.value.cardno)) {
      try {
        var givex_number = params.data.value.cardno
        var balancePayload = payloadForGiftCardBalance(params, givex_number)
        var balanceResult = await call(params, 'dc_995', balancePayload)
        
        var result = {}
        var balance_response = {}
        

        balance_response['request'] = balancePayload
        balance_response['action'] = 'Fetching the Gift Card Balance'

        if ((balanceResult.length > 0) && (balanceResult[1] == 0)) {
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
          result = {
            "transactionCode": balanceResult[0],
            "responseCode": balanceResult[1],
            "errorMessage": balanceResult[2]
          };

          balance_response['status'] = false
          balance_response['response'] = result
          balance_result['balance'] = 0;
          balance_result['currency_code'] = 'AUD';
          balance_result['response_code'] = balanceResult[1];
          balance_result['error_message'] = balanceResult[2];
        }

        responseData['givex_giftcard_balance'] = balance_response

      } catch (error) {
        const errorResponse = {
          statusCode: 200,
          body: error

        }
        return errorResponse
      }

    }


    const response = {
      statusCode: 200,
      body: balance_result

    }

    // log the response status code
    logger.info(`${response.statusCode}: successful request`)
    return response
  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error '+error, logger)
  }
}

exports.main = main
