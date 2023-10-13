const soap = require('soap')
const { Core } = require('@adobe/aio-sdk')
const logger = Core.Logger('main', { level: 'info' })
const { futuraDateFormat, formatDateIso } = require('./utils')
const { async } = require('regenerator-runtime')
var customer = {
    "web_kde_nummer": 0,
    "web_kde_typ": 3,
    "web_kde_index": "",
    "web_kde_filiale": 0,
    "web_kde_land": "1",
    "web_kde_region": "0",
    "web_kde_konto": 0,
    "web_kde_vertreter": 0,
    "web_kde_rabatt": 0,
    "web_kde_rab_regel": 0,
    "web_kde_kondition": "",
    "web_kde_waehrung": "",
    "web_kde_provision": 0,
    "web_kde_kreditlimit": 0,
    "web_kde_eigensch_typ": 0,
    "web_kde_eigen_page": 0,
    "web_kde_eigensch": "",
    "web_kde_berater": 0,
    "web_kde_eigensch_aend": 0,
    "web_kde_kreditvers": "",
    "web_kde_haendler": 0,
    "web_kde_preisstufe": 0,
    "web_kde_egsteuernr": "",
    "web_kde_fasteuernr": "",
    "web_kde_keine_ust": 0,
    "web_kde_skonto": 0,
    "web_kde_skonto_frist": 0,
    "web_kde_plz_index": "",
    "web_kde_prio": 0,
    "web_kde_tour": 0,
    "web_error": {
        "web_err_nr": 0,
        "web_err_txt": ""
    }
}

var commonfield = {
    "web_add_typ": 3,
    "web_add_number": 0,
    "web_add_index": "B0",
    "web_add_zahlart": 0,
    "web_add_zahlinttyp": 0,
    "web_add_zahlintcount": 0,
    "web_add_last_rg_datum": "1899-12-30T00:00:00.000Z",
    "web_add_last_pay_datum": "1899-12-30T00:00:00.000Z",
    "web_add_kundennummer": "",
    "web_add_bankname": "",
    "web_add_bankleitzahl": "",
    "web_add_bankkonto": "",
    "web_add_bic": "",
    "web_add_iban": "",
    "web_add_kreditkarte": "",
    "web_add_sperrdatum": "1899-12-30T00:00:00.000Z",
    "web_add_sperrgrund": "",
    "web_add_last_sammelrg_datum": "1899-12-30T00:00:00.000Z",
    "web_add_manumahnung": 0,
    "web_add_status": 0,
    "web_add_loesch_datum": "1899-12-30T00:00:00.000Z",
    "web_add_inactive": 0,
    "web_add_bildname": "",
    "web_add_zahlziel": 0,
    "web_add_gutschrift": 0,
    "web_add_sprache": "",
    "web_add_fibuexport_first": "1899-12-30T00:00:00.000Z",
    "web_add_fibuexport_last": "1899-12-30T00:00:00.000Z",
    "web_add_vfw_bereich": 0,
    "web_add_rg_druckrabatt": 0,
    "web_add_rg_druckformat": 0,
    "web_add_info_nodisplay": 0,
    "web_add_externid": "",
    "web_add_geschlecht": 0,
    "web_add_werbung": 0,
    "web_add_master_typ": 0,
    "web_add_master_nummer": 0,
    "web_add_karte_erfasst": "1899-12-30T00:00:00.000Z",
    "web_add_karte_ausgegeben": "1899-12-30T00:00:00.000Z",
    "web_add_ohne_bonus": 0,
    "web_add_wf_status": 0,
    "web_add_wf_flags": 0,
    "web_add_wf_id": 0,
    "web_add_wf_date_time_1": "1899-12-30T00:00:00.000Z",
    "web_add_wf_date_time_2": "1899-12-30T00:00:00.000Z",
    "web_add_wf_date_time_3": "1899-12-30T00:00:00.000Z",
    "web_add_import_datum": "1899-12-30T00:00:00.000Z",
    "web_add_export_datum": "1899-12-30T00:00:00.000Z",
    "web_add_datum_user": "1899-12-30T00:00:00.000Z",
    "web_add_obild": "",
    "web_add_obild_ext": "",
    "web_add_clog_user": 0,
    "web_add_clog_date_time": "1899-12-30T00:00:00.000Z",
    "web_add_ulog_user": 0,
    "web_add_ulog_date_time": "1899-12-30T00:00:00.000Z",
    "web_error": {
        "web_err_nr": 0,
        "web_err_txt": ""
    }
}

var address = {
    "web_ans_typ": 3,
    "web_ans_number": 0,
    "web_ans_count": 1,
    "web_ans_name1": "",
    "web_ans_name2": "",
    "web_ans_strasse": "",
    "web_ans_strasse_2": "",
    "web_ans_plz": "",
    "web_ans_plz_zusatz": "",
    "web_ans_postfach_valid": 0,
    "web_ans_postfach_plz": "",
    "web_ans_postfach_plz_zusatz": "",
    "web_ans_postfach": "",
    "web_ans_ort": "",
    "web_ans_county": "",
    "web_ans_land": "1",
    "web_ans_titel": "",
    "web_ans_anrede": "",
    "web_ans_sachbearbeiter": "",
    "web_ans_sachgeburtstag": "1899-12-30T00:00:00.000Z",
    "web_ans_telefon": "",
    "web_ans_telefon2": "",
    "web_ans_telefax": "",
    "web_ans_email": "",
    "web_ans_com_mode": "0",
    "web_ans_m_typ": 0,
    "web_ans_modem": "",
    "web_error": {
        "web_err_nr": 0,
        "web_err_txt": ""
    }
}

var payloadOrderInfo = {
    "Table_name": "ANGEBOTKOPF",
    "Limit": "1",
    "Request_fields": [
        {
            "DB_request": {
                "Field_name": "ANG_ANR",
                "Field_value": "",
            }
        }
    ],
    "Response_fields": {
        "string": ["ANG_ANR","ANG_KNR","ANG_DATANG","ANG_TEXT","ANG_DATAB"]
    }
}

var payloadForDeliveryNoteExist = {
    "Table_name": "LIEFERKOPF",
    "Limit": "20",
    "Request_fields": [
        {
            "DB_request": {
                "Field_name": "LFS_ANG_ANR",
                "Field_value": "",
            }
        }
    ],
    "Response_fields": {
        "string": ["LFS_ANG_ANR","LFS_LFS","LFS_DATLFS","LFS_TEXT"]
    }
}


//creating payload for search in futura. 
async function payloadForSearch(email) {

    var payload = {
        "web_search_kde": {
            "web_fld_names": {
                "string": [
                    "ADD_NUMMER",
                    "ANS_EMAIL",
                    "ADD_TYP",
                    "ADD_KREDITKARTE",
                    "ADD_SPERRDATUM"
                ]
            },
            "web_flds_fill": {
                "string": [
                    "",
                    email.toLowerCase(),
                    "3",
                    "",
                    ""
                ]
            },
            "web_error": {
                "web_err_nr": 0,
                "web_err_txt": ""
            }
        }
    }
    return payload;
}

//Search customer through email
async function SearchInFutura(params, payload, email) {
    var headers = getFuturaHeader(params)

    return new Promise((resolve, reject) => {
        soap.createClient(params.FUTURA_CUSTOMER_API, {wsdl_headers: headers}, function(err, client) {
        if(err){
          reject(err)
        }
        setCustomClient(params,client)
        client.web_search_customer(payload, function(err, result) {
          if(err){
            reject(err)
          }else{
            var ids=[];
            var rows = result.web_search_customerResult.Tweb_search_kde_fld
            for (var i=0; i < rows.length; i++) {
                if(rows[i].web_error.web_err_nr != 0){
                    continue;
                }

                if(rows[i].web_flds.string[1] == email){
                    var ids=[];
                    if(rows[i].web_flds.string[3]){
                        ids.push(rows[i].web_flds.string[0]);
                        break;    
                    }else{
                        ids.push(rows[i].web_flds.string[0]);
                    }
                }
            }
            resolve(ids)
          }
        },{timeout: params.SOAP_TIMEOUT})
      })
    })
}

//Create blank customer in futura
async function createBlankCustomer(params) {
    var headers = getFuturaHeader(params)

    return new Promise((resolve, reject) => {
        soap.createClient(params.FUTURA_CUSTOMER_API, {wsdl_headers: headers}, function(err, client) {
        if(err){
          reject(err)
        }
        setCustomClient(params,client)
        client.get_web_new_customer_id(function(err, result) {
          if(err){
            reject(err)
          }else{
            resolve((result))
          }
        },{timeout: params.SOAP_TIMEOUT})
      })
    })
}

async function getCustomerDataById(params,id){

    var response = {
        "customer": "",
        "comon": "",
        "address": ""
    };

    response.customer = await getCustomerById(params,id)

    response.comon = await getCommonById(params,id)

    response.address = await getAddressById(params,id)

    return response;

}

//Get customer details by id
async function getCustomerById(params,id){
    var headers = getFuturaHeader(params)

    var customerarray = getCustomerData()
    customerarray.web_kde_nummer = id

    var customerpayload = {
        'Value' : customerarray,
        'web_user': '',
        'web_Pass': ''
    }

     return  new Promise((resolve, reject) => {
        soap.createClient(params.FUTURA_CUSTOMER_API, {wsdl_headers: headers}, function(err, client) {
        if(err){
          reject(err)
        }
        setCustomClient(params,client)
        client.get_web_customer(customerpayload, function(err, result) {
          if(err){
            reject(err)
          }else{
            var response = result.get_web_customerResult
            resolve(response)
          }
        },{timeout: params.SOAP_TIMEOUT})
      })
    })
}

async function getCommonById(params, id){

    var headers = getFuturaHeader(params)

    var commonrarray = getCommonFieldData()
    commonrarray.web_add_nummer = id

    var commonpayload = {
        'Value' : commonrarray,
        'web_user': '',
        'web_Pass': ''
    }

    return new Promise((resolve, reject) => {
        soap.createClient(params.FUTURA_CUSTOMER_API, {wsdl_headers: headers}, function(err, client) {
        if(err){
          reject(err)
        }
        setCustomClient(params,client)
        client.get_web_common(commonpayload, function(err, result) {
          if(err){
            reject(err)
          }else{
            var response = result.get_web_commonResult
            resolve(response)
          }
        },{timeout: params.SOAP_TIMEOUT})
      })
    })
}


async function getAddressById(params, id){

    var headers = getFuturaHeader(params)

    var addressarray = getAddressData()
    addressarray.web_ans_nummer = id

    var addresspayload = {
        'Value' : addressarray,
        'web_user': '',
        'web_Pass': ''
    }

    return new Promise((resolve, reject) => {
        soap.createClient(params.FUTURA_CUSTOMER_API, {wsdl_headers: headers}, function(err, client) {
        if(err){
          reject(err)
        }
        setCustomClient(params,client)
        client.get_web_address(addresspayload, function(err, result) {
          if(err){
            reject(err)
          }else{
            var response = result.get_web_addressResult.Tweb_ans[0];
            resolve(response)
          }
        },{timeout: params.SOAP_TIMEOUT})
      })
    })
}

//update customer in futura
async function UpdateCustomerInFututra(params, payload){
    var headers = getFuturaHeader(params)
    // payload.customer = futuraDateFormat(payload.customer)
    // payload.comon = futuraDateFormat(payload.comon)
    // payload.address = futuraDateFormat(payload.address)

    payload.address.web_ans_sachgeburtstag = formatDateIso(payload.address.web_ans_sachgeburtstag)


    payload.comon.web_add_sperrdatum = formatDateIso(payload.comon.web_add_sperrdatum)
    payload.comon.web_add_wf_date_time_1 = formatDateIso(payload.comon.web_add_wf_date_time_1)
    payload.comon.web_add_ulog_date_time = formatDateIso(payload.comon.web_add_ulog_date_time)
    payload.comon.web_add_wf_date_time_2 = formatDateIso(payload.comon.web_add_wf_date_time_2)
    payload.comon.web_add_last_rg_datum = formatDateIso(payload.comon.web_add_last_rg_datum)
    payload.comon.web_add_last_pay_datum = formatDateIso(payload.comon.web_add_last_pay_datum)
    payload.comon.web_add_loesch_datum = formatDateIso(payload.comon.web_add_loesch_datum)
    payload.comon.web_add_fibuexport_first = formatDateIso(payload.comon.web_add_fibuexport_first)
    payload.comon.web_add_fibuexport_last = formatDateIso(payload.comon.web_add_fibuexport_last)
    payload.comon.web_add_karte_erfasst = formatDateIso(payload.comon.web_add_karte_erfasst)
    payload.comon.web_add_karte_ausgegeben = formatDateIso(payload.comon.web_add_karte_ausgegeben)
    payload.comon.web_add_wf_date_time_3 = formatDateIso(payload.comon.web_add_wf_date_time_3)
    payload.comon.web_add_import_datum = formatDateIso(payload.comon.web_add_import_datum)
    payload.comon.web_add_export_datum = formatDateIso(payload.comon.web_add_export_datum)
    payload.comon.web_add_datum_user = formatDateIso(payload.comon.web_add_datum_user)
    payload.comon.web_add_clog_date_time = formatDateIso(payload.comon.web_add_clog_date_time)
    payload.comon.web_add_ulog_date_time = formatDateIso(payload.comon.web_add_ulog_date_time)



    var updatedata = {
        'web_kde' : payload.customer,
        'web_add' : payload.comon,
        'web_ans' : payload.address,
        'web_user' : "",
        'web_Pass' : ""
    }
    
    return new Promise((resolve, reject) => {
        soap.createClient(params.FUTURA_CUSTOMER_API, {wsdl_headers: headers}, function(err, client) {
        if(err){
          reject(err)
        }
        
        setCustomClient(params,client)

        client.set_web_customer(updatedata, function(err, result) {
          if(err){
            reject(err)
          }else{
            resolve((result))
          }
        },{timeout: params.SOAP_TIMEOUT})
      })
    })
}

function getCustomerData() {
    return customer;
}

function getCommonFieldData() {
    return commonfield;
}

function getAddressData() {
    return address;
}

function getFuturaHeader(params){
    return  {
        'trace':1,
        'exceptions': true,
        'timeout': 1000,
        'CF-Access-Client-Id': params.FUTURA_CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': params.FUTURA_CF_ACCESS_CLIENT_SECRET
    }
}

function setCustomClient(params, client){

    client.setEndpoint(params.FUTURA_CUSTOMER_API+'?service=FuturERS_ADR')
    client.addHttpHeader('CF-Access-Client-Id', params.FUTURA_CF_ACCESS_CLIENT_ID);
    client.addHttpHeader('CF-Access-Client-Secret', params.FUTURA_CF_ACCESS_CLIENT_SECRET);
}


function setOrderClient(params, client){

    client.setEndpoint(params.FUTURA_ORDER_API+'?service=FuturaERS_HOST')
    client.addHttpHeader('CF-Access-Client-Id', params.FUTURA_CF_ACCESS_CLIENT_ID);
    client.addHttpHeader('CF-Access-Client-Secret', params.FUTURA_CF_ACCESS_CLIENT_SECRET);
}

/* ----------- Futura Create Order ---------- */
// Generate Payload for Existing order check
function payloadForExistingOrderCheck(order_id)
{
    payloadOrderInfo.Request_fields[0].DB_request.Field_value = order_id;
    return payloadOrderInfo;
}

// Checks order is exists or not
async function isOrderExistonFutura(order_id, params, payloadOrderInfo) {
    var apiEndpoint = params.FUTURA_ORDER_API+'?service=FuturaERS_HOST';
    var futura_headers = getFuturaHeader(params);

    return new Promise((resolve, reject)=> {
        soap.createClient(apiEndpoint, {wsdl_headers:futura_headers, escapeXML: false}, function(err, client) {

            if(err) {
                reject({'statusCode': 502, 'error': {"message": "Futura Order Exist Check | Not able to connect "+apiEndpoint, "errorCode": error.code}})
            }

            if (client) {
                setOrderClient(params, client)
                client.read_table(payloadOrderInfo, function(err, result) {
                    if(err){
                        reject({'statusCode': 400, 'error': err, "lastcall": client.lastRequest})
                    }
                    else {
                        resolve({'statusCode': 200, 'result': result, "lastcall": client.lastRequest})
                    }
                });
            } else {
                reject({'statusCode': 404, 'error': 'read_table method not found.'});
            }

        })
    })

}

// Process create order 
async function createOrderOnFutura(payloadFuturaOrder, params) {

    var futura_headers = getFuturaHeader(params);
    var futuraurl = params.FUTURA_ORDER_API+'?service=FuturaERS_HOST';
    var orderResult =  await createOrder(futuraurl, futura_headers, payloadFuturaOrder, params);
    return orderResult;

}

// Create order on futura
function createOrder(apiEndpoint, header, payload, params) {

    return new Promise((resolve, reject)=> {
        soap.createClient(apiEndpoint, {wsdl_headers:header, escapeXML: false}, function(err, client) {

            if(err) {
                reject({'statusCode': 502, 'error': {"message": "Futura Order Create | Not able to connect "+apiEndpoint, "errorCode": error.code}})
            }

            if (client) {
                setOrderClient(params, client)
                client.set_import_lines(payload, function(err, result) {
                    if(err){
                        reject({'statusCode': 400, 'error': err, "lastcall": client.lastRequest})
                    }
                    else {
                        resolve({'statusCode': 200, 'result': result, "lastcall": client.lastRequest})
                    }
                });
            } else {
                reject({'statusCode': 404, 'error': 'set_import_lines method not found.'});
            }

        })
    })
}

// Generate the payload for Order create
function generatePayloadForFuturaFromEcomOrder(order, order_id, futura_customer_id, params, fulfilled = false) {
    var stringData = [];

    var order_comment = 'ONLINE ORDER '+order.increment_id; // Order Comment
    var order_payment_method = (order.payment.method) ? order.payment.method : 'Credit Card';

    stringData.push(orderInfoForFututa(order, order_comment, order_payment_method, order_id, futura_customer_id, params,fulfilled));

    var order_items = getOrderItemInfoForFutura(order, order_id, futura_customer_id, params,fulfilled);
    order_items.forEach((item, index) => {
        stringData.push(item);
    });
    //var order_items_shipping = getShippingInfoFutura(order, order_id, futura_customer_id, params);
    // stringData.push(order_items_shipping);
    stringData.push(getBillingAddressInfoForFutura(order, order_id, params));
    var shipping_information = getShippingAddressForFutura(order, order_id, params)
    if(shipping_information && shipping_information.length > 0) {
        stringData.push(shipping_information);
    } 

    return stringData;
}

// Generate Order Information for Futura
function orderInfoForFututa(order, order_comment, order_payment_method, order_id, futura_customer_id, params, fulfilled)
{
    var order_info = [];
    order_info.push(13); // FUTURA_RECORD_TYPE
    order_info.push(1); // FUTURA_HEADER_PREFIX
    order_info.push(order_id); // Magento Order ID
    order_info.push(futura_customer_id); // Futura Customer ID
    order_info.push(futuraFormatDate(order.created_at)); // Order Created Date
    order_info.push(futuraFormatDate(order.created_at)); // Order Created Date
    order_info.push(1); // isVatCacl
    order_info.push('"' + order_comment + '"'); // Order Comment
    if(fulfilled == true){
        order_info.push(1); // Order Comment    
    }else{
        order_info.push(''); // Order Comment
    }
    
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''+order.base_currency_code); // Order Currency
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push('"' + order_payment_method + '"'); // Order Payment Method
    order_info.push('"' + order.base_total_paid + '"'); // Order base_grand_total
    order_info.push(''); // Order Comment
    order_info.push(''); // Order Comment
    order_info.push((order.store_id == 1 ? params.FUTURA_AUS_DELIVERY_BRANCH : params.FUTURA_NZL_DELIVERY_BRANCH)); // FUTURA_BRANCH_DELIVERY

    return order_info.join(',');
}

// Generate order item information for futura
function getOrderItemInfoForFutura(order, order_id, futura_customer_id, params, fulfilled) {
    var all_items = [];
    var counter = 1;

    order.items.forEach((item, index) => {
        if ( 
            (item.product_type == 'simple' || item.is_virtual == true) &&
            (typeof item.parent_item == 'undefined') // Not pass the bundle item
        ) {
            var unitPrice = 0;
            var quantity = 0;
            var itemBasePriceIncludingTax = 0;
            var itemInfo = []

            if (
                (typeof item.parent_item != 'undefined') &&
                Object.keys(item.parent_item).length > 0 &&
                item.parent_item.product_type == 'bundle') {
                // For dynamic price
                if (item.base_price > 0) {
                    //unitPrice = item.row_total_incl_tax
                    unitPrice = (typeof item.base_cost != 'undefined') ? item.base_cost : item.row_total_incl_tax
                    quantity = item.qty_ordered
                } else { // For fixed price
                    unitPrice = (typeof item.base_cost != 'undefined') ? item.base_cost : item.extension_attributes.bundle_option_price
                    //quantity = item.extension_attributes.bundle_option_qty
                    quantity = item.qty_ordered
                }
                itemBasePriceIncludingTax = unitPrice
            } else {
                //unitPrice = item.base_price
                unitPrice = (typeof item.base_cost != 'undefined') ? item.base_cost : item.base_price
                quantity = item.qty_ordered
                itemBasePriceIncludingTax = item.row_total_incl_tax
            }

            var sku = item.sku
            // if we get loyalty product
            if(item.sku == params.FUTURA_PURCHASE_LOYALTY_SKU){

                // if customer is already loyalty customer then change sku with renew sku
                if(params.data.givexnumber){
                    sku = params.FUTURA_RENEW_LOYALTY_SKU
                }
            }

            // including = base_row_total_incl_tax / qty_invoiced
            var qty_invoiced = (item.qty_invoiced == 0 ) ? 1 : item.qty_invoiced; 
            var itemPriceIncludingTax = (item.base_row_total_incl_tax / qty_invoiced)
            // excluding = ( base_row_total_incl_tax - base_tax_invoiced ) / qty_invoiced
            var itemPriceExcludingTax = ( item.base_row_total_incl_tax - item.base_tax_invoiced ) / qty_invoiced;
            var order_item_info = [];
            order_item_info.push(13); // FUTURA_RECORD_TYPE
            order_item_info.push(2); // FUTURA_HEADER_PREFIX
            order_item_info.push(order_id); // Magento Order ID
            order_item_info.push(futura_customer_id); // Futura Customer ID
            order_item_info.push(futuraFormatDate(order.created_at)); // Order Created Date
            order_item_info.push(1); // IsVat Calculated
            order_item_info.push(sku); // Item SKU
            order_item_info.push(counter); // COrder
            order_item_info.push((item.qty_invoiced > 0) ? item.qty_invoiced : 1); // Item Quantity Invoiced
            order_item_info.push((item.qty_invoiced > 0) ? item.qty_invoiced : 1); // Item Quantity Invoiced
            if(fulfilled == true){
                var qtypending = item.qty_invoiced - item.qty_shipped
                order_item_info.push(qtypending); //shippingCostPrice (default set 0)
            }else{
                order_item_info.push(''); //shippingCostPrice (default set 0)    
            }
            
            order_item_info.push((item.product_type == 'giftcard') ? 0 : unitPrice) // row_total_incl_tax
            order_item_info.push((item.product_type == 'giftcard') ? 0 : itemPriceExcludingTax); // itemPriceExcludingTax 
            order_item_info.push((item.product_type == 'giftcard') ? 0 : itemPriceIncludingTax); // itemPriceExcludingTax 
            order_item_info.push(3); // vkBruttoPrice | row_total - member_discount
            order_item_info.push(''); //
            order_item_info.push(''); //
            order_item_info.push(''); //
            counter++
            all_items.push('' + order_item_info.join(','));
        }
    });

    // Shipment line will be added only when order is not 'click and collect' order.
    if(order.base_shipping_amount != 0){
        // No -shipment | qty 1 
        // 
        var order_shipping_info = [];
        order_shipping_info.push(13); // FUTURA_RECORD_TYPE
        order_shipping_info.push(2); // FUTURA_HEADER_PREFIX
        order_shipping_info.push(order_id); // Magento Order ID
        order_shipping_info.push(futura_customer_id); // Futura Customer ID
        order_shipping_info.push(futuraFormatDate(order.created_at)); // Order Created Date
        order_shipping_info.push(1); // IsVat Calculated
        order_shipping_info.push(params.FUTURA_SHIPPING_SKU); // Shipping SKU // 50012848
        order_shipping_info.push(counter); // Item Count (Total Items)
        order_shipping_info.push(1); // Item Quantity Invoiced
        order_shipping_info.push(1); // Item Quantity Invoiced
        if(fulfilled == true && order.base_shipping_captured - order.base_shipping_refunded == 0){
            order_shipping_info.push(1); //
        }else{
            order_shipping_info.push(''); //
        }

        order_shipping_info.push('0.0000'); // shipping Cost Price
        order_shipping_info.push((order.base_shipping_incl_tax - order.base_shipping_tax_amount)); // Order Shipping Amount Vk NettoPrice = ( orderShippingAmount - shipemntTaxAmount )
        order_shipping_info.push(order.base_shipping_incl_tax); // base_shipping_amountt
        order_shipping_info.push(3); // vkBruttoPrice | row_total - member_discount
        order_shipping_info.push(''); //
        order_shipping_info.push(''); //
        order_shipping_info.push(''); //
        all_items.push('' + order_shipping_info.join(','));
    }

    return all_items;

}

function getShippingInfoFutura(order, order_id, futura_customer_id, params) {
    var order_shipping_info = [];
    order_shipping_info.push(13); // FUTURA_RECORD_TYPE
    order_shipping_info.push(2); // FUTURA_HEADER_PREFIX
    order_shipping_info.push(order_id); // Magento Order ID
    order_shipping_info.push(futura_customer_id); // Futura Customer ID
    order_shipping_info.push(futuraFormatDate(order.created_at)); // Order Created Date
    order_shipping_info.push(1); // IsVat Calculated
    order_shipping_info.push(params.FUTURA_SHIPPING_SKU); // Shipping SKU // 50012848
    order_shipping_info.push(order.items.length); // Item Count (Total Items)
    order_shipping_info.push(1); // Item Quantity Invoiced
    order_shipping_info.push(1); // Item Quantity Invoiced
    order_shipping_info.push(''); //
    order_shipping_info.push('0.0000'); // shipping Cost Price
    order_shipping_info.push((order.base_shipping_incl_tax - order.base_shipping_tax_amount)); // Order Shipping Amount Vk NettoPrice = ( orderShippingAmount - shipemntTaxAmount )
    order_shipping_info.push(order.base_shipping_incl_tax); // base_shipping_amountt
    order_shipping_info.push(3); // vkBruttoPrice | row_total - member_discount
    order_shipping_info.push(''); //
    order_shipping_info.push(''); //
    order_shipping_info.push(''); //
    return order_shipping_info.join(',');
}

// Generate shipping order information
function getShippingAddressForFutura(order, order_id, params) {
    var shipping_address_info = [];

    if (typeof order.extension_attributes.shipping_assignments[0].shipping.address == 'undefined') {
        return false;
    } else {
        var shipping_address = order.extension_attributes.shipping_assignments[0].shipping.address;
        var street2 = (typeof shipping_address.street[1] == 'undefined' && shipping_address.street[1] != null) ? "" + shipping_address.street[1] : "";
        shipping_address_info.push(13); // FUTURA_RECORD_TYPE
        shipping_address_info.push(3); // FUTURA_HEADER_PREFIX
        shipping_address_info.push(order_id); // Magento Order ID
        shipping_address_info.push('"' + shipping_address.firstname + '"'); // First name
        shipping_address_info.push('"' + shipping_address.lastname + '"'); // Last name
        shipping_address_info.push('"' + shipping_address.street[0] + '"'); // Street one
        shipping_address_info.push('"' + shipping_address.postcode + '"'); // Postcode
        shipping_address_info.push('"' + shipping_address.city + '"'); // City
        shipping_address_info.push((shipping_address.country_id = "AU") ? params.FUTURA_AU_CODE : params.FUTURA_NZ_CODE); // Country ID
        shipping_address_info.push('"' + shipping_address.firstname + ' ' + shipping_address.lastname + '"'); // Full name
        shipping_address_info.push(''); // Title
        shipping_address_info.push(street2); // Street 2
        shipping_address_info.push('"' + shipping_address.region + '"'); // Magento Order ID
        shipping_address_info.push('"' + shipping_address.telephone + '"'); // Magento Order ID
        shipping_address_info.push(''); // Fax
        shipping_address_info.push('"' + shipping_address.email + '"'); // Magento Order ID

        return shipping_address_info.join(',');
    }
    
}

// Generate billing order information
function getBillingAddressInfoForFutura(order, order_id, params) {
    var billing_address_info = [];
    var billing_address = order.billing_address;

    var street2 = (typeof billing_address.street[1] == 'undefined' && billing_address.street[1] != null) ? "" + billing_address.street[1] : "";

    billing_address_info.push(13); // FUTURA_RECORD_TYPE
    billing_address_info.push(3); // FUTURA_HEADER_PREFIX
    billing_address_info.push(order_id); // Magento Order ID
    billing_address_info.push('"' + billing_address.firstname + '"'); // Firstname
    billing_address_info.push('"' + billing_address.lastname + '"'); // Lastname
    billing_address_info.push('"' + billing_address.street[0] + '"'); // Street 1
    billing_address_info.push('"' + billing_address.postcode + '"'); // Postcode
    billing_address_info.push('"' + billing_address.city + '"'); // City
    billing_address_info.push((billing_address.country_id = "AU") ? params.FUTURA_AU_CODE : params.FUTURA_NZ_CODE); // Country ID
    billing_address_info.push('"' + billing_address.firstname + ' ' + billing_address.lastname + '"'); // Full Name
    billing_address_info.push(''); // Customer Title
    billing_address_info.push(street2); // Street 2
    billing_address_info.push('"' + billing_address.region + '"'); // State
    billing_address_info.push('"' + billing_address.telephone + '"'); // Telephone Number
    billing_address_info.push(''); // Fax
    billing_address_info.push('"' + billing_address.email + '"'); // Email Address

    return billing_address_info.join(',');
}

// Date format uses by Futura
function futuraFormatDate(inputDate) {
    const dateObject = new Date(inputDate);

    const day = String(dateObject.getDate()).padStart(2, '0');
    const month = String(dateObject.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so we add 1
    const year = dateObject.getFullYear();

    const formattedDate = `${day}/${month}/${year}`;

    return formattedDate;
}
/* ----------- Futura Create Order | Ends  ---------- */


/**
 *
 * Create delivery note in Futura
 *
 * @param {object} params action input parameters.
 * @param {object} payload for import delivery data
 * @returns {object} futura result object
 *
 */
function createDeliveryNote(params,payload) {

    var headers = getFuturaHeader(params)

    var updatedata = {
        'main_typ' : 15,
        'import_data' : payload,
    }

    return new Promise((resolve, reject) => {
        soap.createClient(params.FUTURA_ORDER_API, {wsdl_headers: headers}, function(err, client) {
        if(err){
          reject(err)
        }
        
        setOrderClient(params,client)

        client.set_delivery_note(updatedata, function(err, result) {
            if(err){
                reject({"err": err, "lastcall": client.lastRequest})
              }else{
                resolve({"result": result, "lastcall": client.lastRequest})
              }
        },{timeout: params.SOAP_TIMEOUT})
      })
    })
}

// This function will create the payload for the delivery note and reverse delivery note.
async function createdeliverynoteparam(params, orderinfo, shipmentinfo, futuraorderid, futuracustomerid, shipment_id, creditmemoinfo = false, is_reverse = false){
    
    // It will provide available delivery note number. 
    var deleiveryno = await getNewdeliverynoteNo(params, futuraorderid)
    var isHeaderForShipment = false;

    // Classification and Assgned Store
    // filiale will contain the store number and classification will contain the 1 or 2 (delivery or click and collect)
    if( 
        // It will run only for the postal charge normal/reverse delivery note
        (typeof params.onlyshipmentcharge != "undefined" && params.onlyshipmentcharge == true ) && 
        (is_reverse == false && creditmemoinfo == false)
    ){
        isHeaderForShipment = true;
        var filiale = 999
        var classification = (typeof shipmentinfo.extension_attributes.classification != 'undefined') ? shipmentinfo.extension_attributes.classification : 1
    } else if(
        // It will run only for the adjustment reverse delivery note
        (typeof params.onlyshipmentcharge != "undefined" || params.onlyshipmentcharge == false ) && 
        (typeof params.only_adjustment != "undefined" && params.only_adjustment == true) && 
        (is_reverse != false && creditmemoinfo != false) && 
        (typeof creditmemoinfo.items != 'undefined') && 
        (typeof creditmemoinfo.items[0] != 'undefined') && 
        (typeof creditmemoinfo.items[0].extension_attributes != 'undefined') && 
        (typeof creditmemoinfo.items[0].extension_attributes.classification != 'undefined')
    ) {
        var filiale = 999
        var classification = (typeof creditmemoinfo.items[0].extension_attributes.classification != 'undefined') ? creditmemoinfo.items[0].extension_attributes.classification : 1
    } else {
        // This else part will run for ordered/shipment/creditmemo items
        if (
            (shipmentinfo != 'undefined') && 
            (shipmentinfo.extension_attributes) && 
            ( typeof shipmentinfo.extension_attributes != 'undefined')
        ) {
            // IF - filiale will get information from shipment info
            if(is_reverse == false && creditmemoinfo == false){
                var filiale = (typeof shipmentinfo.extension_attributes.assigned_store != 'undefined') ? shipmentinfo.extension_attributes.assigned_store : 160
                var classification = (typeof shipmentinfo.extension_attributes.classification != 'undefined') ? shipmentinfo.extension_attributes.classification : 1
            } else if( // else - IF - filiale will get information from creditmemo item info
                (typeof creditmemoinfo.items != 'undefined') &&
                (typeof creditmemoinfo.items[0] != 'undefined') &&
                (typeof creditmemoinfo.items[0].extension_attributes != 'undefined') &&
                (typeof creditmemoinfo.items[0].extension_attributes.store != 'undefined')
            ){
                var filiale = creditmemoinfo.items[0].extension_attributes.store
            } else if( // else - IF - classification will get information from creditmemo item info
                (typeof creditmemoinfo.items != 'undefined') &&
                (typeof creditmemoinfo.items[0] != 'undefined') &&
                (typeof creditmemoinfo.items[0].extension_attributes != 'undefined') &&
                (typeof creditmemoinfo.items[0].extension_attributes.classification != 'undefined')
            ){
                var classification = (typeof creditmemoinfo.items[0].extension_attributes.classification != 'undefined') ? creditmemoinfo.items[0].extension_attributes.classification : 1
            } else {
                var filiale = 160
            }
        } else {
            var filiale = 160
            var classification = 1
        }
    }
    
    // header of the normal/reverse delivery note
    var type1 = await gettype1items(orderinfo,shipmentinfo,futuraorderid,futuracustomerid,
        deleiveryno,shipment_id,creditmemoinfo,is_reverse,filiale,classification, isHeaderForShipment)
    
    // items information of the normal/reverse delivery note
    var type2 = await gettype2items(shipmentinfo,orderinfo, futuraorderid,futuracustomerid, 
        deleiveryno,creditmemoinfo, is_reverse,params,filiale,classification)

    // billing and shipping information of the normal/reverse delivery note
    var type3 = await gettype3items(orderinfo,futuraorderid,futuracustomerid, deleiveryno);

    return {"typ_1":type1 , "typ_2": type2, "typ_3": type3}
}

function gettype1items(orderinfo,shipmentinfo,futuraorderid,futuracustomerid,deleiveryno,shipment_id,creditmemoinfo,is_reverse,filiale,classification,isHeaderForShipment){

    if(is_reverse == false && creditmemoinfo == false){
        var increment_id = shipmentinfo.increment_id
    } else {
        var increment_id = creditmemoinfo.increment_id
    }

    if(isHeaderForShipment == true) {
        var text_header = "ONLINE ORDER "+orderinfo.increment_id;
    } else {
        var text_header = "ONLINE ORDER "+orderinfo.increment_id+" | "+increment_id;
    }

    return {
      "Nummer": deleiveryno.Result, //  Delivery Note Number
      "Empfaenger": futuracustomerid, // = Futura Customer Number
      "Lieferscheindatum": datetoISO(orderinfo.created_at), //DN Date
      "Filiale": filiale, //  Branch that serviced the order
      "Umst_flag": 1, // GST applicable
      "Text": text_header,
      "Auftrag": futuraorderid, // Futura Order ID
      "Vertreter": classification, // Order type (1=Delivery 2=Click and Collect)
      "Waehrung": orderinfo.base_currency_code, // Currency
      "Buchungsdatum": datetoISO(orderinfo.created_at), // Booking Date
      "Lfs_notOK": 0 //  DNOK Status – 0=auto DNOK
    }
}

// Get Type 2 Item Data for the delivery note
function gettype2items(shipmentinfo,orderinfo,futuraorderid,futuracustomerid,deleiveryno,creditmemoinfo,is_reverse,params,filiale,classification){

    // generated array of shipping and adjustment sku which will use below
    var shipping_adjustment_skus = [params.FUTURA_ADJUSTMENT_SKU, params.FUTURA_SHIPPING_SKU]
    // var onlyshipmentcharge = params.onlyshipmentcharge
    // --- creditmemo | store info with qty
    var filialeInfo = {}

    if(
        // This will run only when postal charge normal/reverse delivery note is generating
        (typeof params.onlyshipmentcharge != "undefined") &&
        (params.onlyshipmentcharge == true) &&
        (is_reverse == true && creditmemoinfo != false) &&
        (creditmemoinfo.base_shipping_amount > 0) && (creditmemoinfo.base_shipping_incl_tax > 0)
    ) {
        // Generating the shipping item so that it can be add in shipping & order data as item
        var shippingitem = addShippingInfoInDeliveryNote(false, is_reverse, orderinfo, params, creditmemoinfo, filiale,classification)
        
        if(orderinfo.base_shipping_amount != 0){
            orderinfo.items.push(shippingitem)
        }
        
        shipmentinfo.items.push(shippingitem)
        creditmemoinfo.items.push(shippingitem)
    }
    if(
        // This will run only when adjustment charge normal/reverse delivery note is generating
        ((typeof params.onlyshipmentcharge == "undefined") || (params.onlyshipmentcharge == false) ) &&
        (typeof params.only_adjustment != "undefined") &&
        (is_reverse == true && creditmemoinfo != false) &&
        (creditmemoinfo.base_adjustment > 0)
    ) {
        // Generating the shipping item so that it can be add in shipping & order data as item
        var shippingitem = addShippingInfoInDeliveryNote(false, is_reverse, orderinfo, params, creditmemoinfo, filiale,classification)
        
        if(orderinfo.base_shipping_amount != 0){
            orderinfo.items.push(shippingitem)
        }
        
        shipmentinfo.items.push(shippingitem)
        creditmemoinfo.items.push(shippingitem)
    }

    if(
        // It will executes only when shipment generated. Means only for the delivery note.
        (typeof params.onlyshipmentcharge != "undefined") &&
        (params.onlyshipmentcharge == true) &&
        (is_reverse == false && shipmentinfo != false)
    ) {
        // if((is_reverse == false && shipmentinfo != false)) {
        // Generating the shipping item so that it can be add in shipping & order data as item
        var shippingitem = addShippingInfoInDeliveryNote(shipmentinfo, is_reverse, orderinfo, params, false)
        
        if(orderinfo.base_shipping_amount != 0){
            orderinfo.items.push(shippingitem)
        }
        
        shipmentinfo.items.push(shippingitem)
    }

    // If is_reverse is true then the reverse delivery note will be created with the store info
    if(is_reverse == true && creditmemoinfo != false) {
        creditmemoinfo.items.forEach((creditmemoitem, index) => {
            // Adding filialeInfo (store)
            if(creditmemoitem.extension_attributes && creditmemoitem.extension_attributes.store) {
                var filiale_item = {
                    "qty": creditmemoitem.qty,
                    "store": creditmemoitem.extension_attributes.store
                }
                filialeInfo[creditmemoitem.order_item_id] = filiale_item
            } else if(creditmemoitem.sku == params.FUTURA_SHIPPING_SKU) {
                // adding filialeInfo (store) for Shipping SKU 
                var filiale_item = {
                    "qty": creditmemoitem.qty,
                    // if((deleiveryno.Result == 1) &&  (is_reverse == false && shipmentinfo != false)) {
                    "store": 999
                }
                filialeInfo[creditmemoitem.order_item_id] = filiale_item
            }
        });
    }

    shipmentitems = {}

    if(is_reverse == true && creditmemoinfo != false) {
        // Generating creditmemo information
        creditmemoinfo.items.forEach((creditmemo_item, index) => {
            var shipmentitem = {
                "qty": creditmemo_item.qty,
                "sku": creditmemo_item.sku,
            }
            // reusing the existing varible
            shipmentitems[creditmemo_item.order_item_id] = shipmentitem
        });
    } else {
        // Generating shipment information
        shipmentinfo.items.forEach((shipitems, index) => {
            var shipmentitem = {
                "qty": shipitems.qty,
                "sku": shipitems.sku
            }
            shipmentitems[shipitems.order_item_id] = shipmentitem
        });
    }

    var shippinginfo = [];
    var counter = 1;
    var deliver_note_item_pos = 1;
    var itemsArray = []

    try {
        orderinfo.items.forEach((item, index) => {
            // Now only those order item will be process which has reversal and quantity_reverse value.
            if(item.product_type == "simple" || item.is_virtual == true){
                var unitPrice = 0;
                if (
                    (typeof item.parent_item != 'undefined') && 
                    Object.keys(item.parent_item).length > 0 && 
                    item.parent_item.product_type == 'bundle') {
                        // For dynamic price
                        if(item.base_price > 0) {
                            unitPrice = item.base_price
                        } else { // For fixed price
                            unitPrice = item.extension_attributes.bundle_option_price
                        }
    
                } else {
                    unitPrice = item.base_price
                }

                if(
                    ((is_reverse != true) && shipmentitems[item.item_id]) ||
                    (
                        shipmentitems[item.item_id] &&
                        (is_reverse == true) &&
                        typeof (item.reversal) != 'undefined' &&
                        (item.reversal == true) &&
                        typeof (item.quantity_reverse) != 'undefined' &&
                        (item.quantity_reverse > 0)
                    )
                ){
                    itemsArray.push(item.item_id)
    
                    // Filiale info
                    if((is_reverse == true) && (Object.keys(filialeInfo).length > 0) && filialeInfo[item.item_id].store ) {
                        var filialeval = filialeInfo[item.item_id].store;
                    } else {
                        var filialeval = filiale
                    }
    
                    // Menge and Berechnet info
                    if((is_reverse == true) && (Object.keys(filialeInfo).length > 0) && filialeInfo[item.item_id].qty )
                    {
                        // var menge = filialeInfo[item.item_id].qty * -1;
                        // var berechnet = filialeInfo[item.item_id].qty * -1;
                        var menge = item.quantity_reverse * -1;
                        var berechnet = item.quantity_reverse * -1;
                    } else {
                        var menge = shipmentitems[item.item_id].qty;
                        var berechnet = shipmentitems[item.item_id].qty;
                    }

                    if(typeof params.only_adjustment != "undefined" && params.only_adjustment == true )
                    {
                        var auf_pos = 0
                    } else {
                        var auf_pos =  (item.sku == params.FUTURA_SHIPPING_SKU) ? orderinfo.items.length : counter
                    }
    
                    var qty_invoiced = (item.qty_invoiced == 0 ) ? 1 : item.qty_invoiced; 
                    var itemPriceIncludingTax = (item.base_row_total_incl_tax / qty_invoiced)
                    // excluding = ( base_row_total_incl_tax - base_tax_invoiced ) / qty_invoiced
                    if(
                        (typeof params.only_adjustment != "undefined") &&
                        (item.sku == params.FUTURA_ADJUSTMENT_SKU) && 
                        (typeof item.delivery_note_type != 'undefined') &&
                        (item.delivery_note_type == 'adjustment')
                    ){
                        var itemPriceExcludingTax = item.base_row_total_incl_tax;
                    } else {
                        var itemPriceExcludingTax = ( item.base_row_total_incl_tax - item.base_tax_invoiced ) / qty_invoiced;
                    }
                    
                    var order_shipping_info = {
                        "Nummer": deleiveryno.Result, // Delivery Note Number
                        "Empfaenger": futuracustomerid, // Futura customer ID
                        "Lieferdatum": datetoISO(item.created_at), // created at date
                        "Filiale": filialeval, // # modified for reverse delivery-note // store number
                        "Auftrag": futuraorderid, // Futura ORder ID
                        "Umst_flag": 1,
                        "Hostid": item.sku, // Product SKU
                        "Lfs_pos": deliver_note_item_pos, // Delivery note item position
                        "Auf_pos": auf_pos, // Item's position in Futura Order
                        "Menge": menge, // If reverse delivery note is creating
                        "Berechnet": berechnet, // then value will be in negative
                        "Ek": unitPrice,
                        "Vk_netto": itemPriceExcludingTax,
                        "Vk_brutto": itemPriceIncludingTax,
                        "Umsatzsteuerschluessel": 3
                    };
                    

                    // Only for the postal charge
                    if(typeof params.onlyshipmentcharge != "undefined"){
                        if(
                            (item.sku == params.FUTURA_SHIPPING_SKU) && 
                            (typeof item.delivery_note_type != 'undefined') &&
                            (item.delivery_note_type == 'shipping')
                        ){
                            shippinginfo.push(order_shipping_info);
                        }
                    } else if(typeof params.only_adjustment != "undefined"){
                        // Only for the adjustment amount 
                        if(
                            (item.sku == params.FUTURA_ADJUSTMENT_SKU) && 
                            (typeof item.delivery_note_type != 'undefined') &&
                            (item.delivery_note_type == 'adjustment')
                        ){
                            shippinginfo.push(order_shipping_info);
                        }
                    } else {
                        // For all the items available in the order/shipment/creditmemo
                        if (!shipping_adjustment_skus.includes(item.sku)) {
                            shippinginfo.push(order_shipping_info);
                        }
                    }
                    deliver_note_item_pos++;
                }
            }

            counter++;
        });
        
    } catch (error) {
        shippingitem = error.message
    }
    

    return {"Delivery_typ_2": shippinginfo}
    //return {"Delivery_typ_2": [shippingitem, filialeInfo], "itemsArray": itemsArray}

}

function gettype3items(orderinfo,futuraorderid,futuracustomerid,deleiveryno){

    var billing_address = orderinfo.billing_address;
    if (typeof orderinfo.extension_attributes.shipping_assignments[0].shipping.address == 'undefined') {
        var shipping_address = orderinfo.billing_address;
    } else {
        var shipping_address = orderinfo.extension_attributes.shipping_assignments[0].shipping.address;
    }

    var type3 = [
        {
          "Nummer": deleiveryno.Result,
          "Name_1": billing_address.firstname,
          "Name_2": billing_address.lastname,
          "Strasse": billing_address.street[0],
          "Postleitzahl": billing_address.postcode,
          "Ort": billing_address.city,
          "Land": billing_address.country_id == "NZ"? 14 : 1,
          "Sachbearbeiter": "",
          "Titel": "",
          "Strasse2": billing_address.street[1],
          "Landkreis": billing_address.region
        },
        {
          "Nummer": deleiveryno.Result,
          "Name_1": shipping_address.firstname,
          "Name_2": shipping_address.lastname,
          "Strasse": shipping_address.street[0],
          "Postleitzahl": shipping_address.postcode,
          "Ort": shipping_address.city,
          "Land": shipping_address.country_id == "NZ"? 14 : 1,
          "Sachbearbeiter": "",
          "Titel": "",
          "Strasse2": shipping_address.street[1],
          "Landkreis": shipping_address.region
        }
      ];
    return {"Delivery_typ_3": type3}

}

function getNewdeliverynoteNo(params, futuraorderid){
    var headers = getFuturaHeader(params)

    var updatedata = {
        'Order_no' : futuraorderid
    }

    return new Promise((resolve, reject) => {
        soap.createClient(params.FUTURA_ORDER_API, {wsdl_headers: headers}, function(err, client) {
        if(err){
          reject(err)
        }
        
        setOrderClient(params,client)

        client.get_new_delivery_no(updatedata, function(err, result) {
          if(err){
            reject(err)
          }else{
            resolve(result)
          }
        },{timeout: params.SOAP_TIMEOUT})
      })
    })
}

function datetoISO(datetime){
    const [datesting,time] = datetime.split(' ');
    const [year,month, day] = datesting.split('-');
    const date = new Date(Date.UTC(year, month - 1, day));
    const ISOdate = date.toISOString();

    return ISOdate
}

function addShippingInfoInDeliveryNote(shipment, is_reverse, order, params, creditmemoinfo)
{
    var base_price_incl_tax = 0;
    var base_row_total_incl_tax = 0;
    var base_tax_invoiced = 0;
    var created_at = '';

    if(
        is_reverse == true && 
        (typeof params.only_adjustment == "undefined") &&
        (typeof params.onlyshipmentcharge != "undefined")
    ) {
        base_price_incl_tax = (creditmemoinfo.shipping_incl_tax)
        base_row_total_incl_tax = (creditmemoinfo.base_shipping_incl_tax)
        base_tax_invoiced = (creditmemoinfo.base_shipping_tax_amount)
        created_at = creditmemoinfo.created_at
    } else if(
        is_reverse == true && 
        (typeof params.only_adjustment != "undefined") && 
        (params.only_adjustment == true) 
    ) {
        base_price_incl_tax = (creditmemoinfo.base_adjustment)
        base_row_total_incl_tax = (creditmemoinfo.base_adjustment)
        base_tax_invoiced = (creditmemoinfo.base_adjustment)
        created_at = creditmemoinfo.created_at
    } else {
        base_price_incl_tax = (order.base_shipping_incl_tax)
        base_row_total_incl_tax = (order.base_shipping_incl_tax)
        base_tax_invoiced = (order.base_shipping_tax_amount)
        created_at = shipment.created_at
    }

    var shippingitem = {
        'qty': 1,
        'sku': (params.only_adjustment == true) ? params.FUTURA_ADJUSTMENT_SKU : params.FUTURA_SHIPPING_SKU,
        'base_price': 0,
        'base_price_incl_tax': base_price_incl_tax,
        'item_id': 0,
        'base_row_total_incl_tax': base_row_total_incl_tax,
        'base_tax_invoiced': base_tax_invoiced,
        'qty_invoiced': 1,
        'created_at': created_at,
        'order_item_id': 0,
        'product_type': 'simple',
        'delivery_note_type': (params.only_adjustment == true) ? 'adjustment' : 'shipping',
        'quantity_reverse': 1,
        'reversal': true
    }

    return shippingitem
}

function deliveryExistPayload(order_id)
{
    payloadForDeliveryNoteExist.Request_fields[0].DB_request.Field_value = order_id;
    return payloadForDeliveryNoteExist
}

async function isDeliveryNoteExist(params, payload)
{
    var apiEndpoint = params.FUTURA_ORDER_API+'?service=FuturaERS_HOST';
    var futura_headers = getFuturaHeader(params);

    return new Promise((resolve, reject)=> {
        soap.createClient(apiEndpoint, {wsdl_headers:futura_headers, escapeXML: false}, function(err, client) {

            if(err) {
                reject({'statusCode': 502, 'error': {"message": "Futura Delivery Note Exist Check | Not able to connect "+apiEndpoint, "errorCode": error.code}})
            }

            if (client) {
                setOrderClient(params, client)
                client.read_table(payload, function(err, result) {
                    if(err){
                        reject({'statusCode': 400, 'error': err, "lastcall": client.lastRequest})
                    }
                    else {
                        resolve({'statusCode': 200, 'result': result, "lastcall": client.lastRequest})
                    }
                });
            } else {
                reject({'statusCode': 404, 'error': 'read_table method not found.'});
            }

        })
    })
}

function getShipmentIncrementNumber(deliverynote_text)
{
    var [ordertext, shipment_id] = deliverynote_text.split('|');
    shipment_id = shipment_id.trim();
    return shipment_id;
}

function getCreditMemoItemsInfo(creditmemo){
    var item_data = [];
    creditmemo.items.forEach((item, index) => {
        console.log("Item: ", item)
        item_data[item.order_item_id] = {
            "qty": item.qty
        }
    });

    return item_data;
}

function getRmaItemsInfo(rma_data){
    var item_data = [];
    var rma_items = rma_data.items;
    rma_items.forEach((rmaorder, index) => {
        rmaorder.items.forEach((item, itemindex) => {
            item_data[item.order_item_id] = {
                "qty_requested": item.qty_requested,
                "qty_authorized": item.qty_authorized,
                "qty_approved": item.qty_approved,
                "qty_returned": item.qty_returned,
                "rma_status": rmaorder.status
            }
        });
    });

    return item_data;
}

function setOrderItemIsReadyForReversal(order, creditmemo, rma_data)
{
    try{
        var creditmemo_data = {};
        creditmemo.items.forEach((item, index) => {
            creditmemo_data[item.order_item_id] = {
                "qty": item.qty
            }
        });

        if(rma_data.total_count > 0) {
            var rma_items_data = {};
            var rma_items = rma_data.items;
            rma_items.forEach((rmaorder, index) => {
                rmaorder.items.forEach((item, itemindex) => {
                    rma_items_data[item.order_item_id] = {
                        "qty_requested": item.qty_requested,
                        "qty_authorized": item.qty_authorized,
                        "qty_approved": item.qty_approved,
                        "qty_returned": item.qty_returned,
                        "rma_status": rmaorder.status
                    }
                });
            });
        } else {
            var rma_items_data = {};
        }

        order.items.forEach((item, index) => {
            var reversal = false;
            var quantityReverse = 0;
            var pendingShipmentQty = item.qty_invoiced - item.qty_shipped;
            if (item.qty_shipped > 0) {
                if(item.qty_shipped === item.qty_invoiced){
                    reversal = true;
                    quantityReverse = creditmemo_data[item.item_id].qty;
                } else {
                    if(typeof rma_items_data[item.item_id] != 'undefined' && rma_items_data[item.item_id]){
                        if (rma_items_data[item.item_id].qty_returned >= creditmemo_data[item.item_id].qty) {
                            reversal = true;
                            quantityReverse = creditmemo_data[item.item_id].qty;
                        } else {
                            // You might want to handle this case differently
                        }
                    } else {
                        quantityReverse = (creditmemo_data[item.item_id].qty - pendingShipmentQty > 0) ? (creditmemo_data[item.item_id].qty - pendingShipmentQty) : 0;
                        reversal = false;
                    }
                }
            }

            order.items[index]['reversal'] = reversal;
            order.items[index]['quantity_reverse'] = quantityReverse;
        });
    } catch (error) {
        // return error.message;
        return {'message': error.message, 'status': false};
    }
    

    return {'order': order, 'status': true};
}


//noinspection JSAnnotator
module.exports = {
    getCustomerData,
    getCommonFieldData,
    getAddressData,
    SearchInFutura,
    createBlankCustomer,
    getCustomerDataById,
    UpdateCustomerInFututra,
    generatePayloadForFuturaFromEcomOrder,
    createOrderOnFutura,
    isOrderExistonFutura,
    payloadForExistingOrderCheck,
    createDeliveryNote,
    createdeliverynoteparam,
    getCommonById,
    isDeliveryNoteExist,
    deliveryExistPayload,
    getShipmentIncrementNumber,
    getNewdeliverynoteNo,
    payloadForSearch,
    setOrderItemIsReadyForReversal
}