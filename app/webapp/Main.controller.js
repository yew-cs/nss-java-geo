sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function(Controller, JSONModel) {
    "use strict";

    return Controller.extend("com.sap.nss.nsaa.Main", {

        onInit: function() {
            //var oModel = new JSONModel(sap.ui.require.toUrl("com/sap/nss/nsaa/app/mockdata/products.json"));
            //this.getView().setModel(oModel);
        }
    });
});