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
const { payloadForPostAuthAmount, call } = require('../givex')
const xmlrpc = require("davexmlrpc");

// Main function that will be executed by Adobe I/O Runtime
async function main(params) {

    // Create a Logger
    const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

    //Performing redeem action of giftcard
    try {

        let responseData = {};  // To store response for Logging module
        var main_result = [];  // To store response for Givex redeem API

        // setting data in responseData from payload to this action
        responseData["event_code"] = params.type;
        responseData["provider_id"] = params.source;
        responseData["event_id"] = 'com.givex.redeemamount';
        responseData["entity"] = "Redeem the authorization Amount";

        // 'info' is the default level if not set
        logger.info('Calling the main action')

        // log parameters, only if params.LOG_LEVEL === 'debug'
        logger.debug(stringParameters(params))

        // check for missing request input parameters and headers
        const requiredParams = [/* add required params */]
        const requiredHeaders = []

        // default function of appbuilder to check if the required params exists or not
        const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
        if (errorMessage) {
            // return and log client errors
            return errorResponse(400, errorMessage, logger)
        }

        // extract the user Bearer token from the Authorization header
        const token = getBearerToken(params)

        //Check if data, value and referenceData exists in payload
        if ((params.data) && (params.data.value) && (params.data.value.referencedata)) {

            // Validating that all parameters in referenceData are valid or not
            var payloadtest = validatePayload(params.data.value)

            //Check for the status if the payload is valid or not
            if (payloadtest.status == false) {

                // Assign the result of validatePayload to main_result if the payload is not valid
                main_result = payloadtest
            } else {
                // Perform GiftCard redeem action if payload is valid

                var referencedata = params.data.value.referencedata;

                // Loop to iterate through the GiftCard Details
                for (let index = 0; index < referencedata.length; index++) {
                    var referenceData = referencedata[index];

                    // Setting GiftCard Cardnumber
                    var cardno = referenceData.cardno;
                    var preauthcode = referenceData.referenceno;

                    // Setting GiftCard amount to amount
                    var amount = (referenceData.authorise_amount) ? referenceData.authorise_amount : 0;
                    var postAuthResultResponse = {}
                    
                    // Generating Payload for Post Auth Action of Givex (dc_921)
                    var payload = payloadForPostAuthAmount(params, cardno, amount, preauthcode)

                    // Execute the givex API with generated payload for Post Auth action.
                    var releaseResponse = await call(params, 'dc_921', payload)

                    postAuthResultResponse['request'] = payload
                    postAuthResultResponse['action'] = 'PostAuthorizing the Pre-Authorised Amount'
                    
                    // API response if executed successfully with status 0 (true)
                    if ((releaseResponse) && (releaseResponse[1] == 0)) {
                        // After success call of redeem API, setting post auth result response
                        postAuthResultResponse['status'] = true
                        postAuthResultResponse['response'] = {
                            'responseCode': releaseResponse[1],
                            'transactionCode': releaseResponse[0],
                            'transactionReference': releaseResponse[2],
                            'redeemedAmount': releaseResponse[3],
                            'balance': releaseResponse[4],
                            'expiration_date': releaseResponse[5],
                            'receiptMessage': releaseResponse[6],
                            'isoSerial': releaseResponse[7],
                            'comments': releaseResponse[8]
                        }
                        // Setting main_result with current balance with other details
                        main_result.push(
                            {
                                "cardno": "" + cardno,
                                "preauthcode": preauthcode,
                                "amount": amount,
                                "status": true,
                                "current_balance": releaseResponse[4]
                            }
                        )
                    } else {

                        // Setting post auth result response with the error message as API returned status false
                        postAuthResultResponse['status'] = false
                        postAuthResultResponse['response'] = {
                            'responseCode': releaseResponse[1],
                            'transactionCode': releaseResponse[0],
                            'errorMessage': releaseResponse[2]
                        }
                        // Setting main_result with error message with other details
                        main_result.push(
                            {
                                "cardno": "" + cardno,
                                "preauthcode": preauthcode,
                                "status": (releaseResponse[1] == 247) ? true : false,
                                "response_code": releaseResponse[1],
                                "amount": amount,
                                "message": releaseResponse[2]
                            
                            }
                        )
                    }
                    // Setting response data for logging module
                    responseData['givex_postauth_' + preauthcode] = postAuthResultResponse
                }

            }

        }
        // Creating response for the API with the status code
        const response = {
            statusCode: 200,
            body: main_result
        }

        // log the response status code
        logger.info(`${response.statusCode}: successful request`)
        return response
    } catch (error) {
        // log any server errors
        logger.error(error)
        // return with 500
        return errorResponse(500, 'server error ' + error, logger)
    }
}

function validatePayload(payload) {
    var with_no_error = true  // Setting with_no_error to true as flag assuming payload is valid
    var result = [];  // To store result of this function
    var error_data = []  // To store error data for the invalid entity

    // Checking if reference data exists
    if (payload.referencedata) {
        var referencedata = payload.referencedata;

        // Check if reference data contains data
        if (referencedata.length > 0) {
            // Check the card details and check for validations for cardnumber and card amount 

            for (let index = 0; index < referencedata.length; index++) {
                var referenceData = referencedata[index];

                // Check for the GiftCard number is undefined or it is shorter than 18 characters
                if (((typeof referenceData.cardno == 'undefined') || (referenceData.cardno.length < 18)) == true) {
                    
                    // If GiftCard number is invalid, adding error details to error_data
                    error_data.push({
                        "type": "card-error",
                        "message": "Invalid cardno provided. (card: "+referenceData.cardno+")"
                    });
                    with_no_error = false    // Setting flag to false to indicate that GiftCard number is invalid
                }
                // Check if GiftCard amount is undefined or has negative value
                if (((typeof referenceData.authorise_amount == 'undefined' ) || (parseFloat(referenceData.authorise_amount) <= 0)) == true) {
                    
                    // If GiftCard amount is invalid, adding error details to error_data
                    error_data.push({
                        "type": "amount-error",
                        "message": "Invalid amount provided. (Amount: "+referenceData.authorise_amount+")"
                    });
                    with_no_error = false    // Setting flag to false to indicate that GiftCard amount is invalid
                }
            }
            
            // Check if GiftCard is invalid
            if (with_no_error == false) {
                // Adding error details to result for invalid entities in payload
                result.push(error_data);
            }
        } else {
            // if referenceData does not contain data 
            with_no_error = false  // Setting flag to false to indicate that card is invalid
            let error = {
                "type": "payload-error",
                "message": "Invalid data provided with 'referencedata' key."
            }
            result.push(error);  // Adding error in result
        }
    } else {

        // If reference data does not exist
        with_no_error = false  // Setting flag to false to indicate that card is invalid
        let error = {
            "type": "payload-error",
            "message": "Payload requires 'referencedata' key. It is not exist with payload."
        }
        result.push(error);  // Adding error in result
    }

    // return status (valid or not) and details (error detail if invalid)
    return { 'status': with_no_error, 'details': result }

}

exports.main = main
