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
const { errorResponse, getBearerToken, stringParameters, getdateasstring, checkMissingRequestInputs } = require('../utils')
const {getCustomerData, getCommonFieldData, getAddressData,SearchInFutura,createBlankCustomer, getCustomerDataById, UpdateCustomerInFututra} = require('../futura')
const { getCustomer, UpdateCustomerInMagento, getOrderInfo, getCustomerByEmail, getFuturaCustomer, SaveFuturaCustomer} = require('../magento')
const { duskportalCustomerPayload, SendCustomerData } = require('../duskportal')
const {sendcloudevent} = require('../token')

  
// Main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // Create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {

    let responseData = {};  // To store response for logging module

    // Setting response for logging module
    responseData["event_code"] = params.type;
    responseData["provider_id"] = params.source;
    responseData["event_id"] = params.event_id;
    responseData["entity"] = "Loyalty Member Update Data";

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

    // Extract the user Bearer token from the Authorization header
    const token = getBearerToken(params)

    var data = params.data.value;


    // Magento order info for the dusk Reward 
    var magentoOrder = await getOrderInfo(params,params.data.value.order_id);

    // Search Customer in magento with email id
    var magecustomersearch = await getCustomerByEmail(params,magentoOrder.customer_email)

    // Get Futura Customer from staging table
    var magentostagetable = await getFuturaCustomer(params,params.data.value.futura_id)

    var guest = true;

    // Checking if we have found any customer from the email
    // from the order to know if customer is already registered.
    if(magecustomersearch.total_count > 0){
        var magecustomer = magecustomersearch.items[0]
        guest = false // Set the flag to false as customer is found so not a guest Customer
    }   
      
      var updatecustomer;  // To store customer details from futura
      var getcustomerdata={};  // used to store data in response data
      var timeouterror = false  // Flag to check for timeout error
      getcustomerdata['action'] = "Get Customer Detail"
      getcustomerdata['request'] = params.data.value.futura_id
      try{
          // Search Customer in Futura with futura id got from staging table 
          updatecustomer = await getCustomerDataById(params,params.data.value.futura_id);
          getcustomerdata['status'] = true
          getcustomerdata['response'] = updatecustomer
      }catch(error){
          if(error.code == "ECONNABORTED"){
            timeouterror = true
          }
          getcustomerdata['status'] = false
          getcustomerdata['response'] = error
      }
      responseData['futura_get_customer_detail'] = getcustomerdata
    
    // Check if Customer is found in futura and there is no timeout error
    if(getcustomerdata.status == true && timeouterror == false) {

        // Build request for Update customer
        var timezone = magentoOrder.base_currency_code == "AUD" ? "Australia/Sydney" : "Pacific/Auckland"

        var givexnumber = params.data.value.card_no;


        var mage_rewards_expiry_date = "";

        // Checking if Customer has any custom attributes or not
        if(typeof magecustomer.custom_attributes != "undefined" && magecustomer.custom_attributes.length > 0) {
            // Iterate over all the custom attributes and set givex card number and expiry date
            // with the matching attribute
            for (var i = 0; i < magecustomer.custom_attributes.length; i++) {
                // Checking if the custom attribute can be used to store Expiry Date
                if (magecustomer.custom_attributes[i].attribute_code == "rewards_expiry_date") {
                    // expiry date to the rewards_expiry_date attribute
                    mage_rewards_expiry_date = magecustomer.custom_attributes[i].value
                    return;
                }
            }
        }


        logger.debug("mage_rewards_expiry_date: " + mage_rewards_expiry_date);

        updatecustomer.comon.web_add_kreditkarte = givexnumber

        // Checking if expiry date is different in Magento and Futura and then only update
        var expdate = getTimeZonewiseDate(timezone, mage_rewards_expiry_date, updatecustomer.comon.web_add_sperrdatum, params.LOYALTY_MEMBERSHIP_TIME_YEAR)
        logger.debug("expdate: " + expdate);
        if (expdate) {
            var expdateIso = new Date(expdate);
            // If blank in Magento then only add in Futura as this action is only for one time purchase.
            if (mage_rewards_expiry_date == "") {
                updatecustomer.comon.web_add_sperrdatum = expdateIso.toISOString()
            }
        }
        //updatecustomer.comon.web_add_sperrdatum = "1899-12-30T00:00:00.000Z"
        logger.debug("enrolldate: " + updatecustomer.comon.web_add_wf_date_time_1);

        var currentAusDate = new Date().toLocaleDateString("en-US", {timeZone: timezone});
        var currentAusDateIso = new Date(currentAusDate);

        // If enrollment date is blank (default values) then use current date.
        if (getdateasstring(updatecustomer.comon.web_add_wf_date_time_1) ==  "18991230") {
            updatecustomer.comon.web_add_wf_date_time_1 = currentAusDateIso.toISOString();
            logger.debug("enrolldate after: " + currentAusDateIso.toISOString());
        }


        updatecustomer.comon.web_add_sperrgrund = 'dusk Rewards Expiry Date';
        updatecustomer.customer.web_kde_rab_regel = '1';
        updatecustomer.comon.web_add_kundennummer = params.data.value.givex[2];
        


        updatecustomer.address.web_ans_plz_zusatz = '1'

        // Update customer in Futura
        var updateCustomerresponse={};  // To store response for updated Cusotmer Info
        updateCustomerresponse['action'] = "Update Customer"
        updateCustomerresponse['request'] = updatecustomer
        try{
            logger.debug("Futura Data Updateloyalty")
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

        // Setting data for logging module
        responseData['futura_update_customer'] = updateCustomerresponse

        var customerid = 0;
        if(guest == false){
            customerid = magecustomer.id
        }

        // Check for update customer in Futura is true
        if(updateCustomerresponse.status == true){

            //Create payload for duskportal customer create

            var givexdata = {
                "futura_id": params.data.value.futura_id,
                "card_no" : data.card_no,
                "card_iso" : data.givex[6],
                "givex_id" : data.givex[2]
            }
            var duskportalresponse={};

            // Set Payload for updating customer details in dusk portal
            var duskpayload = await duskportalCustomerPayload(params, updatecustomer,customerid,givexdata)

            duskportalresponse['action'] = "Dusk Portal Update Customer"
            duskportalresponse['request'] = duskpayload
            try{
                logger.debug("Dusk Portal Data UpdateLoyalty");
                logger.debug(stringParameters(duskpayload))
                
                // Update customer data in Dusk Portal
                var duskcustomercreate = await SendCustomerData(params, duskpayload)

                duskportalresponse['status'] = false
                if(duskcustomercreate.success == true){
                    duskportalresponse['status'] = true
                }
                duskportalresponse['response'] = duskcustomercreate
            }catch(error){
                duskportalresponse['status'] = false
                duskportalresponse['response'] = error
            }

            responseData['dusk_portal_update_customer'] = duskportalresponse
        }
        
        //Update customer data in Futura stage table in Adobe Commerce

        var futurastageresponse={};  // Used to store response data for futura stage response in logging module
        if(magentostagetable.id == null){
            magentostagetable.futura_id = params.data.value.futura_id
            magentostagetable.email = magentoOrder.customer_email
            magentostagetable.givex_id = data.givex[2]
            magentostagetable.memership_card_no = data.card_no
        }
        if (expdate) {
            magentostagetable.card_exp_date = expdate
        }


        futurastageresponse['action'] = "Futura Stage Update Customer"
        futurastageresponse['request'] = magentostagetable
        // try{
        //     // Update customer data in Futura stage
        //     var futurastagecreate = await SaveFuturaCustomer(params, {"futurastageDataObject": magentostagetable})
        //
        //     futurastageresponse['status'] = true
        //     futurastageresponse['response'] = futurastagecreate
        // }catch(error){
        //     futurastageresponse['status'] = false
        //     futurastageresponse['response'] = error
        // }

        responseData['futura_stage_update_customer'] = futurastageresponse


        var magegivex=false, mageexpiry = false
	   
        // Checking if Customer has any custom attributes or not
       if(typeof magecustomer.custom_attributes != "undefined" && magecustomer.custom_attributes.length > 0){
            
        // Iterate over all the custom attributes and set givex card number and expiry date 
        // with the matching attribute
        for (var i = 0; i < magecustomer.custom_attributes.length; i++) {

                // Checking if the custom attribute can be used to store givex card number
                if(magecustomer.custom_attributes[i].attribute_code == "givex_number" && givexnumber)
                {
                    // Setting givex card number to the givex_number attribute
                    magecustomer.custom_attributes[i].value = givexnumber
                    magegivex =true;      
                }
                
                // Checking if the custom attribute can be used to store Expiry Date 
                if(magecustomer.custom_attributes[i].attribute_code == "rewards_expiry_date" && expdate)
                {
                    // Setting expiry date to the rewards_expiry_date attribute
                    magecustomer.custom_attributes[i].value = expdate
                    mageexpiry =true;      
                }
            }

        }

        // Creating the custom attributes for storing 
        // Givex card number if not present in customer already
        if(magegivex == false && givexnumber){
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
        if(mageexpiry == false && expdate){
            var attrdata = {
                "attribute_code": "rewards_expiry_date",
                "value": expdate
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
      body:published
    }
    return response

}catch (error) {
    // Log any server errors
    console.error(error); // Log the detailed error object
    // Return with 500 Status Code
    return errorResponse(500, 'server error'+error, logger)
  }
}

exports.main = main

// Get the Expiry Date of the Card by adding required years to enrollment date or order date
function getTimeZonewiseDate(timezone, magentorewardsdate, futuraexpirydate, yeartoadd)
{
    var futura_expiry_date = new Date(futuraexpirydate);
    var futura_expiry_year = futura_expiry_date.toLocaleString("default", { year: "numeric" });
    var futura_expiry_month = futura_expiry_date.toLocaleString("default", { month: "2-digit" });
    var futura_expiry_day = futura_expiry_date.toLocaleString("default", { day: "2-digit" });

    var futura_expiry_date_ymd = futura_expiry_year + "-" + futura_expiry_month + "-" + futura_expiry_day;

    if (futura_expiry_date_ymd && futura_expiry_date_ymd != "1899-12-29" && futura_expiry_date_ymd != "1899-12-30") {
        return futura_expiry_date_ymd;
    }

    var AuDate = new Date().toLocaleDateString("en-US", {timeZone: timezone});

    var date = new Date(AuDate);

    // If Magento Rewards date is blank then add 2 years so that we do not add multiple times
    if (magentorewardsdate == "") {
        date.setFullYear(date.getFullYear() + parseInt(yeartoadd));
        // Get year, month, and day part from the date
        var year = date.toLocaleString("default", {year: "numeric"});
        var month = date.toLocaleString("default", {month: "2-digit"});
        var day = date.toLocaleString("default", {day: "2-digit"});

        // Generate yyyy-mm-dd date string
        var formattedDate = year + "-" + month + "-" + day;

        return formattedDate;
    }
    return false;
}
