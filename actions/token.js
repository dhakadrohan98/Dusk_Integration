const NodeCache = require( "node-cache" );
const myCache = new NodeCache();
const { Events } = require('@adobe/aio-sdk')
const {CloudEvent} = require("cloudevents");

/**
 *
 * get the Authorization token for send another event
 *
 * @param {object} params action input parameters.
 * @parma {bolean} if we passed this true then it will force fully get the new token
 * @returns {object} the token string
 *
 */
async function generateToken(params, forced=false){
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    var urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");
    urlencoded.append("client_id", params.SERVICE_API_KEY);
    urlencoded.append("client_secret", params.SERVICE_SECRET);
    urlencoded.append("scope", "AdobeID,openid,read_organizations,additional_info.projectedProductContext,additional_info.roles,adobeio_api,read_client_secret,manage_client_secrets,event_receiver_api");

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
        redirect: 'follow'
    };

    var token = myCache.get("access_token");
    if(token == undefined || forced == true){
        var response = await fetch("https://ims-na1.adobelogin.com/ims/token/v3", requestOptions)
        var res = await response.json()
        await myCache.set("access_token", res, 80000)
        return res;
    }else{
        return token
    }
}

/**
 * 
 * @param {object} params action input parameters.
 * @param {string} Provider Id of Event
 * @param {string} event code where we send event
 * @param {object} data that we want to send in event
 * @param {int} count the retry wiith token
 * @param {bolean} forcedparam is true then we will forcefully send token request
 * 
 * @return {string} response of publish event or error
 * 
 */
async function sendcloudevent(params, providerId, eventcode, responseData, count=0,forcedparam=false){

    var token = await generateToken(params,forcedparam);
    var eventsClient = await Events.init(params.ORG_ID, params.SERVICE_API_KEY, token.access_token)
    const cloudEvent = await createCloudEvent(providerId, eventcode, responseData);
    try{
        const published = await eventsClient.publishEvent(cloudEvent)
        return published;
    }catch (error){
        if(count < 2){
            var published = await sendcloudevent(params, providerId, eventcode, responseData, count+1,true)
            return published;
        }
        return error;
    }
}

async function createCloudEvent(providerId, eventCode, payload) {

    let cloudevent = new CloudEvent({
        source: 'urn:uuid:' + providerId,
        type: eventCode,
        datacontenttype: "application/json",
        data: payload,
        id: providerId
    });
    return cloudevent
}

module.exports = {
    generateToken,
    sendcloudevent
}
