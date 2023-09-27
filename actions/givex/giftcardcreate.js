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
// Main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // Create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    
    let responseData = {};  // To store response for Logging module

    // setting data in responseData from payload to this action
    responseData["event_code"] = params.type;
    responseData["provider_id"] = params.source;
    responseData["event_id"] = params.event_id;
    responseData["entity"] = "Register new giftcard";

    var generated_card_response = {} // To store response for API
    var amount = 0;

    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // Log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // Check for missing request input parameters and headers
    const requiredParams = [/* add required params */]
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      // Return and log client errors
      return errorResponse(400, errorMessage, logger)
    }

    // Extract the user Bearer token from the Authorization header
    const token = getBearerToken(params)
    //Check if data, value and OrderData exists in payload
    if ((params.data) && (params.data.value) && (params.data.value.order)) {
        var order = params.data.value.order;
        var generated_giftcard = [];
        var failed_giftcard = [];
        
        // loop to iterate for the number of order items
        for (let index = 0; index < order.items.length; index++) {
          var item = order.items[index];

          // Check if the product type is GiftCard so as to proceed with Gift Card creation.
          if(item.product_type == 'giftcard')
          {
            var amount = item.base_price  // Setting amount for the GiftCard
            var qty = item.qty_invoiced

            // Loop to iterate for the number of quantity
            for (let index = 0; index < qty; index++) {

              // Generating Payload for Create GiftCard Action of Givex (dc_904)
              var payload = payloadForRegisterCard(params, amount);

              // Execute the givex API with generated payload for Create GiftCard action.
              generated_card_response = await call(params, 'dc_904', payload);
              
              // Check if the card has been successfully created or not
              if((generated_card_response.length > 0) && (generated_card_response[1] == 0))
              {
                // Setting response for the succesfully created GiftCard
                transactionCode = generated_card_response[0]
                transactionReference = generated_card_response[2]
                givexNumber = generated_card_response[3]
                balance = generated_card_response[4]
                expiration_date = generated_card_response[5]
                generated_giftcard.push({"cardno":givexNumber, "amount": balance, "expiry": expiration_date});
              } else {

                // Setting response for the failure in the creation of GiftCard
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

    // Setting response for the api 
    const response = {
      statusCode: 200,
      body: { 'generated_giftcard': generated_giftcard, 'failed_giftcard': failed_giftcard }
    }

    // log the response status code
    logger.info(`${response.statusCode}: successful request`)

    return response
  } catch (error) {

    // Log any server errors
    
    logger.error(error)
    // Return with 500 status code
    
    return errorResponse(500, 'server error '+error, logger);  
  }
}

exports.main = main
