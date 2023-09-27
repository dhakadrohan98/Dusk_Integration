const soap = require('soap')
const jsonfile = require('jsonfile');
const NodeCache = require( "node-cache" );
const myCache = new NodeCache();
const axios = require('axios')

/* ------ Order  ---*/
const sending_magento_item_id = 1;
// Order Exist Payload
var orderExist = {
    "authenticationToken": "",
    "externalOrderID": ""
};
/* ---- Order ends --- */

// click and collect store codes
var cnc_stores = [33,194,94,7,153,178,64,152,2,148];

/**
 * check if authcode is exist in cache then we will get from cache
 * 
 * @param apiEndpoint
 * @param header
 * @param payload
 * @param forced by default it will false
 * @returns {boolean}
 * @constructor
 */
async function getViareAuthcode(params, forced=false){

    var token = myCache.get("viare_token");

    if(token == undefined || forced == true){
        var response = await SendViareAuthenticationRequest(params)
        await myCache.set("viare_token", response, 20000)
        return response;
    }else{
        return token
    }
}

/**
 * Send SOAP request for get Authcode
 * 
 * @param apiEndpoint
 * @param header
 * @param payload
 * @returns {boolean}
 * @constructor
 */
function SendViareAuthenticationRequest(params){

    const args = {
        "username": params.VIARE_USERNAME,
        "password": params.VIARE_PASSWORD
      };

      const header = {
      'trace':1,
      'exceptions': true,
      'connection_timeout': 15
    }

    return new Promise((resolve, reject) => {
            soap.createClient(params.VIARE_PRODUCT_API, header, function(err, client) {
            if(err){
              reject(err)
            }
            client.Authenticate(args, function(err, result) {
              if(err){
                reject(err)
              }else{
                resolve(result)
              }
            }, {timeout: params.SOAP_TIMEOUT})
          })
        })
}

/**
 *
 * @param apiEndpoint
 * @param header
 * @param payload
 * @returns {boolean}
 */
function sendProductDetail(apiEndpoint, header, payload, timeout){
    return new Promise((resolve, reject) => {
        soap.createClient(apiEndpoint, header, function(err, client) {
        if(err){
            reject(err)
        }
        client.UpdateProduct(payload, function(err, result) {
            if(err){
                reject(err)
            }else{
                resolve(result)
            }
        },{timeout: timeout})
    })
})
}

function updateProductImage(apiEndpoint, header, payload,timeout){
    return new Promise((resolve, reject) => {
        soap.createClient(apiEndpoint, header, function(err, client) {
        if(err){
            reject(err)
        }
        client.SetMainImage(payload, function(err, result) {
            if(err){
                reject(err)
            }else{
                resolve(result)
            }
        },{timeout: timeout})
    })
})
}

/**
 *
 * @param apiEndpoint
 * @param header
 * @param token
 * @param orderId
 * @returns {JSON}
 */
function geViaretOrderInfo(apiEndpoint, header, token, orderId) {
    var payload = {'authenticationToken': token, 'orderID': orderId}
    return new Promise((resolve, reject) => {
        soap.createClient(apiEndpoint, header, function(err, client) {
            if(err){
                reject(err)
            }
            client.Retrieve(payload, function(err, result) {
                if(err){
                    reject(err)
                }else{
                    resolve(result)
                }
            })
        })
    })
}

/**
 *
 * @param ecommerce_order_data
 * @param token
 * @returns {JSON}
 */
function generatePayloadForOrderExist(ecommerce_order_data, token)
{
    var order = ecommerce_order_data;
    var payload = orderExist;
    payload['authenticationToken'] = ""+token;
    payload['externalOrderID'] = ""+order.increment_id;

    return payload;
}

/**
 *
 * @param ecommerce_order_data
 * @param token
 * @returns {JSON}
 */
function generatePayloadForOrderCreate(ecommerce_order_data, token) 
{
    var orderItemData = [];
    var order = ecommerce_order_data;
    var payload = {};
    var freightProvider = 'Standard';

    if (typeof order.extension_attributes.shipping_assignments[0].shipping.address == 'undefined') {
        return false;
    }

    payload.authenticationToken = ""+token;

    var order_data = {};
    order_data.OrderDate = ""+changeDateFormate(order.created_at);
    order_data.Phone = "" + order.billing_address.telephone;
    order_data.Email = ""+order.customer_email;
    order_data.OrderStatus = 3;
    order_data.GiftWrapStatus = ((order.extension_attributes.gift_message) ? true : false);
    order_data.GiftMessage = ((order.extension_attributes.gift_message) ? order.extension_attributes.gift_message.message : "" );
    order_data.DeliveryInstructions = "";
    order_data.Currency = order.order_currency_code;
    order_data.PaymentMethod = 35;
    order_data.Freight = "" + order.base_shipping_amount;
    order_data.FreightDiscount = "" + order.base_shipping_discount_amount;
    order_data.FreightTax = "" + order.base_shipping_tax_amount;
    order_data.FreightIncludingTax = "" + order.base_shipping_incl_tax;
    order_data.FreightDiscountIncludingTax = "" + order.base_shipping_discount_amount;
    order_data.OrderBasedDiscount = "0";
    order_data.OrderBasedDiscountExcludingTax = "0";
    order_data.OrderTotal = "" + order.grand_total;

    // click and collect check
    if (order.extension_attributes.shipping_assignments[0].shipping.method == 'amstorepickup_amstorepickup') {
        freightProvider = 'Click and Collect';
        var click_collect_store_id = false;
        if (order.shipping_description != undefined) {
            var shipping_description = order.shipping_description            
            const [shippingdesc, cc_store_id] = shipping_description.split('|');
            if(typeof cc_store_id != 'undefined'){
                cc_store_id = cc_store_id.trim();
                if (Number.isInteger(cc_store_id)) {
                    order_data.CollectionStore = cc_store_id;
                    click_collect_store_id = true;
                }
            }            
        }
        if (!click_collect_store_id) {
            var randomIndex = Math.floor(Math.random() * cnc_stores.length);
            order_data.CollectionStore = cnc_stores[randomIndex];
        }
    }
    order_data.FreightProvider = freightProvider;
    order_data.Website = (order.order_currency_code == "AUD") ? 1 : 2;
    order_data.ExternalOrderSource = "Adobe Commerce";
    order_data.ExternalOrderID = "" + order.increment_id;
    order_data.AdminReference = "" + order.increment_id;

    order_data.Notes = {}

    var order_note = [];
    if(order.status_histories.length > 0){
        order.status_histories.forEach((item, index) => {
            order_note.push({"DisplayLevel": index, "Note": item.comment});
        });
    }
    order_data.Notes = order_note;

    var transaction_notes = [];
    transaction_notes.push({"TransactionType": "External", "TransactionAmount": order.grand_total, "TransactionStatus": 1});
    order_data.Transactions = { Transaction: { } };
    order_data.Transactions.Transaction = transaction_notes;

    var orderItemCount = 0;
    order.items.forEach((item, index) => {
        if (item.product_type == 'simple' && item.is_virtual != true) {
            var unitPrice = 0;
            var quantity = 0;
            var itemBasePriceIncludingTax = 0;
            var bundle_sku, bundle_id, unitDiscount, unitDiscountIncludingTax
            var itemInfo = []

            // @todo - we have to add Product attribute value here
            var shiptogether = 0

            if (
                (typeof item.parent_item != 'undefined') && 
                Object.keys(item.parent_item).length > 0 && 
                item.parent_item.product_type == 'bundle') {

                    if(item.parent_item.extension_attributes && item.parent_item.extension_attributes.bundle_ship_together){                        
                        shiptogether = item.parent_item.extension_attributes.bundle_ship_together
                    }
                    
                    var discount_percent = item.parent_item.discount_percent
                    // For dynamic price
                    if(item.base_price > 0) {
                        unitPrice = item.base_price
                        quantity = item.qty_ordered                        
                    } else { // For fixed price
                        unitPrice = item.extension_attributes.bundle_option_price
                        //quantity = item.extension_attributes.bundle_option_qty
                        quantity = item.qty_ordered
                    }
                    unitDiscount = (discount_percent > 0) ? calculatePercentage(unitPrice,discount_percent) : item.base_discount_amount;
                    bundle_sku = item.parent_item.sku
                    bundle_id = item.parent_item.item_id
                    unitDiscountIncTax = item.base_discount_invoiced / item.qty_invoiced
                    unittax = item.base_tax_invoiced / item.qty_invoiced
            } else {
                // Simple Product
                unitPrice = item.base_price
                quantity = item.qty_invoiced
                itemBasePriceIncludingTax = 0
                unitDiscount = (item.base_discount_invoiced - item.base_discount_tax_compensation_invoiced) / quantity;
                unitDiscountIncTax = item.base_discount_invoiced / quantity;
                unittax = item.base_tax_invoiced / quantity
                bundle_sku = null
                bundle_id = null
            }

            var unitNet = item.base_row_total_incl_tax / quantity;

            var itemData = {};
            var itemExtensionAttr = item.extension_attributes;
            var barcode = ((itemExtensionAttr) && (itemExtensionAttr.barcode) ) ? itemExtensionAttr.barcode : item.sku;
            itemData['Style'] = item.sku;
            itemData['Barcode'] = barcode;
            itemData['Quantity'] = quantity;
            itemData['StatusCode'] = "Unordered";
            itemData['UnitPrice'] = (unitPrice == 0 ? unitPrice : (unitPrice).toFixed(4));
            itemData['UnitPriceIncludingTax'] = (item.base_price_incl_tax == 0 ? item.base_price_incl_tax : (item.base_price_incl_tax).toFixed(4));
            itemData['UnitDiscount'] = unitDiscount;
            itemData['UnitDiscountIncludingTax'] = unitDiscountIncTax;
            itemData['UnitTax'] = (unittax == 0 ? unittax : (unittax).toFixed(4) );
            itemData['UnitNet'] = (unitNet == 0 ? unitNet : (unitNet).toFixed(4)); // UnitPrice minus the UnitDiscount plus UnitTax.
            itemData['Parent'] = 0;
            itemData['ItemCompositeType'] = "Product";

            if(sending_magento_item_id == 1) {
                itemInfo.push({"OrderItemInfo": { "Key": "MagentoOrderItemId", "Value": item.item_id }});   
            }

            if(shiptogether == 1 && bundle_sku != null && bundle_id != null) {
                itemInfo.push({"OrderItemInfo": { "Key": "Bundle SKU", "Value": bundle_sku }});
                itemInfo.push({"OrderItemInfo": { "Key": "Bundle ID", "Value": bundle_id }});
            }
            
            itemData['ItemInfo'] = itemInfo;
         
            orderItemData[orderItemCount] = itemData;
            orderItemCount++;
        }
    });

    order_data.OrderItems = {"OrderItem": orderItemData};
    var customer_addresses = [];
    
    var billing_address = {
        "Type": "Billing",
        "FirstName": ""+order.billing_address.firstname,
        "LastName": ""+order.billing_address.lastname,
        "ContactPhone": ""+order.billing_address.telephone,
        "Street": ""+order.billing_address.street[0],
        "Suburb": ""+order.billing_address.city,
        "State": ""+order.billing_address.region,
        "Postcode": ""+order.billing_address.postcode,
        "City": ""+order.billing_address.city,
        "Company": (order.billing_address.company && order.billing_address.company.length > 0 ? ""+order.billing_address.company: ""),
        "Country": "AUS", //""+order.billing_address.country_id
    };

    var shipping_address = order.extension_attributes.shipping_assignments[0].shipping.address;
    var shipping_address = {
        "Type": "Shipping",
        "FirstName": ""+shipping_address.firstname,
        "LastName": ""+shipping_address.lastname,
        "ContactPhone": ""+shipping_address.telephone,
        "Street": ""+shipping_address.street[0],
        "Suburb": ""+shipping_address.city,
        "State": ""+shipping_address.region,
        "City": ""+shipping_address.city,
        "Postcode": ""+shipping_address.postcode,
        "Company": (shipping_address.company && shipping_address.company.length > 0 ? ""+shipping_address.company: ""),
        "Country": "AUS", //""+order.billing_address.country_id
    };

    customer_addresses.push(billing_address);
    customer_addresses.push(shipping_address);
    order_data.Addresses = {"CustomerAddress": customer_addresses};
    payload.order = order_data;
    
    return payload
}

/**
 *
 * @param apiEndpoint
 * @param header
 * @param payload
 * @returns {JSON}
 */
function isOrderExist(apiEndpoint, header, payload)
{
    return new Promise((resolve, reject) => {
        soap.createClient(apiEndpoint, header, function(err, client) {
            if(err){
                reject(err)
            }
            client.Search(payload, function(err, result) {
                if(err){
                    reject(err)
                }else{
                    resolve(result)
                }
            })
        })
    })
}

/**
 *
 * @param apiEndpoint
 * @param header
 * @param payload
 * @returns {boolean}
 */
function createOrderOnViare(apiEndpoint, header, payload){
    return new Promise((resolve, reject) => {
            soap.createClient(apiEndpoint, header, function(err, client) {
            if(err){
                reject(err)
            }
            client.ImportOrder(payload, function(err, result) {
                if(err){
                    reject(err)
                }else{
                    resolve(result)
                }
            })
        })
})
}

/*
 * Change date format to YYYY-MM-DD
 * @param date
 * @returns {string}
 * */
function changeDateFormate(date) {
    const newdate = new Date(date);
    const year = newdate.getFullYear();
    const month = String(newdate.getMonth() + 1).padStart(2, '0');
    const day = String(newdate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

//ClickAndCollect functionality for multiple skus & multiple stores
async function clickAndCollect(params, skuArray, storesArray) {
    var finalResponse = {};
    var storeIds = storesArray.join(',');
    var skuArrayLength = skuArray.length;
    const requests = skuArray.map( (sku) => 
          axios.get(params.VIARE_CLICK_COLLECT_URL+sku+"?stores="+storeIds)
      );
      //https://dusk.viare.io/api/availability/store/50209484?stores=100
      try {
        const response = await Promise.all(requests);
        var k=0;
        response.map((item) => {
            var i=0;
            var tempArr=[];
            while(i<item.data.length) {
                var branchVal =item.data[i].Branch;
                var actualVal =item.data[i].Barcodes[0].Value;
                tempArr[i] = {"Branch": branchVal,"qty":actualVal};
                i++;
            }
                var sku = skuArray[k];
                finalResponse[sku] = tempArr;
                k++;
           });            
      } 
      catch (error) {
        finalResponse = error.message
      }
      return finalResponse;
}

// async function clickAndCollect(params,skuArray,storesArray){
//   var finalResponse = {};
  
//   var storeIds = storesArray.join(',')

//   for(j=0; j<skuArray.length; j++) {
    
//         var config = {
//           method: 'get',
//           url: params.VIARE_CLICK_COLLECT_URL+ skuArray[j]+'?stores=' +storeIds
//         };

//         var sku = skuArray[j];

//         try {
//           var response = await axios(config);
    
//           if (response.status == 200) {
//             var tempArr=[];
//             for(k=0; k < response.data.length; k++) {
//               var branchVal =response.data[k].Branch;
//               var actualVal =response.data[k].Barcodes[0].Value;
    
//               tempArr.push({"Branch": branchVal,"qty":actualVal});
//             }
//             finalResponse[sku]=tempArr;
//             // final[sku[i].qty] = finalResponse[i].Barcodes[0].Value;
//           }
//         } catch (error) {
//             finalResponse[sku]={"error": error.message};
//       }
//     }
//     return finalResponse;
// }

function calculatePercentage(amount, percentage)
{
    return ((amount * percentage) / 100).toFixed(2);
}

function getDispatchBranchNumber(dispatchPoint)
{
    var dispatchBranchNumber = 0;
    var [branchname, storeid] = dispatchPoint.split('|');
    storeid = parseInt(storeid.trim());

    if (Number.isInteger(storeid)) {
        dispatchBranchNumber = storeid
    }

    return dispatchBranchNumber;
}

//noinspection JSAnnotator
module.exports = {
  getViareAuthcode,
  sendProductDetail,
  updateProductImage,
  generatePayloadForOrderCreate,
  createOrderOnViare,
  geViaretOrderInfo,
  clickAndCollect,
  isOrderExist,
  generatePayloadForOrderExist,
  getDispatchBranchNumber
}
