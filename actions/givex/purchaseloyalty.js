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
const { call, PayloadForCreateNewAccount } = require('../givex')
const { getOrderInfo } = require('../magento')
const { ReserveLoyaltyCard } = require('../duskportal')
const xmlrpc = require("davexmlrpc");
const {sendcloudevent} = require('../token')
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
    responseData["entity"] = "New Loyalty Membership";

    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // check for missing request input parameters and headers
    const requiredParams = [/* add required params */]
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      // return and log client errors# Error: HTTP Error 429: Too Many Requests #
      return errorResponse(400, errorMessage, logger)
    }

    // extract the user Bearer token from the Authorization header
    const token = getBearerToken(params)

    var magentoOrder = await getOrderInfo(params,params.data.value.order_id);
  
    var customerdata = magentoOrder.billing_address;
    customerdata['email'] = magentoOrder.customer_email
    customerdata['dob'] = magentoOrder.customer_dob ? magentoOrder.customer_dob.substring(0,10) : ""

    var reservationcard, reservationresponse={};
    reservationresponse['action'] = "Get Blank Loyalty Card";
    try{
        reservationcard = await ReserveLoyaltyCard(params);
        reservationresponse['response'] = reservationcard
        reservationresponse['status'] = true
    }catch(error){
        reservationresponse['status'] = false
        reservationresponse['response'] = error
    }

    responseData['reservation'] = reservationresponse
    

    if(reservationresponse.status == true){
        var payload = await PayloadForCreateNewAccount(params,"dc_946",reservationcard.rewardsCardNumber,customerdata)

        var createcustomerGivex, createGivexresponse={};
        createGivexresponse['action'] = "Activate Loyalty Membership Card Givex"
        createGivexresponse['request'] = payload
        try{
          createcustomerGivex = await call(params, 'dc_946', payload)
          createGivexresponse['status'] = true
          if(createcustomerGivex[1] != 0){
              createGivexresponse['status'] = false
          }
          createGivexresponse['response'] = createcustomerGivex
        }catch(error){
            createGivexresponse['status'] = false
            createGivexresponse['response'] = error
        }

        responseData['loyalty_memeber_create'] = createGivexresponse

        if(createGivexresponse.status == true){
            var givexupdatepayload = {'card_no':reservationcard.rewardsCardNumber,'order_id': params.data.value.order_id,'futura_id': params.data.value.futura_id, 'givex': createcustomerGivex}
            var GivexUpdateData = await sendcloudevent(params,params.GIVEX_PROVIDER_ID, params.GIVEX_UPDATE_LOYALTY_DATA_CODE, {"value": givexupdatepayload})
        }
    }


    // Logging request
    var published = await sendcloudevent(params,params.DUSK_MAGENTO_PROVIDER_ID, params.DUSK_LOGGING_EVENT_CODE, responseData)


    const response = {
      statusCode: 200,
      body: published
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
