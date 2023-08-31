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
const { Core, Events } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils')
const { getCustomerData, getCommonFieldData, getAddressData, SearchInFutura, createBlankCustomer, getCustomerDataById, UpdateCustomerInFututra } = require('../futura')
const { getCustomer, UpdateCustomerInMagento, getOrderInfo } = require('../magento')
const { generateToken, sendcloudevent } = require('../token')
const { CloudEvent } = require("cloudevents");


// main function that will be executed by Adobe I/O Runtime
async function main(params) {
    // create a Logger
    const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

    try {

        let responseData = {};

        responseData["event_code"] = params.type;
        responseData["provider_id"] = params.source;
        responseData["event_id"] = params.event_id;
        responseData["entity"] = "Create/Update Customer";
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
        //const token = getBearerToken(params)

        var magecustomerupdate = {};
        var order_data = {};
        var viare_order = {};

        // Checking order ID is exists with params or not
        if ((params.data) && (params.data.value.id)) {
            var order_id = params.data.value.id;
            order_data = await getOrderInfo(params, order_id)

            if (
                (typeof order_data != 'undefined') &&
                (typeof order_data.status != 'undefined') &&
                ( (order_data.status == 'processing') ||
                (order_data.status == 'complete') )
            ) {
                var futuraId
                // Checking customer is guest or not
                if (order_data.customer_is_guest == 0) {
                    var magecustomer = await getCustomer(params, order_data.customer_id)
                    if(typeof magecustomer.custom_attributes != "undefined" && magecustomer.custom_attributes.length > 0){
                        for (var i = 0; i < magecustomer.custom_attributes.length; i++) {
                            if(magecustomer.custom_attributes[i].attribute_code == "erp_customer_id")
                            {
                               futuraId = magecustomer.custom_attributes[i].value
                            }
                        }
                    }
                } else {
                    // <<< -- For Guest Customer --- >>
                    var magecustomer = {
                        "email": order_data.customer_email,
                        "firstname": order_data.customer_firstname,
                        "lastname": order_data.customer_lastname
                    }
                }

                // Searching customer by Email
                var result = {}, searchcustomerdata = {}
                searchcustomerdata['request'] = order_data.customer_email
                searchcustomerdata['action'] = "Search By Email"
                try {
                    result = await SearchInFutura(params, order_data.customer_email);
                    searchcustomerdata['status'] = true
                    searchcustomerdata['response'] = result
                } catch (error) {
                    searchcustomerdata['status'] = false
                    searchcustomerdata['response'] = error
                }

                responseData['futura_search_email'] = searchcustomerdata

                // If customer found then Futura customer ID will be assign otherwise it will create new
                var id, updatecustomer
                if (result.length > 0 || futuraId) {
                    if(futuraId){
                        id = futuraId
                    }else{
                        id = result[0]    
                    }
                    var getcustomerdata = {}
                    getcustomerdata['action'] = "Get Customer Detail"
                    getcustomerdata['request'] = id
                    try {
                        updatecustomer = await getCustomerDataById(params, id);
                        getcustomerdata['status'] = true
                        getcustomerdata['response'] = updatecustomer
                    } catch (error) {
                        getcustomerdata['status'] = false
                        getcustomerdata['response'] = error
                    }
                    responseData['futura_get_customer_detail'] = getcustomerdata
                } else {
                    var getBlankcustomerId = {}
                    getBlankcustomerId['action'] = "Get Blank Customer"
                    try {
                        var customer = await createBlankCustomer(params)
                        id = customer.get_web_new_customer_idResult.web_kde_nummer
                        getBlankcustomerId['status'] = true
                        getBlankcustomerId['response'] = id
                    } catch (error) {
                        getBlankcustomerId['status'] = false
                        getBlankcustomerId['response'] = error
                    }
                    responseData['futura_get_blank_customer'] = getBlankcustomerId
                    updatecustomer = {
                        "customer": getCustomerData(),
                        "comon": getCommonFieldData(),
                        "address": getAddressData()
                    }
                }

                // Updating (Customer address on futura, Futura ID on Magento)
                if (id) {
                    updatecustomer.customer.web_kde_nummer = id
                    updatecustomer.address.web_ans_nummer = id
                    updatecustomer.comon.web_add_nummer = id

                    updatecustomer.comon.web_add_status = 2;
                    if ((magecustomer) && (magecustomer.dob)) {
                        const [datesting, time] = magecustomer.dob.split(' ');
                        const [year, month, day] = datesting.split('-');
                        const date = new Date(Date.UTC(year, month - 1, day));
                        const dob = date.toISOString();
                        updatecustomer.address.web_ans_sachgeburtstag = dob
                    }

                    var email = magecustomer.email;
                    updatecustomer.address.web_ans_name1 = magecustomer.firstname
                    updatecustomer.address.web_ans_name2 = magecustomer.lastname
                    updatecustomer.address.web_ans_email = email.toLowerCase()

                    // Saving billing address with customer
                    var street = order_data.billing_address.street;
                    updatecustomer.address.web_ans_strasse = street[0]
                    updatecustomer.address.web_ans_strasse_2 = (typeof street[1] == 'undefined' && street[1] != null) ? "" + street[1] : ""
                    updatecustomer.address.web_ans_ort = order_data.billing_address.city // city
                    updatecustomer.address.web_ans_plz = order_data.billing_address.postcode // postcode
                    updatecustomer.address.web_ans_telefon = order_data.billing_address.telephone // telephone
                    updatecustomer.address.web_ans_land = (order_data.billing_address.country_id == 'AU' ? 1 : 14)// country_id

                    givexnumber = updatecustomer.comon.web_add_kreditkarte
                    rewarddate = updatecustomer.comon.web_add_sperrdatum
                    var expdateIso = new Date(rewarddate)

                    var rewardyear = expdateIso.toLocaleString("default", { year: "numeric" });
                    var rewardmonth = expdateIso.toLocaleString("default", { month: "2-digit" });
                    var rewardday = expdateIso.toLocaleString("default", { day: "2-digit" });

                    // Generate yyyy-mm-dd date string
                    var expirydate = rewardyear + "-" + rewardmonth + "-" + rewardday + " 00:00:00";

                    updatecustomer.comon.web_add_sperrdatum = expdateIso.toISOString()

                    var updateCustomer = {}
                    updateCustomer['action'] = "Update Customer"
                    updateCustomer['request'] = updatecustomer
                    try {
                        var customerdata = await UpdateCustomerInFututra(params, updatecustomer)
                        updateCustomer['status'] = true
                        updateCustomer['response'] = customerdata
                    } catch (error) {
                        updateCustomer['status'] = false
                        updateCustomer['response'] = error
                    }

                    responseData['futura_update_customer'] = updateCustomer

                    var found = false;
                    var foundAndUpdate = true;
                    if (magecustomer.custom_attributes && magecustomer.custom_attributes.length > 0) {

                        for (var i = 0; i < magecustomer.custom_attributes.length; i++) {
                            if (magecustomer.custom_attributes[i].attribute_code == "erp_customer_id" && id) {
                                if (magecustomer.custom_attributes[i].value == id) {
                                    foundAndUpdate = false;
                                }
                                magecustomer.custom_attributes[i].value = id
                                found = true;
                            }
                        }

                        if (found == false) {
                            var attrdata = {
                                "attribute_code": "erp_customer_id",
                                "value": id
                            }
                            magecustomer.custom_attributes.push(attrdata);
                        }

                        if (foundAndUpdate == true) {
                            magecustomerupdate = await UpdateCustomerInMagento(params, { "customer": magecustomer }, magecustomer.id);
                        }
                    } else {
                        var attrdata = {
                            "attribute_code": "erp_customer_id",
                            "value": id
                        }
                        magecustomer.custom_attributes = [];
                        magecustomer.custom_attributes.push(attrdata);
                        magecustomerupdate = await UpdateCustomerInMagento(params, { "customer": magecustomer }, magecustomer.id);
                    }

                    // Viare Order
                    viare_order = await sendcloudevent(
                        params,
                        params.VIARE_ORDER_CREATE_PROVIDERCODE,
                        params.VIARE_ORDER_CREATE_EVENT_CODE,
                        { 'futura_customer_id': id, 'order': order_data, "givexnumber": updatecustomer.comon.web_add_kreditkarte }
                    );

                }
            }
        }

        // Magento Logging
        var published = await sendcloudevent(
            params, 
            params.DUSK_MAGENTO_PROVIDER_ID, 
            params.DUSK_LOGGING_EVENT_CODE, 
            responseData
        );

        const response = {
            statusCode: 200,
            body: published
        }
        return response

    } catch (error) {
        // log any server errors
        console.error(error); // Log the detailed error object
        // return with 500
        return errorResponse(500, 'server error' + error, logger)
    }
}

exports.main = main


