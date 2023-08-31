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
const {geViaretOrderInfo, getViareAuthcode} = require('../viare')
const {SearchMagentoOrder, addCommentintoOrder, Createshipment} = require('../magento')
const {sendcloudevent} = require('../token')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {

    let responseData = {};

    responseData["event_code"] = params.type;
    responseData["provider_id"] = params.source;
    responseData["event_id"] = params.event_id;
    
    const header = {
            'trace':1,
            'exceptions': true,
            'connection_timeout': 15
        }    

    // check for missing request input parameters and headers
    const requiredParams = []
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      // return and log client errors
      return errorResponse(400, errorMessage, logger)
    }

    // send authentication request
    var getauthentication = await getViareAuthcode(params)
    var authtoken = getauthentication.AuthenticateResult.Message;  
    
    // Get Viare order Info
    var viareorder = await geViaretOrderInfo(params.VIARE_ORDER_API, header, authtoken,params.data.message.orderID)

    if(viareorder.RetrieveResult.Code == 0){
        var orderinfo = viareorder.RetrieveResult.Data.Order

        //get Adobe commerce order Detail from Increment Id
        var magentorder = await SearchMagentoOrder(params, 'increment_id', orderinfo[0].AdminReference, "eq")
        var magentoOrderinfo = magentorder.items
    }else{
      var viareorderres = {}
          viareorderres['request'] = params.data
          viareorderres['action'] = "viare Order"
          viareorderres["entity"] = "Viare Assigned event"
          viareorderres['status'] = false
          viareorderres['response'] = viareorder
          responseData['viare'] = viareorder
    }

    // When Dispach assigned
    if(params.data.type == "dispatch.assigned" && viareorder.RetrieveResult.Code == 0){
          var viareassignedresponse = {}
          viareassignedresponse['request'] = params.data
          viareassignedresponse['action'] = "Assigned Order"
          viareassignedresponse["entity"] = "Viare Assigned event"
          try{
              // get the sku which assigned to the Location
              viareOrderItemskus = []
              orderinfo[0].OrderItems.OrderItem.forEach((item, index) => {
                  viareOrderItemskus.push(item.Style+" with qty "+item.Quantity)
              });

              // Payload for order comment in Adobe Commerce
              var payload  = {
                    "comment": viareOrderItemskus.join(', ')+" assigned to "+ params.data.message.dispatchPoint,
                    "status": magentoOrderinfo[0].status
                  }

              // Add comment into Adobe Commerce order
              var commentresponse  = await addCommentintoOrder(params,magentoOrderinfo[0].entity_id, {"statusHistory":payload})

              viareassignedresponse['status'] = true
              viareassignedresponse['response'] = commentresponse
          }catch(error){
             viareassignedresponse['status'] = false
             viareassignedresponse['response'] = error
          }

          responseData['viare'] = viareassignedresponse
    }


    // When click and collect order ready for Collect
    if(params.data.type == "dispatch.collect.received" && viareorder.RetrieveResult.Code == 0){
          var viareassignedresponse = {}
          viareassignedresponse['request'] = params.data
          viareassignedresponse['action'] = "Click and Collect Order Ready"
          viareassignedresponse["entity"] = "Ready For Dispatch Event"
          try{
              // get the sku which assigned to the Location
              viareOrderItemskus = []
              orderinfo[0].OrderItems.OrderItem.forEach((item, index) => {
                  viareOrderItemskus.push(item.Style+" with qty "+item.Quantity)
              });

              // Payload for order comment in Adobe Commerce
              var payload  = {
                    "comment": viareOrderItemskus.join(', ')+" ready for pickup in "+ params.data.message.dispatchPoint+" localtion.",
                    "status": magentoOrderinfo[0].status
                  }

              // Add comment into Adobe Commerce order
              var commentresponse  = await addCommentintoOrder(params,magentoOrderinfo[0].entity_id, {"statusHistory":payload})

              viareassignedresponse['status'] = true
              viareassignedresponse['response'] = commentresponse
          }catch(error){
             viareassignedresponse['status'] = false
             viareassignedresponse['response'] = error
          }

          responseData['viare'] = viareassignedresponse
    }

    // order is shipped event from viare
    if(params.data.type == "dispatch.shipped" && viareorder.RetrieveResult.Code == 0){
          var viareshippedresponse = {}
          viareshippedresponse['request'] = params.data
          viareshippedresponse['action'] = "Shipped Order"
          viareshippedresponse["entity"] = "Viare Shipped event"
        try{
              // add tracking data
              // TODO when we get tacking info with carrier code
              var tracks = []
              if(params.data.message && params.data.message.shipping){
                  params.data.message.shipping.forEach((track, index) => {
                      let trackinginfo = {} 
                      trackinginfo["track_number"] = track.reference
                      trackinginfo["title"] = "AUS POST"
                      trackinginfo["carrier_code"] = "custom"

                      tracks.push(trackinginfo)
                  })  
              }
              

              // Magento Item get data of bundle Items
              var bundleitems = {}
              magentoOrderinfo[0].items.forEach((item, index) => {
                  if(item.product_type == "bundle"){
                      bundleitems[item.item_id] = item.extension_attributes.bundle_shipment_type
                  }
                  
              }) 


              // shipment Items
              var orderitems = []
              orderinfo[0].OrderItems.OrderItem.forEach((item, index) => {
                  var itemId, bundleId
                  item.ItemInfo.OrderItemInfo.forEach((iteminfo, pos) => {
                       if(iteminfo.Key == "MagentoOrderItemId"){
                          itemId = iteminfo.Value
                       }

                       if(iteminfo.Key == "Bundle ID"){
                          bundleId = iteminfo.Value
                       }
                  })
                  if(bundleId){
                      if(bundleitems[bundleId] && bundleitems[bundleId] == 0){
                          itemId = bundleId
                      }
                  }
                  let iteminfo = {}
                  var orderiteminfo = item.ItemInfo.OrderItemInfo; 
                  iteminfo["order_item_id"] = parseInt(itemId)
                  iteminfo["qty"] = item.Quantity
                  orderitems.push(iteminfo)
              }) 
              
              // Payload for Create shipemt in Adobe Commerce
              var payload  = {
                    "items": orderitems,
                    "tracks": tracks
                  }  

              // shipment created
              var shipment  = await Createshipment(params,magentoOrderinfo[0].entity_id, payload)
              
              // get the sku which assigned to the Location
              /*viareOrderItemskus = []
              orderinfo[0].OrderItems.OrderItem.forEach((item, index) => {
                  viareOrderItemskus.push(item.Style)
              });*/

              viareshippedresponse['status'] = true
              viareshippedresponse['response'] = shipment

          }catch(error){
              viareshippedresponse['status'] = true
              viareshippedresponse['response'] = error
          }

          responseData['viare'] = viareshippedresponse


    }

    // Click and collect order is Shipped
    if(params.data.type == "dispatch.collect.collected" && viareorder.RetrieveResult.Code == 0){
        var viareshippedresponse = {}
          viareshippedresponse['request'] = params.data
          viareshippedresponse['action'] = "Click and Collected order Collected"
          viareshippedresponse["entity"] = "Viare Dispatch Collect Event"
        try{
              
              // Magento Item get data of bundle Items
              var bundleitems = {}
              magentoOrderinfo[0].items.forEach((item, index) => {
                  if(item.product_type == "bundle"){
                      bundleitems[item.item_id] = item.extension_attributes.bundle_shipment_type
                  }
                  
              }) 


              // shipment Items
              var orderitems = []
              orderinfo[0].OrderItems.OrderItem.forEach((item, index) => {
                  var itemId, bundleId
                  item.ItemInfo.OrderItemInfo.forEach((iteminfo, pos) => {
                       if(iteminfo.Key == "MagentoOrderItemId"){
                          itemId = iteminfo.Value
                       }

                       if(iteminfo.Key == "Bundle ID"){
                          bundleId = iteminfo.Value
                       }
                  })
                  if(bundleId){
                      if(bundleitems[bundleId] && bundleitems[bundleId] == 0){
                          itemId = bundleId
                      }
                  }
                  let iteminfo = {}
                  var orderiteminfo = item.ItemInfo.OrderItemInfo; 
                  iteminfo["order_item_id"] = parseInt(itemId)
                  iteminfo["qty"] = item.Quantity
                  orderitems.push(iteminfo)
              }) 
              
              // Payload for Create shipemt in Adobe Commerce
              var payload  = {
                    "items": orderitems,
                    "appendComment": true,
                    "comment": {
                        "comment": params.data.message.collectionPerson + " colleced the order.",
                        "is_visible_on_front": 0
                    }
                  }  

              // shipment created
              var shipment  = await Createshipment(params,magentoOrderinfo[0].entity_id, payload)
            

              viareshippedresponse['status'] = true
              viareshippedresponse['response'] = shipment

          }catch(error){
              viareshippedresponse['status'] = true
              viareshippedresponse['response'] = error
          }

          responseData['viare'] = viareshippedresponse
    }

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
    return errorResponse(500, error, logger)
  }
}

exports.main = main
