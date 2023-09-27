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
const { payloadForPoints, payloadForPointReversalRequest, call } = require('../givex')
const xmlrpc = require("davexmlrpc");
// main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {

    let responseData = {};

    responseData["event_code"] = params.GIVEX_LOYALTYPOINTS_EVENTCODE;
    responseData["provider_id"] = params.GIVEX_LOYALTYPOINTS_PROVIDER_ID;
    responseData["event_id"] = params.event_id;
    responseData["entity"] = "Adding points on Givex";

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

    if ((params.data) && (params.data.value) && (params.data.value.order) && (params.data.value.givexnumber)) {
      try {
        var order = params.data.value.order;
        var givexnumber = params.data.value.givexnumber

        var payload = payloadForPoints(params, givexnumber, order)
        var reversalPayload = payloadForPointReversalRequest(params, payload)
        var pointResult = await call(params, 'dc_911', payload)
        
        var result = {}
        var point_response = {}
        

        point_response['request'] = payload
        point_response['action'] = 'Givex Point'

        if ((pointResult.length > 0) && (pointResult[1] == 0)) {
          result = {
            "transactionCode": pointResult[0],
            "responseCode": pointResult[1],
            "transactionRefference": pointResult[2],
            "point_added": pointResult[3],
            "point_balance": pointResult[4],
            "certificate_balance": pointResult[5],
            "member_name": pointResult[6]
          };

          point_response['status'] = true
          point_response['response'] = result
        } else {
          result = {
            "transactionCode": pointResult[0],
            "responseCode": pointResult[1],
            "errorMessage": pointResult[2]
          };

          point_response['status'] = false
          point_response['response'] = result
          var reversResult = await call(params, 'dc_930', reversalPayload)

          var reversal_response = {}

          reversal_response['request'] = reversalPayload
          reversal_response['action'] = 'Givex Point Reversal'

          if((reversResult.length > 0) && (reversResult[1] == 0))
          {
            var reversal_result = {
                "transactionCode": reversResult[0],
                "responseCode": reversResult[1],
                "transactionRefference": reversResult[2],
                "point_balance": reversResult[3],
                "certificate_balance": reversResult[4],
                "iso_serial": reversResult[5]
              };
              reversal_response['status'] = true
              reversal_response['response'] = reversal_result
          } else {
            reversal_result = {
                "transactionCode": reversResult[0],
                "responseCode": reversResult[1],
                "errorMessage": reversResult[2],
                "point_balance": reversResult[3],
                "certificate_balance": reversResult[4],
                "iso_serial": reversResult[5]
              };

              reversal_response['status'] = false
              reversal_response['response'] = reversal_result
          }

          responseData['givex_point_reversal'] = reversal_response
        }

        responseData['givex_point'] = point_response

      } catch (error) {
        const errorResponse = {
          statusCode: 200,
          body: JSON.stringify(error, null, 4)

        }
        return errorResponse
      }

    } else {
        responseData['status'] = false
        responseData['error'] = "Parameters are not correct. Please check the provided order and givex number."
    }

    const response = {
      statusCode: 200,
      body: responseData

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
