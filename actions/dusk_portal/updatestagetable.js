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
const {getCustomerByEmail, UpdateCustomerInMagento, getFuturaCustomer, SaveFuturaCustomer} = require('../magento')
const {getCustomerDataById} = require('../futura')
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
    responseData["entity"] = "Update Magento";

    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // check for missing request input parameters and headers
    const requiredParams = [/* add required params */]
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    // if (errorMessage) {
    //   // return and log client errors
    //   return errorResponse(400, errorMessage, logger)
    // }

    // extract the user Bearer token from the Authorization header
    const token = getBearerToken(params)

    //converting date(20050611) into date format(yyyy-mm-dd)
    // Given numeric date
    var num = params.data.Expiry_Date;
    // Convert it to a string
    var dateString = num.toString();
    // Extract year, month, and day parts
    var year = dateString.substring(0, 4);
    var month = dateString.substring(4, 6);
    var day = dateString.substring(6, 8);
    // Create the formatted date string
    var cardExpDate = day + '-' + month + '-' + year;

    if(params.data.Birthdate != undefined && params.data.Birthdate!= "") {
        //Formating DOB (yyyy-mm-dd)
        var dob = params.data.Birthdate;
        // Convert it to a string
        dateString = dob.toString();
        // Extract year, month, and day parts
        year = dateString.substring(0, 4);
        month = dateString.substring(4, 6);
        day = dateString.substring(6, 8);
        // Create the formatted date string
        var date_of_birth = year + '-' + month + '-' + day; //1999-01-10
    }

    var email = params.data.email; //rohan.dhakad@sigmainfo.net
    var futuraId = params.data.Futura_Number; //704856432
    var membershipCardNo = params.data.Card_No; // 60586307761100032569
    var firstName = params.data.First_name;
    var lastName= params.data.Last_name;

    var updatecustomerdata={}, getcustomerdata={}, timeouterror = false;
    var customerduskpayload={}, futuracustomerinfo={}, savefuturadata={};
    var updateCustomerDataResult; //global scope
    var customerDuskPayload;

    getcustomerdata['action'] = "Get Customer Detail";
    getcustomerdata['request'] = email;
    //searching in magento whether customer exists or not. 
    try { 
        var customerData = await getCustomerByEmail(params, email);
        getcustomerdata['status'] = true;
        getcustomerdata['response'] = customerData;
    } catch(error) {
        if(error.code == "ECONNABORTED"){
            timeouterror = true
          }
          getcustomerdata['status'] = false
          getcustomerdata['response'] = error
    }
    responseData['customer_data'] = getcustomerdata;

    var givexBoolean=false, expDateBoolean=false; //flag
    var givex_id; //store givex_id from futura
    var magentostagetable;

    if(getcustomerdata.status == true && timeouterror == false){
        // Updating/Adding custom attributes(if not present)

        if(customerData.total_count == 1){ //customer found in magento

            //updating firstname, lastname and DOB
            customerData.items[0].firstname = firstName;
            customerData.items[0].lastname = lastName;
            customerData.items[0].dob = date_of_birth;

            var magecustomer = customerData.items[0];  //storing magento details to a variable
            var magentoId = customerData.items[0].id; //taking magento id
            var customAttrlen =  magecustomer.custom_attributes.length; //length of custom Attributes of customer(magento)
            let i=0;
            
            while(i<customAttrlen) {

                if(magecustomer.custom_attributes[i].attribute_code == 'erp_customer_id') { //updating Futura Id
                    magecustomer.custom_attributes[i].value = futuraId;
                }
                else if(magecustomer.custom_attributes[i].attribute_code == 'givex_number') { //updating Givex Card Number if givex_number attrubute exists already, Otherwise add givex_number as new custom attributes
                    magecustomer.custom_attributes[i].value = membershipCardNo;
                    givexBoolean = true;
                }
                else if(magecustomer.custom_attributes[i].attribute_code == 'rewards_expiry_date') { //updating Rewards Expiry Date
                    magecustomer.custom_attributes[i].value = cardExpDate;
                    expDateBoolean = true;
                }
                i++;
            }
            //adding new custom attributes as givex_number into magento's customer attributes. If it is not present already
            if(membershipCardNo != undefined && i == customAttrlen && givexBoolean==false){
                magecustomer.custom_attributes.push({"attribute_code": "givex_number", "value": membershipCardNo});
            }
            //adding new custom attributes as rewards_expiry_date into magento's customer attributes. If it is not present already
            if(cardExpDate != undefined && i == customAttrlen && expDateBoolean==false){
                magecustomer.custom_attributes.push({"attribute_code": "rewards_expiry_date", "value": cardExpDate});
            }

            var customAttributesnewLength =  magecustomer.custom_attributes.length;

            updatecustomerdata['action'] = "Update customer Data Response"
            updatecustomerdata['request'] = magentoId;
            var flag=false;
            try{
                //updating customer data in magento (erp_customer_id, givex_number & rewards_expiry_date)
                updateCustomerDataResult = await UpdateCustomerInMagento(params,{"customer":magecustomer},magentoId);
                flag = true;
                updatecustomerdata['status'] = true
                updatecustomerdata['response'] = updateCustomerDataResult;
                
            } catch(error) {
                flag=false;
                if(error.code == "ECONNABORTED"){
                    timeouterror = true
                  }
                  updatecustomerdata['status'] = false
                  updatecustomerdata['response'] = error
            }
            responseData['updated_customer_info'] = updatecustomerdata;
        }
    }
        //Updating Adobe Commerce Dusk staging table.
        //get givex_id from futura
        customerduskpayload['action'] = "customer info(givex_id) from Futura"
        customerduskpayload['request'] = futuraId;
        try{
            //calling getCustomerDataById function of Futura (futuraId to fetch givex_id)
            customerDuskPayload = await getCustomerDataById(params,futuraId);
            customerduskpayload['status'] = true;
            customerduskpayload['response'] = customerDuskPayload;
            givex_id = customerDuskPayload.comon.web_add_kundennummer;
        }
        catch(error) {
            if(error.code == "ECONNABORTED"){
                timeouterror = true
            }
            customerduskpayload['status'] = false
            customerduskpayload['response'] = error
        }
        responseData['customer_payload_for_dusk_api'] = customerduskpayload;

        //Getting customer info from adobe commerce stage table .
        futuracustomerinfo['action'] ="]"; 
        futuracustomerinfo['request'] = futuraId;
        try {
            magentostagetable = await getFuturaCustomer(params,futuraId);
            futuracustomerinfo['status'] = true
            futuracustomerinfo['response'] = magentostagetable
        }
        catch(error) {
            futuracustomerinfo['status'] = false
            futuracustomerinfo['response'] = error
        }
        responseData['futura_customer_info'] = futuracustomerinfo;
        
        if(magentostagetable != undefined){ 
            // magentostagetable.id = magentoId;
            magentostagetable.futura_id = futuraId;
            magentostagetable.email = email;
            magentostagetable.givex_id = givex_id; //data.givex[2]
            magentostagetable.memership_card_no =membershipCardNo;
        }
        magentostagetable.card_exp_date = cardExpDate;

        savefuturadata['action'] = "Save Futura Customer ";
        savefuturadata['request'] = {"futurastageDataObject": magentostagetable};
        try{
            var futurastagecreate = await SaveFuturaCustomer(params, {"futurastageDataObject": magentostagetable});
            savefuturadata['status'] = true;
            savefuturadata['response'] = futurastagecreate;
        }
        catch(error) {
            if(error.code == "ECONNABORTED"){
                timeouterror = true
            }
            savefuturadata['status'] = false
            savefuturadata['response'] = error
        }
        responseData['save_futura_stage_table'] = savefuturadata;

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
    return errorResponse(500, 'server error '+error, logger)
  }
}

exports.main = main
