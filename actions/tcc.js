const axios = require('axios')

async function authenticate(params){
    var payload = {
        "Username":params.TCC_USERNAME,
        "Password":params.TCC_PASSWORD,
        "AccountID":params.TCC_ACCOUNT_ID
    }
    // params.TCC_API_URL+params.TCC_AUTHENTICATION
    var config = {
        method: 'POST',
        url: params.TCC_API_URL+params.TCC_AUTHENTICATION,
        headers: {
            'Content-Type': 'application/json'
        },
        data : payload
      };

      try {
        var response = await axios(config);
  
        if (response.status == 200) {
            return response.data;
        }
      } catch (error) {
        console.error(error.message);
        }
}

//Prepare array of objects of items(from rmaDetails object) which need to be passed as payload in a RMA API of TCC. 
async function prepareItems(rmaDetails, nextDate, sku){

    if(rmaDetails.items.length != undefined) {
        
        var rmaItemsLength = rmaDetails.items.length;
        var result = [];
        for(i=0; i<rmaItemsLength; i++) {
            result.push({
                "BatchNo": "",
                "BoxPackCountOnly": null,
                "CheckQuality": "Yes",
                "CollectionDate": null,
                "Confidential": null,
                "CountIndividualItems": null,
                "DeliveryDueDate": nextDate,
                "Description": rmaDetails.order_id,
                "ForeignFulfilmentID": rmaDetails.items[i].rma_entity_id,
                "ForeignReference": null,
                "ID": null,
                "IsBulkyItem": null,
                "JobManagerEmail": "",
                "JobManagerName": "",
                "MinReOrderLevel": null,
                "Notes": null,
                "PackageQuantity": null,
                "PackageType": null,
                "PhotoRequired": null,
                "ProductGroup": null,
                "ProductPartNumber": null,
                "Quantity": rmaDetails.items[i].qty_requested,
                "Quarantined": null,
                "SampleRequired": null,
                "Source": "",
                "StockCode": sku,
                "StockLocationID": 1,
                "SubCategory": null,
                "SupplierLocation": null,
                "UnitOfMeasure": "",
                "WarehouseLocationID": null
                });
        }
    }
    else {
        result['error'] ="please check rma item's length.";
    } 
    return result;
}


async function createRMA(params, authenticationToken, rmaDetails, customerDetails, sku){

    const currentDate = new Date();
    // Increment the date by 1 day (in milliseconds)
    const nextDayDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    const nextDate = nextDayDate.getTime() / 1000;

    var dateString = rmaDetails.date_requested;
    const epochTimestamp = new Date(dateString).getTime() / 1000;
    
    var state = customerDetails.addresses[0].region.region_code;
    //storing all items of RMA which need to be passed in {payload.Items}.
    var items = await prepareItems(rmaDetails, nextDate, sku);

    //prepairing payload
    var payload = {
            "AuthenticationToken": authenticationToken,
            "Payload": {
            "ContainerNumber": null,
            "DateCreated": epochTimestamp,
            "DateModified": epochTimestamp,
            
            "Description": rmaDetails.order_id,
            "ForeignJobID": 123,
            "ForeignReference": null,
            "ScheduledReceivingDate": nextDate,
            "ID": null,
            "Items": items,
            "JobReferenceID": "",
            "RequestorEmail": customerDetails.email,
            "RequestorName": customerDetails.firstname,
            "SenderAddress": customerDetails.addresses[0].street[0],
            "SenderName": customerDetails.firstname,
            "SenderPostcode": customerDetails.addresses[0].postcode,
            "SenderState": state,
            "SenderSuburb": customerDetails.addresses[0].city,
            "Status": 10,
            "StockLocationID": null,
            "WarehouseLocationID": 1
            }
    }
    var config = {
        method: 'POST',
        url: params.TCC_API_URL+params.TCC_ISN,
        headers: {
            'Content-Type': 'application/json'
        },
        data : payload
    };

      try {
        var response = await axios(config);
  
        if (response.status == 200) {
            return response.data;
        }
      } catch (error) {
        console.error(error.message);
        }
}

module.exports = {
    authenticate,
    createRMA,
    prepareItems
}
