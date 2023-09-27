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
const { getOrderInfo, getshipmentInfo } = require('../magento')
const { sendcloudevent } = require('../token')
const { payloadForExistingOrderCheck, isOrderExistonFutura, createDeliveryNote, createdeliverynoteparam, SearchInFutura, deliveryExistPayload, isDeliveryNoteExist, getShipmentIncrementNumber } = require('../futura')

// main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {

    let responseData = {};

    responseData["event_code"] = params.type;
    responseData["provider_id"] = params.source;
    responseData["event_id"] = params.event_id;
    responseData["entity"] = "Create Delivery Note in Futura";

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

    var magentolog = {}
    magentolog['request'] = params.data.value
    magentolog['action'] = "Get Magento Data"
    try {
      // get Magento order info
      var orderinfo = await getOrderInfo(params, params.data.value.order_id)

      // get magento shipment info
      var shipmentinfo = await getshipmentInfo(params, params.data.value.entity_id)
      magentolog['status'] = true
      magentolog['response'] = shipmentinfo
    } catch (error) {
      magentolog['status'] = false
      magentolog['response'] = error.message
    }

    // Adding the magento shipment fetch log for logging
    responseData["magento"] = magentolog

    let futuraordercheck = {}
    futuraordercheck['request'] = orderinfo.increment_id
    futuraordercheck['action'] = "Order Exist in Futura"
    try {
      // created payload info for check order is exist or not
      var futura_order_id = parseInt(params.FUTURA_ORDER_RANGE) + parseInt(orderinfo.increment_id);
      var payloadForExistingOrderCheckFutura = payloadForExistingOrderCheck(futura_order_id);

      futuraordercheck['request'] = payloadForExistingOrderCheckFutura
      // check order is available or not in futura
      var isOrderAvailableOnFutura = await isOrderExistonFutura(futura_order_id, params, payloadForExistingOrderCheckFutura);
      futuraordercheck['status'] = true
      futuraordercheck['response'] = isOrderAvailableOnFutura

    } catch (error) {
      futuraordercheck['status'] = false
      futuraordercheck['response'] = error.message
    }

    var orderExistonFutura = false;
    var deliveryNoteCreated = false;    
    if (
      (typeof isOrderAvailableOnFutura != 'undefined') &&
      (typeof isOrderAvailableOnFutura.result != 'undefined') &&
      (isOrderAvailableOnFutura.result.Result != null) &&
      (typeof isOrderAvailableOnFutura.result.Result.list_db_line != 'undefined') &&
      (isOrderAvailableOnFutura.result.Result.list_db_line[0].DB_Response[0].Field_value == futura_order_id)
    ) {
      orderExistonFutura = true;

      let deliverynoteexist = {}      

      // --------- Checking the delivery note for the same shipment exist or not
      var lines = []
      try {
        var delieveryNoteExistFlag = false
        var payloadOfDeliveryNoteCheck = deliveryExistPayload(futura_order_id)
        var isDeliveryNoteExistOrNot = await isDeliveryNoteExist(params, payloadOfDeliveryNoteCheck)
        deliverynoteexist['request'] = payloadOfDeliveryNoteCheck
        deliverynoteexist['action'] = "Delivery note for the current shipment exist or not"
        var delivery_note_exist_for_same_shipment = false
        if (
          (typeof isDeliveryNoteExistOrNot != 'undefined') &&
          (typeof isDeliveryNoteExistOrNot.result != 'undefined') &&
          (isDeliveryNoteExistOrNot.result.Result != null) &&
          (typeof isDeliveryNoteExistOrNot.result.Result.list_db_line != 'undefined') &&
          (isDeliveryNoteExistOrNot.result.Result.list_db_line[0].DB_Response[0].Field_value == futura_order_id)
        ) {
          
          isDeliveryNoteExistOrNot.result.Result.list_db_line.forEach(result_item => {
            var deliverynote_text = result_item.DB_Response[3].Field_value
            var exist_shipment_id = getShipmentIncrementNumber(deliverynote_text)
            if (exist_shipment_id == shipmentinfo.increment_id) {
              delivery_note_exist_for_same_shipment = true;
            }
          });

          delieveryNoteExistFlag = true
          deliverynoteexist['status'] = true
          deliverynoteexist['response'] = isDeliveryNoteExistOrNot
        } else {
          deliverynoteexist['status'] = false
          deliverynoteexist['response'] = isDeliveryNoteExistOrNot
        }
      } catch (error) {
        delieveryNoteExistFlag = false
        deliverynoteexist['status'] = false
        deliverynoteexist['response'] = isDeliveryNoteExistOrNot
      }

      responseData['deliverynoteexist'] = deliverynoteexist

      // If the delivery note exist for the same shipment then new delivery note will not generate
      if (delivery_note_exist_for_same_shipment == false) {
      // if (true) {
        let deliveryapi = {}
        deliveryapi['request'] = isOrderAvailableOnFutura
        deliveryapi['action'] = "Create Delivery Note"
        try {
          // param for deliverynote
          var deliverynoteparam = await createdeliverynoteparam(
            params, orderinfo, shipmentinfo, futura_order_id,
            isOrderAvailableOnFutura.result.Result.list_db_line[0].DB_Response[1].Field_value,
            shipmentinfo.increment_id
          )
          deliveryapi['request'] = deliverynoteparam
          // create delievery note request
          var createdeliverynote = await createDeliveryNote(params, deliverynoteparam)
          var deliverynoterequest = createdeliverynote.lastcall
          if(
            typeof createdeliverynote.result != "undefined" &&
            typeof createdeliverynote.result.Result != 'undefined' &&
            (createdeliverynote.result.Result) &&
            (createdeliverynote.result.Result.web_Error) &&
            typeof createdeliverynote.result.Result.web_Error != 'undefined'
          ) {
            deliveryapi['status'] = false
            deliveryNoteCreated = false
          } else {
            deliveryapi['status'] = true
            deliveryNoteCreated = true
          }
          deliveryapi['response'] = createdeliverynote
        } catch (error) {
          deliveryapi['status'] = false
          deliveryapi['response'] = error.message
          deliveryNoteCreated = false
        }

        responseData['deliverynote'] = deliveryapi
      }
      // ---- ends        
    } else {
      orderExistonFutura = false;
      futuraordercheck['status'] = false
      futuraordercheck['response'] = isOrderAvailableOnFutura

    }



    // 1. qtyy_refund > 0 ... | Call full fill.. || - 1
    // shiped -> reverse 
    // no shipment | fullfiled | all item processed || - 2

    // 12 = 1-1 refund | 8 ship | 2 refund = ship nahi refund
    // 12 - 9 ship | -2 return -3 refund

    // item 1 = 2 ordered & invoiced | 1 shipped | 1 refunded ------------> 1 returned
    // 

    responseData['futura_order_exist'] = futuraordercheck;

    var published = await sendcloudevent(params, params.DUSK_MAGENTO_PROVIDER_ID, params.DUSK_LOGGING_EVENT_CODE, responseData)

    const response = {
      statusCode: 200,
      body: {
        "deliverynoterequest": deliverynoterequest,
        "futura_order_id": futura_order_id,
        "shipmentinfo-increment_id": shipmentinfo.increment_id,
        "isOrderAvailableOnFutura": orderExistonFutura,
        "createdeliverynote": deliveryNoteCreated,
        "delivery_note_exist_for_same_shipment": delivery_note_exist_for_same_shipment,
        "response": responseData
      }
    }

    // const response = {
    //   statusCode: 200,
    //   body: responseData
    // }

    // log the response status code
    logger.info(`${response.statusCode}: successful request`)
    return response
  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error' + error, logger)
  }
}

exports.main = main