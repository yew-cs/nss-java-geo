sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "com/sap/nss/nsaa/mapconfiguration/model/models",
    "com/sap/nss/nsaa/mapconfiguration/ListSelector"
], function (UIComponent, Device, models, ListSelector) {
    "use strict";

    return UIComponent.extend("com.sap.nss.nsaa.mapconfiguration.Component", {

        metadata: {
            manifest: "json",
            config: {
                fullWidth: true
            }
        },

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
        init: function () {
            this.oScenarioListSelector = new ListSelector();

            // set the device model
			this.setModel(models.createDeviceModel(), "device");

            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // enable routing
            this.getRouter().initialize();

            // set the device model
            this.setModel(models.createDeviceModel(), "device");
        }
    });
});
