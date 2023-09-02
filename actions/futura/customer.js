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
const { getCustomer, UpdateCustomerInMagento , getCustomerByEmail} = require('../magento')
const {sendcloudevent} = require('../token')
const {customerDataPayload, call} = require('../givex')
const { duskportalCustomerPayload, SendCustomerData } = require('../duskportal')

  
// main function that will be executed by Adobe I/O Runtime
async function main (params) {
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
    const token = getBearerToken(params)

    // get Magento customer
    var magecustomer = await getCustomer(params , params.data.value.entity_id)
    var customerID = params.data.value.entity_id;
    //Storing whole customer data in one another variable (for givex API call)
    var customerInfo = magecustomer;

    var futuraId
    if(typeof magecustomer.custom_attributes != "undefined" && magecustomer.custom_attributes.length > 0){
        for (var i = 0; i < magecustomer.custom_attributes.length; i++) {
            if(magecustomer.custom_attributes[i].attribute_code == "erp_customer_id")
            {
               futuraId = magecustomer.custom_attributes[i].value
            }
        }
    }

    // search customer by email
    var result={},searchcustomerdata={},timeouterror = false

    if(futuraId){
        result[0] = futuraId
    }else{
        searchcustomerdata['request'] = params.data.value.email
        searchcustomerdata['action'] = "Search By Email"
        try{
            result = await SearchInFutura(params,params.data.value.email);
            searchcustomerdata['status'] = true
            searchcustomerdata['response'] = result
        }catch(error){
            if(error.code == "ECONNABORTED"){
                timeouterror = true
            }
            searchcustomerdata['status'] = false
            searchcustomerdata['response'] = error
        }

        responseData['futura_search_email'] = searchcustomerdata
    }

    
    var id,updatecustomer,expirydate,givexnumber
    var getcustomerdata={}
    if((result.length > 0 || futuraId) && timeouterror==false){
      // Get existing customer data based on Id  
      if(futuraId){
        id = parseInt(futuraId)
      }else{
        id = result[0]    
      }
      getcustomerdata['action'] = "Get Customer Detail"
      getcustomerdata['request'] = id
      try{
          updatecustomer = await getCustomerDataById(params,id)
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
    }

    if(id && timeouterror == false && getcustomerdata.status == true){

        // Build request for Update customer
        updatecustomer.customer.web_kde_nummer = id
        updatecustomer.address.web_ans_nummer = id
        updatecustomer.comon.web_add_nummer = id

        updatecustomer.comon.web_add_status = 2;
        if(params.data.value.dob){
            const [datesting,time] = params.data.value.dob.split(' ');
            const [year,month, day] = datesting.split('-');
            const date = new Date(Date.UTC(year, month - 1, day));
            const dob = date.toISOString();    
            updatecustomer.address.web_ans_sachgeburtstag = dob
        }
        
        var email = params.data.value.email
        updatecustomer.address.web_ans_name1 = params.data.value.firstname
        updatecustomer.address.web_ans_name2 = params.data.value.lastname
        updatecustomer.address.web_ans_email = email.toLowerCase()

        givexnumber = updatecustomer.comon.web_add_kreditkarte
        rewarddate = updatecustomer.comon.web_add_sperrdatum
        var expdateIso = new Date(rewarddate)

        var rewardyear = expdateIso.toLocaleString("default", { year: "numeric" });
        var rewardmonth = expdateIso.toLocaleString("default", { month: "2-digit" });
        var rewardday = expdateIso.toLocaleString("default", { day: "2-digit" });

        // Generate yyyy-mm-dd date string
        var expirydate = rewardyear + "-" + rewardmonth + "-" + rewardday + " 00:00:00";

        updatecustomer.comon.web_add_sperrdatum = expdateIso.toISOString()
        //updatecustomer.comon.web_add_sperrdatum = "2025-12-30T00:00:00.000Z"

        // Update customer in Futura
        var updateCustomer={}
        updateCustomer['action'] = "Update Customer"
        updateCustomer['request'] = updatecustomer
        try{
            var customerdata = await UpdateCustomerInFututra(params, updatecustomer)
            updateCustomer['status'] = true
            updateCustomer['response'] = customerdata
        }catch(error){
            if(error.code == "ECONNABORTED"){
                timeouterror = true
            }
            updateCustomer['status'] = false
            updateCustomer['response'] = error
        }

        responseData['futura_update_customer'] = updateCustomer
        
        // check and Update Futura customer Id

        var mageerp=false, magegivex=false, mageexpiry = false, magentoerp=true, magentogivex=true,magentoreward=true;
	   
       if(typeof magecustomer.custom_attributes != "undefined" && magecustomer.custom_attributes.length > 0){
        for (var i = 0; i < magecustomer.custom_attributes.length; i++) {
            if(magecustomer.custom_attributes[i].attribute_code == "erp_customer_id" && id)
            {
                  if(magecustomer.custom_attributes[i].value == id){
                        magentoerp = false;                  
                  }
                  magecustomer.custom_attributes[i].value = id
                  mageerp =true;      
            }

            if(magecustomer.custom_attributes[i].attribute_code == "givex_number" && givexnumber)
            {
                  if(magecustomer.custom_attributes[i].value == givexnumber){
                        magentogivex = false;                  
                  }
                  magecustomer.custom_attributes[i].value = givexnumber
                  magegivex =true;      
            }

            if(magecustomer.custom_attributes[i].attribute_code == "rewards_expiry_date" && expirydate && expirydate != "1899-12-30 00:00:00")
            {
                  if(magecustomer.custom_attributes[i].value == expirydate){
                        magentoreward = false;                  
                  }
                  magecustomer.custom_attributes[i].value = expirydate
                  mageexpiry =true;      
            }
        }

        }
        
        if(mageerp == false && id){
        	var attrdata = {
        		"attribute_code": "erp_customer_id",
        		"value": id
        	}
        	if(typeof magecustomer.custom_attributes != "undefined"){
                magecustomer.custom_attributes.push(attrdata);    
            }else{
                magecustomer["custom_attributes"] = []
                magecustomer.custom_attributes.push(attrdata);
            }
        	
        }

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

        if(mageexpiry == false && expirydate && expirydate != "1899-12-30 00:00:00"){
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

        // Update Futura Id in Magento @todo - Need to add condition for givexnumber when they change the attribute
        if(magentoerp == true || (expirydate && expirydate != "1899-12-30 00:00:00" && magentoreward==true)){
            var magecustomerupdate = await UpdateCustomerInMagento(params,{"customer": magecustomer},params.data.value.entity_id);
        }
    }

    //calling givex API to update customer details
    // givexnumber = "60586305549100031908";
    // givexnumber = "60586308721100032507";
    // if(givexnumber != undefined) {
    //     var customerPayloadOfGivex = customerDataPayload(params,'dc_941',givexnumber, customerInfo); 
    //     var givexUpdateResult  = await call(params, 'dc_941', customerPayloadOfGivex);

    //     const newResponse = {
    //         statusCode: 200,
    //         body: {'givexnumber':  givexnumber, 'Payload': customerPayloadOfGivex, 'result':givexUpdateResult}
    //       }
    //       return newResponse;
    // }

    //Updating dusk portal with latest customer data
    var updatecustomer = await getCustomerDataById(params,params.data.value.futuraId);
    // var duskpayload = await duskportalCustomerPayload(params, updatecustomer,customerID)
    // var duskcustomercreate = await SendCustomerData(params, duskpayload);

    const Newresponse1 = {
      statusCode: 200,
      body: {"Futura_Id":futuraId, "updatecustomer":updatecustomer}
      // "duskpayload":duskpayload, "duskcustomercreate":duskcustomercreate
    }
    return Newresponse1

    

    if(timeouterror == true){
        responseData['futura'] = {
            "action": "Timeout error",
            "request": params.data.value,
            "status": false,
            "response": "Timeout error",
        }
    }
    
    var published = await sendcloudevent(params,params.DUSK_MAGENTO_PROVIDER_ID, params.DUSK_LOGGING_EVENT_CODE, responseData)    
    

    // const response = {
    //   statusCode: 200,
    //   body: customerPayloadOfGivex
    // }
    // return response

}catch (error) {
    // log any server errors
    console.error(error); // Log the detailed error object
    // return with 500
    return errorResponse(500, 'server error'+error, logger)
  }
}

exports.main = main


