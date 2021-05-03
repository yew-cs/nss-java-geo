sap.ui.define([
    'sap/ui/core/message/ControlMessageProcessor',
    'sap/ui/core/message/Message',
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/library',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessagePopover',
    'sap/m/MessagePopoverItem',
    'sap/m/MessageToast',
    'sap/ui/core/Fragment'
], function(ControlMessageProcessor, Message, Controller, coreLibrary, JSONModel, MessagePopover, MessagePopoverItem, MessageToast,
    Fragment) {
    "use strict";

    var MessageType = coreLibrary.MessageType;

    var PageController = Controller.extend("com.sap.nss.nsaa.businessobject.BusinessObjects", {

        onInit: function() {

            var oMessageProcessor = new ControlMessageProcessor();
            var oMessageManager = sap.ui.getCore().getMessageManager();

            oMessageManager.registerMessageProcessor(oMessageProcessor);

            oMessageManager.addMessages(
                new Message({
                    message: "Something wrong happened",
                    type: MessageType.Error,
                    processor: oMessageProcessor
                })
            );

            this._formFragments = {};

            // Set the initial form to be the display one
            this._showFormFragment("Display");
        },

        _showFormFragment: function(sFragmentName) {
            var oPage = this.byId("page");

            oPage.removeAllContent();
            this._getFormFragment(sFragmentName).then(function(oVBox) {
                oPage.insertContent(oVBox);
            });
        },

        _getFormFragment: function(sFragmentName) {
            var pFormFragment = this._formFragments[sFragmentName],
                oView = this.getView();

            if (!pFormFragment) {
                pFormFragment = Fragment.load({
                    id: oView.getId(),
                    name: "com.sap.nss.nsaa.businessobject." + sFragmentName
                });
                this._formFragments[sFragmentName] = pFormFragment;
            }

            return pFormFragment;
        },

        handleEditPress: function() {
            //Clone the data
            //this._oSupplier = Object.assign({}, this.getView().getModel().getData().SupplierCollection[0]);
            this._toggleButtonsAndView(true);
        },

        handleCancelPress: function() {

            //Restore the data
            //var oModel = this.getView().getModel();
            //var oData = oModel.getData();

            //oData.SupplierCollection[0] = this._oSupplier;

            //oModel.setData(oData);
            this._toggleButtonsAndView(false);

        },

        _toggleButtonsAndView: function(bEdit) {
            var oView = this.getView();

            // Show the appropriate action buttons
            oView.byId("edit").setVisible(!bEdit);
            oView.byId("save").setVisible(bEdit);
            oView.byId("cancel").setVisible(bEdit);

            // Set the right form type
            this._showFormFragment(bEdit ? "Change" : "Display");
        },
        handleSavePress: function() {

            this._toggleButtonsAndView(false);

        },
        onPress: function(oEvent) {
            MessageToast.show("Pressed custom button " + oEvent.getSource().getId());
        },
        onSemanticButtonPress: function(oEvent) {

            var sAction = oEvent.getSource().getMetadata().getName();
            sAction = sAction.replace(oEvent.getSource().getMetadata().getLibraryName() + ".", "");

            MessageToast.show("Pressed: " + sAction);
        },
        onSemanticSelectChange: function(oEvent, oData) {
            var sAction = oEvent.getSource().getMetadata().getName();
            sAction = sAction.replace(oEvent.getSource().getMetadata().getLibraryName() + ".", "");

            var sStatusText = sAction + " by " + oEvent.getSource().getSelectedItem().getText();
            MessageToast.show("Selected: " + sStatusText);
        },
        onPositionChange: function(oEvent) {
            MessageToast.show("Positioned changed to " + oEvent.getParameter("newPosition"));
        },
        onMessagesButtonPress: function(oEvent) {

            var oMessagesButton = oEvent.getSource();
            if (!this._messagePopover) {
                this._messagePopover = new MessagePopover({
                    items: {
                        path: "message>/",
                        template: new MessagePopoverItem({
                            description: "{message>description}",
                            type: "{message>type}",
                            title: "{message>message}"
                        })
                    }
                });
                oMessagesButton.addDependent(this._messagePopover);
            }
            this._messagePopover.toggle(oMessagesButton);
        },
        onMultiSelectPress: function(oEvent) {
            if (oEvent.getSource().getPressed()) {
                MessageToast.show("MultiSelect Pressed");
            } else {
                MessageToast.show("MultiSelect Unpressed");
            }
        }
    });

    return PageController;

});