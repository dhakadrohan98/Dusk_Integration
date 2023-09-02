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
const { payloadForRegisterCard, payloadForReversalRequest, payloadForActivateCard, call } = require('../givex')
const xmlrpc = require("davexmlrpc");
// main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {

    // --- 

    let responseData = {};

    responseData["event_code"] = params.type;
    responseData["provider_id"] = params.source;
    responseData["event_id"] = params.event_id;
    responseData["entity"] = "Register new giftcard";

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

    if ((params.data) && (params.data.value) && (params.data.value.order)) {
        var order = params.data.value.order
        var customer_email = order.customer_email
        var customer_firstname = order.customer_firstname
        var customer_lastname = order.customer_lastname
        var order_increment_id = order.increment_id

        var orderItems = order.items.length

        var generated_giftcard = []
        var failed_giftcard = []
        
        for (let index = 0; index < order.items.length; index++) {
          var item = order.items[index];
          if(item.product_type == 'giftcard')
          {
            var amount = item.base_price
            var qty = item.qty_invoiced

            for (let index = 0; index < qty; index++) {
              var payload = payloadForRegisterCard(params, amount)
              generated_card_response = await call(params, 'dc_904', payload)
              if((generated_card_response.length > 0) && (generated_card_response[1] == 0))
              {
                transactionCode = generated_card_response[0]
                transactionReference = generated_card_response[2]
                givexNumber = generated_card_response[3]
                balance = generated_card_response[4]
                expiration_date = generated_card_response[5]
                generated_giftcard.push({"cardno":givexNumber, "amount": balance, "expiry": expiration_date});
              } else {
                var failed_res = {
                  'transactionCode': generated_card_response[0],
                  'responseCode': generated_card_response[1],
                  'errorMessage': generated_card_response[2]
                }
                failed_giftcard.push(failed_res);
              }              
            }           

          }
        }
    }

    const response = {
      statusCode: 200,
      body: { 'generated_giftcard': generated_giftcard, 'failed_giftcard': failed_giftcard }
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
