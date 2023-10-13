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
const {sendcloudevent} = require('../token')
const {getProduct,converImageintoBase64,getProductOptions} = require('../magento')
const {getViareAuthcode, sendProductDetail, updateProductImage} = require('../viare')
const {CloudEvent} = require("cloudevents");



// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  let responseData = {};

  responseData["event_code"] = params.type;
  responseData["provider_id"] = params.source;
  responseData["event_id"] = params.event_id;
  responseData["entity"] = "Update Viare Product";

  try {

    // header info for all the  SOAP request
    const header = {
      'trace':1,
      'exceptions': true,
      'connection_timeout': 15
    }
    const apiEndpoint = params.VIARE_PRODUCT_API
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


    // send authentication request
    var getauthentication = await getViareAuthcode(params)
	   var authtoken = getauthentication.AuthenticateResult.Message;

     // Magento product data
    var productdata = await getProduct(params)

    for (var i = 0; i < productdata.custom_attributes.length; i++) {
        if(productdata.custom_attributes[i].attribute_code == "erp_barcode" ||
            productdata.custom_attributes[i].attribute_code == "erp_value_added_services" ||
            productdata.custom_attributes[i].attribute_code == "erp_product_group" ||
            productdata.custom_attributes[i].attribute_code == "image")
        {
              var attr_code = productdata.custom_attributes[i].attribute_code;
              productdata[attr_code] = productdata.custom_attributes[i].value;
        }


        if(productdata.custom_attributes[i].attribute_code == "color"){

              var attr_code = productdata.custom_attributes[i].attribute_code;

              // get Magento product attribute option Label from option Id
              productdata[attr_code] = await getProductOptions(params,attr_code,productdata.custom_attributes[i].value);
        }
    }

    if(productdata.type_id == "simple"){

      // Update Viare product
    	responseData['viare'] = await SendProductRequest(authtoken, params, productdata, apiEndpoint, header);

      // Update Viare Media
    	responseData['viare_media'] = await SendMediaImage(authtoken, params, productdata, apiEndpoint, header);

      // Logging request
    	var published = await sendcloudevent(params,params.DUSK_MAGENTO_PROVIDER_ID, params.DUSK_LOGGING_EVENT_CODE, responseData)
    

    	const response = {
      		statusCode: 200,
      		body: published
    	}

	   return response
    }else{
    	const newresponse = {
      		statusCode: 200,
      		body: productdata.type_id
    	}
    	
    	return newresponse
    }			
    
  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    //return errorResponse(500, 'server error'+error, logger)
    const response = {
      statusCode: 200,
      body: error
    }
  }
}




async function SendProductRequest(authtoken, params, productparam, apiEndpoint, header, count=0){
  var productArg = {
    "authenticationToken": authtoken,
    "product": {
      "ForeignIdentity": productparam.id,
      "Style": productparam.sku,
      "Title": productparam.name,
      "Manufacturer": productparam.erp_product_group? productparam.erp_product_group : "",
      "ProductInformation": [
        {
          "NameValuePair": {
            "Name": "PackingInstructions",
            "Value": productparam.erp_value_added_services ? productparam.erp_value_added_services : ""
          }
        }
      ],
      "Items": [
        {
          "ProductItem": {
            "ForeignIdentity": productparam.sku,
            "Barcode": productparam.erp_barcode? productparam.erp_barcode : productparam.sku ,
            "Colour": productparam.color? productparam.color : "",
            "Weight": productparam.weight
          }
        },
      ]
    },
  }

  var productdata= "";
  var returnData= {};

  try{
    productdata = await sendProductDetail(apiEndpoint, header, productArg, params.SOAP_TIMEOUT);
    if(productdata.UpdateProductResult.Code == 1001 && count < 2){
        var viareauthresponse = await getViareAuthcode(params, true);
        var authtoken = viareauthresponse.AuthenticateResult.Message
        var productdata = await SendProductRequest(authtoken, params, productparam, apiEndpoint, header,count+1)
    }

    if (productdata.UpdateProductResult.Code != 0){
      returnData['status'] = false;
    }else{
      returnData['status'] = true;
    }
    returnData['request'] = productArg;
    returnData['response'] = productdata;
    returnData['action'] = "Create/Update Product";
  }catch (error){
    productdata = "";
    returnData['status'] = false;
    returnData['request'] = productArg;
    returnData['response'] = error;
    returnData['action'] = "Create/Update Product";
  }

  

  return returnData;
}

// send Product image Update request
async function SendMediaImage(authtoken, params, productparam, apiEndpoint, header, count=0) {

    var imagedata, imageurl;

    if(productparam.hasOwnProperty("image")){
      imageurl = params.MAGENTO_MEDIA_URL+"catalog/product"+productparam.image;
      imagedata = await converImageintoBase64(imageurl);
    }else{
      return false;
    }

    var label;
    for (var i = 0; i < productparam.media_gallery_entries.length; i++) {
        var mediatypes = productparam.media_gallery_entries[i].types
        if(mediatypes.includes("image"))
        {
               label = productparam.media_gallery_entries[i].label
        }
    }

    var productArg = {
      "authenticationToken": authtoken,
      "style": productparam.sku,
      "barcode": productparam.erp_barcode? productparam.erp_barcode : productparam.sku ,
      "isDefault": true,
      "caption": label ? label : productparam.name,
      "imageData": imagedata
  }

  var productdata= "";
  var returnData= {};

  try{
    productdata = await updateProductImage(apiEndpoint, header, productArg, params.SOAP_TIMEOUT);
    if(productdata.SetMainImageResult.Code == 1001 && count < 2){
        var viareauthresponse = await getViareAuthcode(params, true);
        var authtoken = viareauthresponse.AuthenticateResult.Message
        var productdata = await SendMediaImage(authtoken, params, productparam, apiEndpoint, header,count+1)
    }

    if (productdata.SetMainImageResult.Code != 0){
      returnData['status'] = false;
    }else{
      returnData['status'] = true;
    }
    productArg.imageData = imageurl;
    returnData['request'] = productArg;
    returnData['response'] = productdata;
    returnData['action'] = "Create/Update Product Image";
  }catch (error){
    productdata = "";
    productArg.imageData = imageurl;
    returnData['status'] = false;
    returnData['request'] = productArg;
    returnData['response'] = error;
    returnData['action'] = "Create/Update Product Image";
  }

  return returnData;
}

exports.main = main
