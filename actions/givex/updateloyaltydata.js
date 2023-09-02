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
const {getCustomerData, getCommonFieldData, getAddressData,SearchInFutura,createBlankCustomer, getCustomerDataById, UpdateCustomerInFututra} = require('../futura')
const { getCustomer, UpdateCustomerInMagento, getOrderInfo, getCustomerByEmail} = require('../magento')
const { duskportalCustomerPayload, SendCustomerData } = require('../duskportal')
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

    // extract the user Bearer token from the Authorization header
    const token = getBearerToken(params)


    // Magento order info
    var magentoOrder = await getOrderInfo(params,params.data.value.order_id);

    var magecustomersearch = await getCustomerByEmail(params,magentoOrder.customer_email)

    var guest = true;
    if(magecustomersearch.total_count > 0){
        var magecustomer = magecustomersearch.items[0]
        guest = false
    }   
      
      var updatecustomer, getcustomerdata={}, timeouterror = false
      getcustomerdata['action'] = "Get Customer Detail"
      getcustomerdata['request'] = params.data.value.futura_id
      try{
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

    if(getcustomerdata.status == true && timeouterror == false){

        // Build request for Update customer
        var timezone = magentoOrder.base_currency_code == "AUD" ? "Australia/Sydney" : "Pacific/Auckland"
        var expdate = getTimeZonewiseDate(timezone,params.LOYALTY_MEMBERSHIP_TIME_YEAR)
        var givexnumber = params.data.value.card_no;
        
        var expdateIso = new Date(expdate);

        updatecustomer.comon.web_add_kreditkarte = givexnumber
        updatecustomer.comon.web_add_sperrdatum = expdateIso.toISOString()
        //updatecustomer.comon.web_add_sperrdatum = "1899-12-30T00:00:00.000Z"

        updatecustomer.comon.web_add_sperrgrund = 'dusk Rewards Expiry Date';
        updatecustomer.customer.web_kde_rab_regel = '1';
        updatecustomer.comon.web_add_kundennummer = params.data.value.givex[2];
        
        var updatedate = new Date();        
        updatecustomer.comon.web_add_wf_date_time_1 = updatedate.toISOString();

        updatecustomer.address.web_ans_plz_zusatz = '1'

        // Update customer in Futura
        var updateCustomerresponse={}
        updateCustomerresponse['action'] = "Update Customer"
        updateCustomerresponse['request'] = updatecustomer
        try{
            var customerdata = await UpdateCustomerInFututra(params, updatecustomer)
            updateCustomerresponse['status'] = true
            updateCustomerresponse['response'] = customerdata
        }catch(error){
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
            var duskpayload = await duskportalCustomerPayload(params, updatecustomer,customerid)

            duskprotalresponse['action'] = "Dusk Portal Update Customer"
            duskprotalresponse['request'] = duskpayload
            try{
                // Update customer data in Dusk Portal
                var duskcustomercreate = await SendCustomerData(params, duskpayload)

                duskprotalresponse['status'] = false
                if(duskcustomercreate.success == true){
                    duskprotalresponse['status'] = true
                }
                duskprotalresponse['response'] = duskcustomercreate
            }catch(error){
                duskprotalresponse['status'] = false
                duskprotalresponse['response'] = error
            }

            responseData['dusk_protal_update_customer'] = duskprotalresponse
        }
        
        // @Todo Need to Update customer data in Futura stage table in Adobe Commerce

        /*var magegivex=false, mageexpiry = false
	   
       if(typeof magecustomer.custom_attributes != "undefined" && magecustomer.custom_attributes.length > 0){
            for (var i = 0; i < magecustomer.custom_attributes.length; i++) {

                if(magecustomer.custom_attributes[i].attribute_code == "givex_number" && givexnumber)
                {
                      magecustomer.custom_attributes[i].value = givexnumber
                      magegivex =true;      
                }

                if(magecustomer.custom_attributes[i].attribute_code == "rewards_expiry_date" && expirydate)
                {
                      magecustomer.custom_attributes[i].value = expirydate
                      mageexpiry =true;      
                }
            }

        }

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
        
        var magecustomerupdate = await UpdateCustomerInMagento(params,{"customer": magecustomer},magecustomer.id);*/

    }

    if(timeouterror == true){
        responseData['futura'] = {
            "action": "Timeout error",
            "request": params.data.value,
            "status": false,
            "response": "Timeout error",
        }
    }
    
    var published = await sendcloudevent(params,params.DUSK_MAGENTO_PROVIDER_ID, params.DUSK_LOGGING_EVENT_CODE, responseData)  


    const response = {
      statusCode: 200,
      body: published
    }
    return response

}catch (error) {
    // log any server errors
    console.error(error); // Log the detailed error object
    // return with 500
    return errorResponse(500, 'server error'+error, logger)
  }
}

exports.main = main


function getTimeZonewiseDate(timezone, yeartoadd)
{
    var AuDate = new Date().toLocaleDateString("en-US", {timeZone: timezone});

    var date = new Date(AuDate);

    date.setFullYear(date.getFullYear() + parseInt(yeartoadd));

    // Get year, month, and day part from the date
    var year = date.toLocaleString("default", { year: "numeric" });
    var month = date.toLocaleString("default", { month: "2-digit" });
    var day = date.toLocaleString("default", { day: "2-digit" });

    // Generate yyyy-mm-dd date string
    var formattedDate = year + "-" + month + "-" + day;

    return formattedDate;
}
