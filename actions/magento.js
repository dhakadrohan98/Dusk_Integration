const axios = require('axios');
var request = require('request').defaults({ encoding: null });


async function getProduct(params){

    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_PRODUCT_ENDPOINT+'/'+params.data.value.sku; //params.data.value.sku-/SG7878787
    
    var config = {
      method: 'get',
      url: url.replace(/\\\//g, "/"), 
      headers: { 
        'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
      }
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
    
}

//updating rma in magento
async function updateRMA(params,payload,rma_id){

    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_RETURNS_ENDPOINT+'/'+rma_id; //params.data.value.entity_id-/18

    var config = {
      method: 'put',
      url: url.replace(/\\\//g, "/"),
      headers: { 
        'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN, 
        'Content-Type': 'application/json'
      },
      data : JSON.stringify(payload)
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}


async function getCustomer(params, id){

    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_CUSTOMER_ENDPOINT+'/'+id; //params.data.value.entity_id-/18
    
    var config = {
      method: 'get',
      url: url.replace(/\\\//g, "/"), 
      headers: { 
        'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
      }
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
    
}

async function getCustomerByEmail(params, email){

    var urlparams = "search?searchCriteria[filterGroups][0][filters][0][field]=email&searchCriteria[filterGroups][0][filters][0][value]="+encodeURIComponent(email)+"&searchCriteria[filterGroups][0][filters][0][condition_type]=eq"
    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_CUSTOMER_ENDPOINT+'/'+urlparams; //params.data.value.entity_id-/18
    
    var config = {
      method: 'get',
      url: url.replace(/\\\//g, "/"), 
      headers: { 
        'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
      }
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}

async function getProductOptions(params,attributecode,optionId) {

    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_PRODUCT_ATTRIBUTE_OPTIONS_ENDPOINT+'/'+attributecode+'/options'; //params.data.value.entity_id-/18
    
    var config = {
      method: 'get',
      url: url.replace(/\\\//g, "/"), 
      headers: { 
        'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
      }
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            var label="";
            var options = response.data;
            for(var attributename in options){
                if(options[attributename]['value'] == optionId){
                    label = options[attributename]['label'];
                }
            }
            return label;
        }
    }catch(error){
        return error;
    }
}

async function UpdateCustomerInMagento(params,payload,id){
    if(typeof payload.customer.custom_attributes != "undefined" && payload.customer.custom_attributes.length > 0)
    {
        for (var i = 0; i < payload.customer.custom_attributes.length; i++) 
        {
            // Checking if custom attribute of customer has expiry date or not
            if(payload.customer.custom_attributes[i].attribute_code == "rewards_expiry_date")
            {
                expirydateinpayload = payload.customer.custom_attributes[i].value
                var currentAusDate = new Date().toLocaleDateString("en-US", {timeZone: "Australia/Sydney"});
                var currentAusDateIso = new Date(currentAusDate);
                var expirydateIso = new Date(expirydateinpayload);
               //Checking if customer is not already in loyalty customer group and non-expired loyalty membership
               if(payload.customer.group_id != params.ECOMMERCE_CUSTOMER_LOYALTY_GROUP_ID && currentAusDateIso.getTime() < expirydateIso.getTime()){
                    for (var j = 0; j < payload.customer.custom_attributes.length; j++) {
                        // checking if custom attribute of customer is having givex number or not
                        if(payload.customer.custom_attributes[j].attribute_code == "givex_number"){
                            payload.customer.group_id = params.ECOMMERCE_CUSTOMER_LOYALTY_GROUP_ID;
                        }
                    }    
                }else if(payload.customer.group_id != params.ECOMMERCE_CUSTOMER_GENERAL_GROUP_ID && currentAusDateIso.getTime() > expirydateIso.getTime()){
                    payload.customer.group_id = params.ECOMMERCE_CUSTOMER_GENERAL_GROUP_ID;
                }
            }
        }
    }
    
    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_CUSTOMER_ENDPOINT+'/'+id; //params.data.value.entity_id-/18
    var config = {
      method: 'put',
      url: url.replace(/\\\//g, "/"),
      headers: { 
        'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN, 
        'Content-Type': 'application/json'
      },
      data : JSON.stringify(payload)
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}

async function converImageintoBase64(imageurl)
{
     return new Promise((resolve, reject) => {
        request.get(imageurl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                data = Buffer.from(body).toString('base64');
                resolve(data);
            }else{
                reject(error);
            }
        });
     })
}

async function getOrderInfo(params, order_id){

    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_ORDER_ENDPOINT+'/'+order_id;

    var config = {
        method: 'get',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
            'Content-Type': 'application/json'
        },
        data : {}
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        } else {
            return response.data;
        }
    }catch(error){
        return error;
    }
}

async function SearchMagentoOrder(params, field , value, condition="eq"){

    var urlparams = "searchCriteria[filter_groups][0][filters][0][field]="+field+"&searchCriteria[filter_groups][0][filters][0][value]="+value+"&searchCriteria[filter_groups][0][filters][0][condition_type]="+condition

    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_ORDER_ENDPOINT+'/?'+urlparams;

    var config = {
        method: 'get',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
            'Content-Type': 'application/json'
        },
        data : {}
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}


async function addCommentintoOrder(params, order_id, payload){

    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_ORDER_ENDPOINT+'/'+order_id+'/'+params.ECOMMERCE_ORDER_COMMENT_ENDPOINT;

    var config = {
        method: 'post',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
            'Content-Type': 'application/json'
        },
        data : payload
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}

/**
 *
 * Create shipment in adobe commerce
 *
 * @param {object} params action input parameters.
 * @param {string} magento order id
 * @param {payload} shipment payload
 * @returns {object} shipment object or shipment id
 *
 */
async function Createshipment(params, order_id, payload){

    var urlstring = params.ECOMMERCE_ORDER_SHIP_ENDPOINT
    var url = params.ECOMMERCE_API_URL+urlstring.replace(":orderId", order_id);

    var config = {
        method: 'post',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
            'Content-Type': 'application/json'
        },
        data : payload
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}

/**
 *
 * get shipment in adobe commerce
 *
 * @param {object} params action input parameters.
 * @param {string} magento shipment id
 * @returns {object} shipment object
 *
 */
async function getshipmentInfo(params, shipment_id){

    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_SHIPMENT_ENDPOINT+"/"+shipment_id;

    var config = {
        method: 'get',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
            'Content-Type': 'application/json'
        }
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}


/**
 *
 * get futura stage table from adobe commerce
 *
 * @param {object} params action input parameters.
 * @param {string} magento futura_id
 * @returns {object} Futura stage object
 *
 */
async function getFuturaCustomer(params, futura_id){
    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_FUTURA_STAGE_ENDPOINT+"/"+futura_id;

    var config = {
        method: 'get',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN
        }
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}

/**
 *
 * Save data in futura stage table from adobe commerce
 *
 * @param {object} params action input parameters.
 * @param {string} magento futura_id
 * @returns {object} Futura stage object
 *
 */
async function SaveFuturaCustomer(params, payload){
    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_FUTURA_STAGE_SAVE_ENDPOINT;

    var config = {
        method: 'post',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN
        },
        data : payload
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}

//Getting RMA Details
async function getRMADetails(params){
    var rma_id;
    if(params.data.rma_id != undefined){
        rma_id = params.data.rma_id
    }
    else {
        rma_id = params.data.value.entity_id;
    }
    
    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_RETURNS_ENDPOINT+"/"+rma_id;
    var config = {
        method: 'GET',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
            'Content-Type': 'application/json'
        }
      };

      try {
        var response = await axios(config);
  
        if (response.status == 200) {
            return response.data;
        }
      } catch (error) {
            return "Error: "+error.message;
        }
}

async function getCreditmemoInfo(params, creditmemo_id)
{
    var url = params.ECOMMERCE_API_URL+"creditmemo/"+creditmemo_id;

    var config = {
        method: 'get',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
            'Content-Type': 'application/json'
        }
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return params.data.value.creditmemo_info;
    }
}

async function SearchShipmentOfOrder(params, field , value, condition="eq"){

    var urlparams = "searchCriteria[filter_groups][0][filters][0][field]="+field+"&searchCriteria[filter_groups][0][filters][0][value]="+value+"&searchCriteria[filter_groups][0][filters][0][condition_type]="+condition

    var url = params.ECOMMERCE_API_URL+'shipments'+'/?'+urlparams;

    var config = {
        method: 'get',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
            'Content-Type': 'application/json'
        },
        data : {}
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}

function itemLeftForShipment(order)
{
    var result = false
    order.items.forEach((item, index) => {
        var qty = getSimpleQtyToShip(item.qty_ordered, item.qty_shipped, item.qty_refunded, item.qty_canceled)
        if(qty > 0){
            result = true;
        }
    });

    return result;
}

function getSimpleQtyToShip(qty_ordered, qty_shipped, qty_refunded, qty_canceled) {
    const qty = qty_ordered - Math.max(qty_shipped, qty_refunded) - qty_canceled;
    return Math.max(parseFloat(qty.toFixed(8)), 0);
}

async function getRmaOfOrder(order_id, params)
{
    var urlparams = "searchCriteria[filter_groups][0][filters][0][field]=order_id&searchCriteria[filter_groups][0][filters][0][value]="+order_id+"&searchCriteria[filter_groups][0][filters][0][condition_type]=eq"

    var url = params.ECOMMERCE_API_URL+params.ECOMMERCE_RMA_ENDPOINT+'/?'+urlparams;

    var config = {
        method: 'get',
        url: url.replace(/\\\//g, "/"),
        headers: {
            'Authorization': 'Bearer '+params.ECOMMERCE_AUTHORIZED_TOKEN,
            'Content-Type': 'application/json'
        },
        data : {}
    };

    try{
        var response = await axios(config);

        if(response.status == 200){
            return response.data;
        }
    }catch(error){
        return error;
    }
}


module.exports = {
  getProduct,
  updateRMA,
  getCustomer,
  UpdateCustomerInMagento,
  converImageintoBase64,
  getOrderInfo,
  getProductOptions,
  SearchMagentoOrder,
  addCommentintoOrder,
  Createshipment,
  getshipmentInfo,
  getCustomerByEmail,
  getFuturaCustomer,
  SaveFuturaCustomer,
  getRMADetails,
  getCreditmemoInfo,
  SearchShipmentOfOrder,
  itemLeftForShipment,
  getRmaOfOrder
}