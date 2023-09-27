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
const axios = require('axios');
var soap = require('soap');
const { Core, Events } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils')
const { getOrderInfo } = require('../magento')
const { getViareAuthcode, generatePayloadForOrderCreate, createOrderOnViare, geViaretOrderInfo,
    isOrderExist, generatePayloadForOrderExist } = require('../viare')

const {generatePayloadForFuturaFromEcomOrder, createOrderOnFutura, isOrderExistonFutura, payloadForExistingOrderCheck, getCommonById } = require('../futura');
const { CloudEvent } = require("cloudevents");
const { generateToken, sendcloudevent } = require('../token')

// main function that will be executed by Adobe I/O Runtime
async function main(params) {
    // create a Logger
    const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });

    const ecommerce_order_endpoint = params.ECOMMERCE_API_URL + params.ECOMMERCE_ORDER_ENDPOINT + '/';

    const providerId = params.VIARE_ORDER_CREATE_PROVIDERCODE;
    const eventCode = params.VIARE_ORDER_CREATE_EVENT_CODE;

    var futura_result = {};
    var responseData = {};

    responseData["event_code"] = eventCode;
    responseData["entity"] = "Order";

    try {
        // check for missing request input parameters and headers
        const requiredParams = [/* add required params */]
        const requiredHeaders = []
        const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
        if (errorMessage) {
            // return and log client errors
            return errorResponse(400, errorMessage, logger)
        }

        // extract the user Bearer token from the Authorization header
        const token = await generateToken(params);

        const viareOrderSearchEndpoint = params.VIARE_ORDER_SEARCH_API

        const header = {
            'trace': 1,
            'exceptions': true,
            'connection_timeout': 15
        }

        /*----  Viare Authtoken Generation ---*/
        try {
            var getauthentication = await getViareAuthcode(params)
        } catch (error) {
            var getauthentication = error
        }

        /*----  Viare Authtoken Generation | Ends ---*/

        /*
        * Checking order ID is exists with params or not
        * */
        if ((params.data.order) && (params.data.order.entity_id)) {
            //var order_id = params.data.value.id;
            //order_data =  await getOrderInfo(params, order_id)
            var order_id = params.data.order.entity_id;
            var viareorder= false, futuraorder = false
            var order_data = {};
            order_data = params.data.order;
            var isgiftcardAvailable = false, isLoyaltyPurchaseAvailable = false, isLoyaltyRenewAvailable = false



            // Check for Gift card product, Loyalty Create or Loyalty Renew

            order_data.items.forEach((item, index) => {
                // check for gift card product exists
                if (item.product_type == 'giftcard') {
                    isgiftcardAvailable = true
                }

                // check for Loyalty Product exists
                if(item.sku == params.FUTURA_PURCHASE_LOYALTY_SKU){

                    // if customer has givex number then we will consider for renew
                    if(params.data.givexnumber){
                        isLoyaltyRenewAvailable = true
                    }else{
                        isLoyaltyPurchaseAvailable = true
                    }
                }
            });

            //  <<<<<<<<< Viare Order Check >>>>>>>>>>>

            if ((getauthentication) && (getauthentication.AuthenticateResult) && (getauthentication.AuthenticateResult.Message)) {
                var authtoken = getauthentication.AuthenticateResult.Message;

                /** -- Generate payload and check order is existing or not -- */
                var orderCheckPayload = generatePayloadForOrderExist(order_data, authtoken)
                var isOrderExistData = await isOrderExist(params.VIARE_ORDER_API, header, orderCheckPayload);
                var existingOrderId = 0;
                /** -- Generate payload and check order is existing or not | Ends -- */

                /** -- Log the response if the order is exists othewise generate the order and log the response -- */
                var order_create = {};
                if (
                    (Object.keys(isOrderExistData).length > 0) &&
                    (typeof isOrderExistData.SearchResult != 'undefined') &&
                    (isOrderExistData.SearchResult.Success == true) &&
                    (isOrderExistData.SearchResult.Data != null) &&
                    (typeof isOrderExistData.SearchResult.Data.int != 'undefined') &&
                    (typeof isOrderExistData.SearchResult.Data.int[0] != 'undefined')
                ) {
                    existingOrderId = isOrderExistData.SearchResult.Data.int[0];
                    responseData['viare_existing_order'] = {
                        "status": true,
                        "request": orderCheckPayload,
                        "response": isOrderExistData,
                        "action": "Order exist check",
                        "status_code": 200
                    }
                    viareorder= true
                } else {
                    var payload = generatePayloadForOrderCreate(order_data, authtoken);
                    if (payload !== false) {
                        order_create = await createOrderOnViare(params.VIARE_ORDER_API, header, payload);
                        responseData['viare'] = {
                            "status": (order_create.ImportOrderResult.Code == 0) ? true : false,
                            "request": payload,
                            "response": order_create,
                            "action": "Creating Order",
                            "status_code": (order_create.ImportOrderResult.Code == 0) ? 200 : 400
                        };

                        viareorder = (order_create.ImportOrderResult.Code == 0) ? true : false
                        var viareOrderId = 0;
                        var viareOrderItems = [];

                        if (Object.keys(order_create).length !== 0) {
                            if (order_create.ImportOrderResult.Code == 0) {
                                /* <<<---- Oredr ID and Order Item ID Sync --->>> */
                                // var orderIdViare = order_create.ImportOrderResult.Data.int[0];
                                // var viare_order_info = await geViaretOrderInfo(params.VIARE_ORDER_API, header, authtoken, orderIdViare)
                                //
                                // if (viare_order_info.RetrieveResult && (viare_order_info.RetrieveResult.Code == 0)){
                                //     var viareOrder = viare_order_info.RetrieveResult.Data.Order[0];
                                //     viareOrderId = viareOrder.ID;
                                //     var orderItems = viareOrder.OrderItems.OrderItem;
                                //     orderItems.forEach((item, index) => {
                                //         viareOrderItems.push({'sku': item.Barcode, 'item_id': item.ID, 'order_id': item.OrderID})
                                //     })
                                // }        
                                /* <<<---- Oredr ID and Order Item ID Sync --->>> */
                            }
                        }
                    } else {
                        // When only virtual products are available in the cart
                        viareorder= true
                    }
                }
            } else {
                responseData['viare'] = {
                    "status": false,
                    "request": {},
                    "response": { 'errorCode': getauthentication.errno, "message": (getauthentication.errno == '-3008' ? "Not able to connect. Server timeout." : "Something went wrong.") },
                    "action": "Viare Authorization Token",
                    "status_code": 502
                };
            }



            // <<<<<<<<<<< Viare Order Check | Ends >>>>>>>>>>>>>


            /** -- Futura order check  -- */
            /** -- Checking order is already exists or not on futura -- */
            var futura_order_id = parseInt(params.FUTURA_ORDER_RANGE) + parseInt(order_data.increment_id);
            var payloadForExistingOrderCheckFutura = payloadForExistingOrderCheck(futura_order_id);
            try {
                var isOrderAvailableOnFutura = await isOrderExistonFutura(futura_order_id, params, payloadForExistingOrderCheckFutura);

                if (
                    (typeof isOrderAvailableOnFutura != 'undefined') &&
                    (typeof isOrderAvailableOnFutura.result != 'undefined') &&
                    (isOrderAvailableOnFutura.result.Result != null) &&
                    (typeof isOrderAvailableOnFutura.result.Result.list_db_line != 'undefined') &&
                    (isOrderAvailableOnFutura.result.Result.list_db_line[0].DB_Response[0].Field_value == futura_order_id)
                ) {

                    responseData['futura_existing'] = {
                        "status": true,
                        "request": payloadForExistingOrderCheckFutura,
                        "response": isOrderAvailableOnFutura,
                        "action": "Order exist check",
                        "status_code": isOrderAvailableOnFutura.statusCode
                    };

                    futuraorder = true

                } else {
                    /** -- Creating order on Futura -- */
                    var futura_customer_id = params.data.futura_customer_id;
                    var only_bundle_item_exist = true;
                    // Check if only bundle item is there or not
                    order_data.items.forEach((item, index) => {
                        if (item.product_type != 'bundle') {
                            only_bundle_item_exist = false;
                        }
                    });
                    // If other product type exist then it will create the order
                    if (only_bundle_item_exist == false) {
                        var futura_payload_string = generatePayloadForFuturaFromEcomOrder(order_data, futura_order_id, futura_customer_id, params);
                        var payloadFuturaOrder = { "lines": { "string": futura_payload_string } };

                        try {
                            futura_result = await createOrderOnFutura(payloadFuturaOrder, params)

                            if (Object.keys(futura_result).length > 0) { // t
                                responseData['futura_order'] = {
                                    "status": ((futura_result.result.Result) && (futura_result.result.Result == true)) ? true : false,
                                    "request": payloadFuturaOrder,
                                    "response": futura_result,
                                    "action": "Creating Order",
                                    "status_code": futura_result.statusCode
                                };
                                futuraorder = ((futura_result.result.Result) && (futura_result.result.Result == true)) ? true : false
                            } else {
                                responseData['futura_order'] = {
                                    "status": false,
                                    "request": payloadFuturaOrder,
                                    "response": futura_result,
                                    "action": "Creating Order",
                                    "status_code": 503
                                };
                            }

                        } catch (error) {
                            responseData['futura'] = {
                                "status": false,
                                "request": payloadFuturaOrder,
                                "response": error,
                                "action": "Creating Order",
                                "status_code": 503
                            };
                        }

                    } else {
                        // If bundle product is exist then it will not create the order
                        responseData['futura'] = {
                            "status": true,
                            "request": order_data,
                            "response": { 'message': "Only bundle product exist in the order." },
                            "action": "Creating Order",
                            "status_code": 200
                        };
                        futuraorder = true
                    }



                }

            } catch (error) {
                responseData['futura'] = {
                    "status": false,
                    "request": payloadForExistingOrderCheckFutura,
                    "response": error,
                    "action": "Order exist or not",
                    "status_code": 502
                };
            }

            // if futura and viare both get success
            if(futuraorder == true && viareorder == true){
                // Create order on GIVEX if the loyaltynumber is available
                if((params.data.order) && (params.data.givexnumber))
                {
                    var loyaltypoints_payload = {"value": {"givexnumber": ""+params.data.givexnumber, "order": params.data.order}}
                    var loyaltypointsresponse = await sendcloudevent(
                        params,
                        params.GIVEX_LOYALTYPOINTS_PROVIDER_ID,
                        params.GIVEX_LOYALTYPOINTS_EVENTCODE,
                        loyaltypoints_payload
                    );
                }

                // if gift card product is there execute giftcard purchase event
                if(isgiftcardAvailable == true){
                    var giftcardPayload = { "value": { "order": params.data.order, "futura_id": params.data.futura_customer_id } }
                    // Checking if the futura order is created or not. If futura order is created means giftcard order is 
                    // also created.
                    if(
                        (responseData.futura_order) && 
                        (responseData.futura_order.status) && 
                        (responseData.futura_order.status == true) 
                    ) {
                        // Event Call | It will not create any giftcard if the order is not having any giftcard type item
                        var gitcardResponse = await sendcloudevent(
                            params,
                            params.GIVEX_GIFTCARD_CREATE_PROVIDER_ID,
                            params.GIVEX_GIFTCARD_CREATE_EVENTCODE,
                            giftcardPayload
                        );
                    }
                }

                // If Purchase new loyalty card this execute this event
                if(isLoyaltyPurchaseAvailable == true){
                    var loyaltypayload = {"order_id": params.data.order.entity_id , "futura_id": params.data.futura_customer_id }
                    var loyaltypurchase = await sendcloudevent(params,params.GIVEX_PROVIDER_ID,params.GIVEX_PURCHASE_LOYALTYMEMBER_CODE,{"value": loyaltypayload})
                }

                // If renew Loyalty card then execute this event
                if(isLoyaltyRenewAvailable == true){
                    
                    var renewloyaltypayload = {"order_id": params.data.order.entity_id , "futura_id": params.data.futura_customer_id }
                    var loyaltypurchase = await sendcloudevent(params,params.GIVEX_PROVIDER_ID,params.GIVEX_RENEW_LOYALTYMEMBER_CODE,{"value": renewloyaltypayload})
                }
            }


            /** -- Futura order check | Ends  -- */
        }

        try { 

            //Magento Logging
            var final_response = await sendcloudevent(
                params,
                params.DUSK_MAGENTO_PROVIDER_ID,
                params.DUSK_LOGGING_EVENT_CODE,
                responseData
            );
        } catch (error) {
            const final_response = error.message
        }

        logger.info(" Viare-Order Response Data: ");
        logger.info(responseData, null, 4);
        // logger.info(" Viare-Order Final Response: ");
        // logger.info(final_response, null, 4);

        const response = {
            statusCode: 200,
            body: final_response
        }

        // log the response status code
        logger.info(`${response.statusCode}: successful request`)
        return response
    } catch (error) {
        // log any server errors
        // return with 500
        const error_response = {
            statusCode: 200,
            body: {                
                "Error": error.message
            }
        }
        //return errorResponse(error.statusCode, 'Server Error: ' + ((error.message) ? (error.message) : error.error), logger)
        return error_response
    }
}

async function createCloudEvent(providerId, eventCode, payload) {

    let cloudevent = new CloudEvent({
        source: 'urn:uuid:' + providerId,
        type: eventCode,
        datacontenttype: "application/json",
        data: payload,
        id: providerId
    });
    return cloudevent
}


exports.main = main
