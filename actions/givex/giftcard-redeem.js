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
// main function that will be executed by Adobe I/O Runtime
async function main(params) {
    // create a Logger
    const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

    try {

        let responseData = {};
        var main_result = [];

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
        const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
        if (errorMessage) {
            // return and log client errors
            return errorResponse(400, errorMessage, logger)
        }

        // extract the user Bearer token from the Authorization header
        const token = getBearerToken(params)

        if ((params.data) && (params.data.value) && (params.data.value.referencedata)) {
            var payloadtest = validatePayload(params.data.value)
            if (payloadtest.status == false) {
                main_result = payloadtest
            } else {
                var referencedata = params.data.value.referencedata;
                for (let index = 0; index < referencedata.length; index++) {
                    var referenceData = referencedata[index];
                    var cardno = referenceData.cardno;
                    var preauthcode = referenceData.referenceno;
                    var amount = (referenceData.authorise_amount) ? referenceData.authorise_amount : 0;
                    var postAuthResultResponse = {}

                    var payload = payloadForPostAuthAmount(params, cardno, amount, preauthcode)
                    var releaseResponse = await call(params, 'dc_921', payload)

                    postAuthResultResponse['request'] = payload
                    postAuthResultResponse['action'] = 'PostAuthorizing the Pre-Authorised Amount'

                    if ((releaseResponse) && (releaseResponse[1] == 0)) {
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
                        postAuthResultResponse['status'] = false
                        postAuthResultResponse['response'] = {
                            'responseCode': releaseResponse[1],
                            'transactionCode': releaseResponse[0],
                            'errorMessage': releaseResponse[2]
                        }

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

                    responseData['givex_postauth_' + preauthcode] = postAuthResultResponse
                }

            }

        }

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
    var with_no_error = true
    var result = [];
    var error_data = []
    if (payload.referencedata) {
        var referencedata = payload.referencedata;
        if (referencedata.length > 0) {
            for (let index = 0; index < referencedata.length; index++) {
                var referenceData = referencedata[index];
                if (((typeof referenceData.cardno == 'undefined') || (referenceData.cardno.length < 18)) == true) {
                    error_data.push({
                        "type": "card-error",
                        "message": "Invalid cardno provided. (card: "+referenceData.cardno+")"
                    });
                    with_no_error = false
                }

                if (((typeof referenceData.authorise_amount == 'undefined' ) || (parseFloat(referenceData.authorise_amount) <= 0)) == true) {
                    error_data.push({
                        "type": "amount-error",
                        "message": "Invalid amount provided. (Amount: "+referenceData.authorise_amount+")"
                    });
                    with_no_error = false
                }
            }

            if (with_no_error == false) {
                result.push(error_data);
            }
        } else {
            with_no_error = false
            let error = {
                "type": "payload-error",
                "message": "Invalid data provided with 'referencedata' key."
            }
            result.push(error);
        }
    } else {
        with_no_error = false
        let error = {
            "type": "payload-error",
            "message": "Payload requires 'referencedata' key. It is not exist with payload."
        }
        result.push(error);
    }

    return { 'status': with_no_error, 'details': result }

}

exports.main = main
