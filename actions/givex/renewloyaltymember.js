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

var lines = [];
const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils')
const {getCustomerData, getCommonFieldData, getAddressData,SearchInFutura,createBlankCustomer, getCustomerDataById, UpdateCustomerInFututra} = require('../futura')
const { getCustomer, UpdateCustomerInMagento, getOrderInfo, getCustomerByEmail, getFuturaCustomer, SaveFuturaCustomer} = require('../magento')
const { duskportalrenewCustomerPayload, RenewLoyaltyData } = require('../duskportal')
const {sendcloudevent} = require('../token')

  
// Main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // Create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {

      let responseData = {}; // To store response for logging module

      responseData["event_code"] = params.type;
      responseData["provider_id"] = params.source;
      responseData["event_id"] = params.event_id;
      responseData["entity"] = "Loyalty Member Renew Expirey Date";
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

      var data = params.data.value;

      // Magento order info
      var magentoOrder = await
      getOrderInfo(params, data.order_id);

      // getting customer from the email
      var magecustomersearch = await
      getCustomerByEmail(params, magentoOrder.customer_email)

      // getting futura customer from the staging table
      var magentostagetable = await
      getFuturaCustomer(params, data.futura_id)

      //getting futura customer from futura
      var futuraCustomer = await
      getCustomerDataById(params, data.futura_id);

      var givexnumber = futuraCustomer.comon.web_add_kreditkarte
      var givexid = futuraCustomer.comon.web_add_kundennummer

      var guest = true;

      // Checking if we have found any customer from the email
      // from the order to know if customer is already registered.
      if (magecustomersearch.total_count > 0) {
          var magecustomer = magecustomersearch.items[0]
          guest = false
      }

      var updatecustomer;  // To store customer details from futura
      var getcustomerdata = {};  // used to store data in response data
      var timeouterror = false  // Flag to check for timeout error
      // If params.data.futura_get_customer exist and if status is true
      // if (typeof params.data.futura_get_customer !== "undefined" && typeof params.data.futura_get_customer.status == "true") {
      //updatecustomer = params.data.futura_get_customer.response;
      //getcustomerdata = params.data.futura_get_customer;
  //} else {
      try {
          //if (typeof params.data.futura_get_customer.request !== "undefined") {
          //var futura_id = params.data.futura_get_customer.request
          //} else {
          //var futura_id = params.data.value.futura_id
          // }
          getcustomerdata['action'] = "Futura - Get Customer"
          getcustomerdata['request'] = params.data.value.futura_id
          // Search Customer in Futura with futura id got from staging table 
          updatecustomer = await getCustomerDataById(params,data.futura_id);
          getcustomerdata['status'] = true
          getcustomerdata['response'] = updatecustomer
      }catch(error){
          if(error.code == "ECONNABORTED"){
            timeouterror = true
          }
          getcustomerdata['status'] = false
          getcustomerdata['response'] = error
      }
      // }
      responseData['futura_get_customer'] = getcustomerdata

    // Check if Customer is found in futura and there is no timeout error
    if(getcustomerdata.status == true && timeouterror == false){

        // Build request for Update customer
        var timezone = magentoOrder.base_currency_code == "AUD" ? "Australia/Sydney" : "Pacific/Auckland"
        
        var newexpdate = getTimeZonewiseDate(timezone, magentoOrder.created_at, updatecustomer.comon.web_add_sperrdatum,params.LOYALTY_MEMBERSHIP_TIME_YEAR)
        
        var expdateIso = new Date(newexpdate);
        var expirydate = expdateIso.toISOString();

        updatecustomer.comon.web_add_sperrdatum = expirydate



        var expdateIso = new Date(expirydate)

        var expiryyear = expdateIso.toLocaleString("default", { year: "numeric" });
        var expirymonth = expdateIso.toLocaleString("default", { month: "2-digit" });
        var expiryday = expdateIso.toLocaleString("default", { day: "2-digit" });

        // Generate yyyy-mm-dd date string
        var expdate = expiryyear + "-" + expirymonth + "-" + expiryday + " 00:00:00";

        
        var updatedate = new Date();        
        updatecustomer.comon.web_add_wf_date_time_2 = updatedate.toISOString();
        updatecustomer.comon.web_add_wf_flags = 1
        updatecustomer.address.web_ans_plz_zusatz = 1
        updatecustomer.customer.web_kde_rab_regel = '1'


        // Update customer in Futura
        var updateCustomerresponse={}
        updateCustomerresponse['action'] = "Update Customer"
        updateCustomerresponse['request'] = updatecustomer
        try{
            logger.debug("Futura Data Renew loyalty")
            logger.debug(stringParameters(updatecustomer))

            // Updating Customer Data in Futura
            var customerdata = await UpdateCustomerInFututra(params, updatecustomer)
            
            // Set Status to true if API called successfully
            updateCustomerresponse['status'] = true
            updateCustomerresponse['response'] = customerdata
        }catch(error){

            // Set error in response if API call got any exception
            if(error.code == "ECONNABORTED"){
                timeouterror = true
            }
            updateCustomerresponse['status'] = false
            updateCustomerresponse['response'] = error
        }

        responseData['futura_update_customer'] = updateCustomerresponse

        // check for update customer in Futura is true
        if(updateCustomerresponse.status == true){

            //create payload for duskportal customer create
            var customerid = 0;
            if(guest == false){
                customerid = magecustomer.id
            }
            var duskprotalresponse={};

            // Set Payload for updating customer details in dusk portal
            var duskpayload = await duskportalrenewCustomerPayload(params, updatecustomer,newexpdate)

            duskprotalresponse['action'] = "Dusk Portal Renew Loyalty"
            duskprotalresponse['request'] = duskpayload
            try{
                // Renew Loyalty data in Dusk Portal
                var duskcustomerrenew = await RenewLoyaltyData(params, duskpayload)

                duskprotalresponse['status'] = false
                if(duskcustomerrenew.success == true){
                    duskprotalresponse['status'] = true
                }
                duskprotalresponse['response'] = duskcustomerrenew
            }catch(error){
                duskprotalresponse['status'] = false
                duskprotalresponse['response'] = error
            }

            responseData['dusk_protal_renew_loaylty'] = duskprotalresponse
        }
        
        //Update customer data in Futura stage table in Adobe Commerce

        var futurastageresponse={};
        if(magentostagetable.id == null){
            magentostagetable.futura_id = data.futura_id
            magentostagetable.email = magentoOrder.customer_email
            magentostagetable.givex_id = givexid
            magentostagetable.memership_card_no = givexnumber
        }
        magentostagetable.card_exp_date = expdate


        futurastageresponse['action'] = "Futura Stage Update Customer"
        futurastageresponse['request'] = magentostagetable
        try{
            // Update customer data in Futura stage
            var futurastagecreate = await SaveFuturaCustomer(params, {"futurastageDataObject": magentostagetable})

            futurastageresponse['status'] = true
            futurastageresponse['response'] = futurastagecreate
        }catch(error){
            futurastageresponse['status'] = false
            futurastageresponse['response'] = error
        }

        responseData['futura_stage_update_customer'] = futurastageresponse

        var magegivex=false, mageexpiry = false
        
        // Checking if Customer has any custom attributes or not
        if(typeof magecustomer.custom_attributes != "undefined" && magecustomer.custom_attributes.length > 0){
        
            // Iterate over all the custom attributes and set givex card number and expiry date
            // with the matching attribute
            for (var i = 0; i < magecustomer.custom_attributes.length; i++) {

                // Checking if the custom attribute can be used to store givex card number
                if (magecustomer.custom_attributes[i].attribute_code == "givex_number" && givexnumber) {
                    // Setting givex card number to the givex_number attribute
                    magecustomer.custom_attributes[i].value = givexnumber
                    magegivex = true;
                }

                // Checking if the custom attribute can be used to store Expiry Date
                if (magecustomer.custom_attributes[i].attribute_code == "rewards_expiry_date" && expirydate) {
                    // Setting expiry date to the rewards_expiry_date attribute
                    magecustomer.custom_attributes[i].value = expirydate
                    mageexpiry = true;
                }
            }

        }
        // Creating the custom attributes for storing 
        // Givex card number if not present in customer already
        if(magegivex == false){
            var attrdata = {
                "attribute_code": "givex_number",
                "value": givexnumber
            }
            if(typeof magecustomer.custom_attributes != "undefined"){
                magecustomer.custom_attributes.push(attrdata);    
            }else{
                magecustomer["custom_attributes"] = []
                magecustomer.custom_attributes.push(attrdata);
            }
        }

        // Creating the custom attributes for storing 
        // Givex Expiry date if not present in customer already
        if(mageexpiry == false){
            var attrdata = {
                "attribute_code": "rewards_expiry_date",
                "value": expirydate
            }

            if(typeof magecustomer.custom_attributes != "undefined"){
                magecustomer.custom_attributes.push(attrdata);    
            }else{
                magecustomer["custom_attributes"] = []
                magecustomer.custom_attributes.push(attrdata);
            }
        }
        // Update customer data in magento 
        var magecustomerupdate = await UpdateCustomerInMagento(params,{"customer": magecustomer},magecustomer.id);

    }
    // Setting response for futura in logging module if any timeout error ocurred
    if(timeouterror == true){
        responseData['futura'] = {
            "action": "Timeout error",
            "request": params.data.value,
            "status": false,
            "response": "Timeout error",
        }
    }
    
    // Send Logging request to magento for API logs
    var published = await sendcloudevent(params,params.DUSK_MAGENTO_PROVIDER_ID, params.DUSK_LOGGING_EVENT_CODE, responseData)  

    // Setting response to this action
    const response = {
      statusCode: 200,
      body: published
    }
    return response

}catch (error) {
    // Log any server errors
    console.error(error); // Log the detailed error object
    // Return with 500
    return errorResponse(500, 'server error'+error, logger)
  }
}

exports.main = main

// Get the Expiry Date of the Card by adding required years to enrollment date or order date or year to add
function getTimeZonewiseDate(timezone, magentoorderdate, expdate ,yeartoadd)
{

    var AUSdate = new Date().toLocaleDateString("en-US", {timeZone: timezone});

    var magento_order_date_obj = new Date(magentoorderdate)
    // Get Order year date to check current Futura expiry
    var magento_order_date_year = magento_order_date_obj.toLocaleString("default", { year: "numeric" });

     var currentdate = new Date(AUSdate);

    var cusexpdate = new Date(expdate)

    if(currentdate < cusexpdate){
        currentdate = cusexpdate
    }

    var date = new Date(currentdate);

    // Get year, month, and day part from the date
    var futura_year = date.toLocaleString("default", { year: "numeric" });

    // if futura year is less than 2 years then add 2 years else use futura expiry.
    if ((futura_year - magento_order_date_year) < parseInt(yeartoadd)) {
        date.setFullYear(date.getFullYear() + parseInt(yeartoadd));
    } else {
        // @todo Condition to check one time extension for one order. Currently adding 2 years every time.
        //date.setFullYear(date.getFullYear());
        date.setFullYear(date.getFullYear() + parseInt(yeartoadd));
    }
    // Get year, month, and day part from the date
    var year = date.toLocaleString("default", {year: "numeric"});
    var month = date.toLocaleString("default", {month: "2-digit"});
    var day = date.toLocaleString("default", {day: "2-digit"});
    // Generate yyyy-mm-dd date string
    var formattedDate = year + "-" + month + "-" + day;

    return formattedDate;
}
