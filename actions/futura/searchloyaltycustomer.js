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
const { SearchInFutura, getCommonById } = require('../futura')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // check for missing request input parameters and headers
    const requiredParams = []
    const requiredHeaders = ['Authorization']
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      // return and log client errors
      return errorResponse(400, errorMessage, logger)
    }

    if(!params.email && !params.futura_id){
        // don't have require param
        return errorResponse(400, "email or futura_id is required parameter", logger) 
    }

    var futuraId = "", futuracustomer={}
    var lolaltyCardNo = "";
    var loyaltyExpiryDetails= "";

    try{
        // check load customer based on email or futura id
        if(params.email){
          var futuracustomer = await SearchInFutura(params,params.email);  
        }else{
            futuracustomer = [params.futura_id] 
        }
        if(futuracustomer.length > 0){
          futuraId = futuracustomer[0]
          // get common detail of customer
          var getWebCommonResult = await getCommonById(params, futuraId);
          var lolaltyCardNo = getWebCommonResult.web_add_kreditkarte;
          var loyaltyExpiryDetails = getWebCommonResult.web_add_sperrdatum;
          let newdate = new Date(loyaltyExpiryDetails)
          let exp = String(newdate.getFullYear());
          if(exp == "1899"){
             loyaltyExpiryDetails = "";
          }   
        }
        
    }catch(error){
        throw new Error(error.message)
    }
    
    
    var content = {
          "futura_id": futuraId,
          "Loyalty_card_no": lolaltyCardNo,
          "exp_date": loyaltyExpiryDetails
        }

    const response = {
      statusCode: 200,
      body: content

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
