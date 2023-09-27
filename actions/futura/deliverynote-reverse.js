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
const { getOrderInfo, getshipmentInfo, getCreditmemoInfo, SearchShipmentOfOrder} = require('../magento')
const {sendcloudevent} = require('../token')
const { payloadForExistingOrderCheck, isOrderExistonFutura, createDeliveryNote, 
  createdeliverynoteparam, SearchInFutura, isDeliveryNoteExist, deliveryExistPayload} = require('../futura')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {

    let responseData = {};

    responseData["event_code"] = params.type;
    responseData["provider_id"] = params.source;
    responseData["event_id"] = params.event_id;
    responseData["entity"] = "Reverse Delivery Note in Futura";

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

    var magentolog= {}
    magentolog['request'] = params.data.value
    magentolog['action'] = "Get Magento Data"
    try{
      // get Magento order info
      var orderinfo = await getOrderInfo(params, params.data.value.order_id)

      // get magento shipment info
      var shipment_id = 0
      var shipmentinfo = {}
      var shipment_data = await SearchShipmentOfOrder(params, 'order_id' , params.data.value.order_id)
      if(shipment_data.items && (Object.keys(shipment_data.items).length > 0) )
      {
        shipment_id = shipment_data.items[0].increment_id
        shipmentinfo = shipment_data.items[0]
      }

      magentolog['status'] = true
      magentolog['response'] = shipmentinfo
    }catch(error){
      magentolog['status'] = false
      magentolog['response'] = error
    }

    responseData["magento"] = magentolog

    var creditmemolog= {}
    creditmemolog['request'] = params.data.value.entity_id
    creditmemolog['action'] = "Get Cretitmemo Data"
    
    try{
      var creditmemoinfo = await getCreditmemoInfo(params, params.data.value.entity_id)
      creditmemolog['status'] = true
      creditmemolog['response'] = creditmemoinfo
    }catch(error){
      creditmemolog['status'] = false
      creditmemolog['response'] = error
      // if(params.data && params.data.value && params.data.value.creditmemo_info){
      //   var creditmemoinfo = params.data.value.creditmemo_info
      // }      
    }

    responseData["magento_creditmemo"] = creditmemolog

    let futuraordercheck = {}
    futuraordercheck['request'] = orderinfo.increment_id
    futuraordercheck['action'] = "Order Exist in Futura"
    var isOrderExistOnFutura = false
    var isOrderExistOnFuturaError = ""
    try{
        // created payload info for check order is exist or not
        var futura_order_id = parseInt(params.FUTURA_ORDER_RANGE) + parseInt(orderinfo.increment_id);
        var payloadForExistingOrderCheckFutura =  payloadForExistingOrderCheck(futura_order_id);

        futuraordercheck['request'] = payloadForExistingOrderCheckFutura
        // check order is available or not in futura
        var isOrderAvailableOnFutura = await isOrderExistonFutura(futura_order_id, params, payloadForExistingOrderCheckFutura);
        futuraordercheck['status'] = true
        futuraordercheck['response'] = isOrderAvailableOnFutura
        isOrderExistOnFutura = true
        isOrderExistOnFuturaResult = isOrderAvailableOnFutura

    }catch(error){
        futuraordercheck['status'] = false
        futuraordercheck['response'] = error.message
        isOrderExistOnFutura = false
        isOrderExistOnFuturaError = error.message
    }

    let deliveryNoteExistCheck = {}
    deliveryNoteExistCheck['request'] = futura_order_id
    deliveryNoteExistCheck['action'] = "Delivery Note for Order Exist in Futura"

    try {
      var delieveryNoteExistFlag = false
      var payloadOfDeliveryNoteCheck = deliveryExistPayload(futura_order_id)
      var isDeliveryNoteExistOrNot = await isDeliveryNoteExist(params, payloadOfDeliveryNoteCheck)
      var deliveryNoteExistCheckResult = isDeliveryNoteExistOrNot
      var delieveryNoteExistRequest = isDeliveryNoteExistOrNot.lastcall

      if ( 
        (typeof isDeliveryNoteExistOrNot != 'undefined' ) && 
        (typeof isDeliveryNoteExistOrNot.result != 'undefined' ) && 
        (isDeliveryNoteExistOrNot.result.Result != null ) && 
        (typeof isDeliveryNoteExistOrNot.result.Result.list_db_line != 'undefined') && 
        (isDeliveryNoteExistOrNot.result.Result.list_db_line[0].DB_Response[0].Field_value == futura_order_id) 
        )
      {
        delieveryNoteExistFlag = true
        deliveryNoteExistCheck['status'] = true
        deliveryNoteExistCheck['response'] = isDeliveryNoteExistOrNot
      }
    } catch (error) {
      delieveryNoteExistFlag = false
      deliveryNoteExistCheck['status'] = false
      deliveryNoteExistCheck['response'] = isDeliveryNoteExistOrNot
    }

    responseData['delivery_note_exist'] = deliveryNoteExistCheck;
    
    if ( 
        (typeof isOrderAvailableOnFutura != 'undefined' ) && 
        (typeof isOrderAvailableOnFutura.result != 'undefined' ) && 
        (isOrderAvailableOnFutura.result.Result != null ) && 
        (typeof isOrderAvailableOnFutura.result.Result.list_db_line != 'undefined') && 
        (isOrderAvailableOnFutura.result.Result.list_db_line[0].DB_Response[0].Field_value == futura_order_id) &&
        (delieveryNoteExistFlag == true)
        ) {
          let deliveryapi = {}
          deliveryapi['request'] = isOrderAvailableOnFutura
          deliveryapi['action'] = "Reverse Delivery Note Create"
          var isReverseDeliveryNoteCreated = false

          try{              
              // param for reverse deliverynote

              var deliverynoteparam = await createdeliverynoteparam(
                params, orderinfo, shipmentinfo, futura_order_id, 
                isOrderAvailableOnFutura.result.Result.list_db_line[0].DB_Response[1].Field_value,
                shipment_id,
                creditmemoinfo,
                is_reverse = true
              )

              deliveryapi['request'] = deliverynoteparam
              // create reverse delievery note request
              var createreversedeliverynote = await createDeliveryNote(params,deliverynoteparam)
              deliveryapi['status'] = true
              deliveryapi['response'] = createreversedeliverynote
              var deliverynoterequest = createreversedeliverynote.lastcall
              isReverseDeliveryNoteCreated = true
          }catch(error){
              deliveryapi['status'] = false
              deliveryapi['response'] = error.message
              isReverseDeliveryNoteCreated = false
          }

          responseData['deliverynote'] = deliveryapi
        
    } else {
      if(delieveryNoteExistFlag == true)
      {
        futuraordercheck['status'] = false
        futuraordercheck['response'] = isOrderAvailableOnFutura
      }
      
    }

    responseData['futura_order_exist'] = futuraordercheck;

    var published = await sendcloudevent(
      params,
      params.DUSK_MAGENTO_PROVIDER_ID, 
      params.DUSK_LOGGING_EVENT_CODE, 
      responseData
    )
    
    const response = {
      statusCode: 200,
      body: {
        "delivery-note": {
          "delieveryNoteExistFlag": delieveryNoteExistFlag,
          "isReverseDeliveryNoteCreated": isReverseDeliveryNoteCreated
        },
        "futura-order": {
          "isOrderExistOnFutura": isOrderExistOnFutura
        },
        "response": responseData
      }
    }

    // log the response status code
    logger.info(`${response.statusCode}: successful request`)
    logger.info(response)
    return response
  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error'+ error, logger)
  }
}

exports.main = main