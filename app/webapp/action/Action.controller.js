sap.ui.define([
	"com/sap/nss/nsaa/BaseController",
	'sap/ui/core/message/Message',
	'sap/ui/core/mvc/Controller',
	'sap/ui/core/library',
	'sap/ui/model/json/JSONModel',
	'sap/m/MessagePopover',
	'sap/m/MessagePopoverItem',
	'sap/m/MessageToast',
	'sap/ui/core/Fragment',
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/m/SearchField',
	'sap/m/Token'
], function (BaseController, Message, Controller, coreLibrary, JSONModel, MessagePopover, MessagePopoverItem, MessageToast,
	Fragment, MessageBox, Filter, FilterOperator, SearchField, Token) {
	"use strict";

	var MessageType = coreLibrary.MessageType;
	return BaseController.extend("com.sap.nss.nsaa.action.Action", {
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function () {
			// Control state model
			var oList = this.byId("list"),
				oViewModel = this._createViewModel(),
				// Put down master list's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the master list is
				// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();

			this._oListSelector = this.getOwnerComponent().oScenarioListSelector;

			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};

			this.setModel(oViewModel, "masterView");
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for the list
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			this._oODataModel = this.getOwnerComponent().getModel();

			//this._oODataModel.read("/Scenarios", {
      		//	success: function(oCompleteEntry) { 
			//		  console.log(oCompleteEntry);
			//	},
      		//	error: function(oError) { 
			//		console.log(oError);
			//	}
    		//});

			var appView = new JSONModel({
				busy: true,
				delay: 0,
				addEnabled: false
			});
			this.setModel(appView, "appView");

			var detailView = new JSONModel({
				busy: false,
				delay: 0
			});
			this.setModel(detailView, "detailView");

			this._oViewModel = new JSONModel({
				enableCreate: false,
				delay: 0,
				busy: false,
				mode: "display",
				viewTitle: "Details",
				itemToSelect: null
			});
			this.setModel(this._oViewModel, "viewModel");

			this._oResourceBundle = this.getResourceBundle();

			// //Actions Value Help Dialog
			// this._oAction = this.getView().byId("idAction");
			// this._oAction.addValidator(this._onActionValidate);
			// this._oActionColModel = new JSONModel(sap.ui.require.toUrl("com/sap/nss/nsaa/jsonmodels/Actions.json"));

			// //Actions Value Help Dialog
			// this._oLayer = this.getView().byId("idLayer");
			// this._oLayer.addValidator(this._onLayerValidate);
			// this._oLayerColModel = new JSONModel(sap.ui.require.toUrl("com/sap/nss/nsaa/jsonmodels/Layers.json"));

			// //BusinessObjects Value Help Dialog
			// this._oBusinessObject = this.getView().byId("idBusinessObject");
			// this._oBusinessObject.addValidator(this._onBusinessObjectValidate);
			// this._oBusinessObjectColModel = new JSONModel(sap.ui.require.toUrl("com/sap/nss/nsaa/jsonmodels/BusinessObjects.json"));
		},


		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter and hides the pull to refresh control, if
		 * necessary.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		 onUpdateFinished: function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
			// hide pull to refresh if necessary
			this.byId("pullToRefresh").hide();
			this._findItem();
			this.getModel("appView").setProperty("/addEnabled", true);
		},
		
		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		 onSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				this._oListFilterState.aSearch = [new Filter("Name", FilterOperator.Contains, sQuery)];
			} else {
				this._oListFilterState.aSearch = [];
			}
			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			this._oList.getBinding("items").refresh();
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		 onSelectionChange: function(oEvent) {
			var that = this;
			var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var fnLeave = function () {
				that.getModel("viewModel").setProperty("/mode", "display");
				that._oODataModel.resetChanges();
				that._showDetail(oItem);
			};
			if (this._oODataModel.hasPendingChanges()) {
				this._leaveEditPage(fnLeave);
			} else {
				this._showDetail(oItem);
			}
			
			that.getModel("appView").setProperty("/addEnabled", true);
		},

		/**
		 * Event handler (attached declaratively) for the view delete button. Deletes the selected item. 
		 * @function
		 * @public
		 */
		 onDelete: function (oEvent) {
			var that = this;
			var oViewModel = this.getModel("detailView"),
				sPath = oViewModel.getProperty("/sObjectPath"),
				sObjectHeader = this._oODataModel.getProperty(sPath + "/tName"),
				sQuestion = this._oResourceBundle.getText("deleteText", sObjectHeader),
				sSuccessMessage = this._oResourceBundle.getText("deleteSuccess", sObjectHeader);

			var fnMyAfterDeleted = function () {
				MessageToast.show(sSuccessMessage);
				oViewModel.setProperty("/busy", false);
				var oNextItemToSelect = that._oListSelector.findNextItem(sPath, that._oList);

				if(oNextItemToSelect) {
					that.getModel("viewModel").setProperty("/itemToSelect", oNextItemToSelect.getBindingContext().getPath()); //save last deleted
				}	
			};
			this._confirmDeletionByUser({
				question: sQuestion
			}, [sPath], fnMyAfterDeleted);
		},

		/**
		 * Event handler (attached declaratively) for the view edit button. Open a view to enable the user update the selected item. 
		 * @function
		 * @public
		 */
		 onEdit: function (oEvent) {
			 //this.getModel("appView").setProperty("/addEnabled", false);
			var oViewModel = this.getModel("detailView"),
				sObjectPath = oViewModel.getProperty("/sObjectPath");

			//var oData = oEvent.getParameter("data");
			var oView = this.getView();
			this._oViewModel.setProperty("/mode", "edit");
			this._oViewModel.setProperty("/enableCreate", true);
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("editViewTitle"));

			this._oViewModel.refresh();
			oViewModel.refresh();

			oView.bindElement({
				path: sObjectPath
			});
		},

		/**
		 * Event handler  (attached declaratively) called when the add button in the master view is pressed. it opens the create view.
		 * @public
		 */
		 onAdd: function (oEvent) {
			//this.getModel("appView").setProperty("/addEnabled", false);

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			this.getModel("detailView").setProperty("/mode", "add");

			//if (oEvent.getParameter("name") && oEvent.getParameter("name") !== "create") {
			//	this._oViewModel.setProperty("/enableCreate", false);
			//	//this.getRouter().getTargets().detachDisplay(null, this._onDisplay, this);
			//	this.getView().unbindObject();
			//	return;
			//}
			
			this.getView().unbindObject();
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("createViewTitle"));
			this._oViewModel.setProperty("/mode", "create");
			var oContext = this._oODataModel.createEntry("/Actions", {
				success: this._fnEntityCreated.bind(this),
				error: this._fnEntityCreationFailed.bind(this)
			});
			this.getView().setBindingContext(oContext);
		},

		/**
		 * Event handler (attached declaratively) for the view cancel button. Asks the user confirmation to discard the changes. 
		 * @function
		 * @public
		 */
		onCancel: function (oEvent) {
			this.getModel("appView").setProperty("/addEnabled", false);

			// check if the model has been changed
			if (this.getModel().hasPendingChanges()) {
				// get user confirmation first
				this._showConfirmQuitChanges(); // some other thing here....
			} else {
				this.getModel("appView").setProperty("/addEnabled", true);
				// cancel without confirmation
				this.getModel("viewModel").setProperty("/mode", "display");
			}

			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("detailTitle"));
			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
		},

		onSave: function (oEvent) {
			this.getModel("appView").setProperty("/addEnabled", false);

			var that = this,
				oModel = this.getModel();

			// abort if the  model has not been changed
			if (!oModel.hasPendingChanges()) {
				MessageBox.information(
					this._oResourceBundle.getText("noChangesMessage"), {
						id: "noChangesInfoMessageBox",
						styleClass: that.getOwnerComponent().getContentDensityClass()
					}
				);
				return;
			}
			this.getModel("appView").setProperty("/busy", true);
			if (this._oViewModel.getProperty("/mode") === "edit") {
				// attach to the request completed event of the batch
				oModel.attachEventOnce("batchRequestCompleted", function (oEvent) {
					if (that._checkIfBatchRequestSucceeded(oEvent)) {
						that._fnUpdateSuccess();
					} else {
						that._fnEntityCreationFailed();
						MessageBox.error(that._oResourceBundle.getText("updateError"));
					}
				});
			}
			oModel.submitChanges();

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			this.getModel("viewModel").setProperty("/mode", "display");
		},

		

		

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Creates the model for the view
		 * @private
		 */
		 _createViewModel: function () {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Name",
				groupBy: "None"
			});
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		 _updateListItemCount: function (iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		/**
		 * It navigates to the saved itemToSelect item. After delete it navigate to the next item. 
		 * After add it navigates to the new added item if it is displayed in the tree. If not it navigates to the first item.
		 * @private
		 */
		 _findItem: function () {
			var itemToSelect = this.getModel("viewModel").getProperty("/itemToSelect");
			if (itemToSelect) {
				var sPath = this._fnGetPathWithSlash(itemToSelect);
				var oItem = this._oListSelector.findListItem(sPath, this._oList);
				if (!oItem) { //item is not viewable in the tree. not in the current tree page.
					oItem = this._oListSelector.findFirstItem(this._oList);
					if (oItem) {
						sPath = oItem.getBindingContext().getPath();
					} else {
						//this.getRouter().getTargets().display("detailNoObjectsAvailable");
						return;
					}
				}
				this._oListSelector.selectAListItem(sPath);
				this._showDetail(oItem);
			}
			 else {
				var oList = this.byId("list");
				var items = oList.getItems();

				if (items.length > 0) {
					var oItem = items[0];
					sPath = oItem.getBindingContext().getPath();
					this._oListSelector.selectAListItem(sPath);
					this._showDetail(oItem);
					this.getModel("viewModel").setProperty("/itemToSelect", sPath);
				}
			}
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		 _showDetail: function (oItem) {
			//var bReplace = !Device.system.phone;
			//this.getRouter().navTo("object", {
			//	RegionID: encodeURIComponent(oItem.getBindingContext().getProperty("RegionID"))
			//}, bReplace);

			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: oItem.getBindingContext().getPath(),
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},
		/**
		 * Event handler for binding change event
		 * @function
		 * @private
		 */

		 _onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding(),
				detailView = this.getModel("detailView"),
				oAppViewModel = this.getModel("appView"),
				oViewModel = this.getModel("viewModel");
				

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this._oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getBoundContext().getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.RegionID,
				sObjectName = oObject.RegionDescription;

			detailView.setProperty("/sObjectId", sObjectId);
			detailView.setProperty("/sObjectPath", sPath);
			oViewModel.setProperty("/itemToSelect", sPath);
			this._oListSelector.selectAListItem(sPath);
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		 _applyFilterSearch: function () {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		/**
		 * Internal helper method that adds "/" to the item's path 
		 * @private
		 */
		 _fnGetPathWithSlash: function (sPath) {
			return (sPath.indexOf("/") === 0 ? "" : "/") + sPath;
		},

		/**
		 * Opens a dialog letting the user either confirm or cancel the deletion of a list of entities
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * title (optional) may be a string defining the title of the popup.
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done. 
		 * @param {callback} fnDeleteCanceled (optional) - called when the user decides not to perform the deletion
		 * @param {callback} fnDeleteConfirmed (optional) - called when the user decides to perform the deletion. A Promise will be passed
		 * @function
		 * @private
		 */
		/* eslint-disable */ // using more then 4 parameters for a function is justified here
		_confirmDeletionByUser: function (oConfirmation, aPaths, fnAfterDeleted, fnDeleteCanceled, fnDeleteConfirmed) {
			/* eslint-enable */
			// Callback function for when the user decides to perform the deletion
			var fnDelete = function () {
				// Calls the oData Delete service
				this._callDelete(aPaths, fnAfterDeleted);
			}.bind(this);

			// Opens the confirmation dialog
			MessageBox.show(oConfirmation.question, {
				icon: oConfirmation.icon || MessageBox.Icon.WARNING,
				title: oConfirmation.title || this._oResourceBundle.getText("delete"),
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnDelete();
					} else if (fnDeleteCanceled) {
						fnDeleteCanceled();
					}
				}
			});
		},

		/**
		 * Performs the deletion of a list of entities.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done. 
		 * @return a Promise that will be resolved as soon as the deletion process ended successfully.
		 * @function
		 * @private
		 */
		 _callDelete: function (aPaths, fnAfterDeleted) {
			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);
			var fnFailed = function () {
				this._oODataModel.setUseBatch(true);
			}.bind(this);
			var fnSuccess = function () {
				if (fnAfterDeleted) {
					fnAfterDeleted();
					this._oODataModel.setUseBatch(true);
				}
				oViewModel.setProperty("/busy", false);
			}.bind(this);
			return this._deleteOneEntity(aPaths[0], fnSuccess, fnFailed);
		},

		/**
		 * Deletes the entity from the odata model
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnSuccess - Event handler for success operation.
		 * @param {callback} fnFailed - Event handler for failure operation.
		 * @function
		 * @private
		 */
		 _deleteOneEntity: function (sPath, fnSuccess, fnFailed) {
			var oPromise = new Promise(function (fnResolve, fnReject) {
				this._oODataModel.setUseBatch(false);
				this._oODataModel.remove(sPath, {
					success: fnResolve,
					error: fnReject,
					async: true
				});
			}.bind(this));
			oPromise.then(fnSuccess, fnFailed);
			return oPromise;
		},

		

		/**
		 * Ask for user confirmation to leave the edit page and discard all changes
		 * @param {object} fnLeave - handles discard changes
		 * @param {object} fnLeaveCancelled - handles cancel
		 * @private
		 */
		 _leaveEditPage: function (fnLeave, fnLeaveCancelled) {
			var sQuestion = this.getResourceBundle().getText("warningConfirm");
			var sTitle = this.getResourceBundle().getText("warning");

			MessageBox.show(sQuestion, {
				icon: MessageBox.Icon.WARNING,
				title: sTitle,
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnLeave();
					} else if (fnLeaveCancelled) {
						fnLeaveCancelled();
					}
				}
			});
		},

		/**
		 * Opens a dialog letting the user either confirm or cancel the quit and discard of changes.
		 * @private
		 */
		 _showConfirmQuitChanges: function () {
			var that = this;
		   var oComponent = this.getOwnerComponent(),
			   oModel = this.getModel();
		   var that = this;
		   MessageBox.confirm(
			   this._oResourceBundle.getText("confirmCancelMessage"), {
				   styleClass: oComponent.getContentDensityClass(),
				   onClose: function (oAction) {
					   if (oAction === sap.m.MessageBox.Action.OK) {
						   that.getModel("appView").setProperty("/addEnabled", true);
						   oModel.resetChanges();
						   //that._navBack();
						   that.getModel("viewModel").setProperty("/mode", "display");
					   }
				   }
			   }
		   );
	   },
		/**
		 * Handles the success of creating an object
		 *@param {object} oData the response of the save action
		 * @private
		 */
		 _fnEntityCreated: function (oData) {
			var sObjectPath = this.getModel().createKey("Actions", oData);
			this.getModel("viewModel").setProperty("/itemToSelect", "/" + sObjectPath); //save last created
			this.getModel("appView").setProperty("/busy", false);
			//this.getRouter().getTargets().display("object");
		},

		/**
		 * Handles the failure of creating/updating an object
		 * @private
		 */
			 _fnEntityCreationFailed: function () {
				this.getModel("appView").setProperty("/busy", false);
			},


		/* =========================================================== */
		/* begin: fragments    Actions                                		   */
		/* =========================================================== */
		_onActionValidate: function (oArgs) {
			if (oArgs.suggestionObject) {
				var oObject = oArgs.suggestionObject.getBindingContext().getObject(),
					oToken = new Token();

				oToken.setKey(oObject.ID);
				oToken.setText(oObject.Name);
				return oToken;
			}

			return null;
		},

		onActionValueHelpRequested: function() {
			var aCols = this._oActionColModel.getData().cols;
			this._oActionBasicSearchField = new SearchField({
				showSearchButton: false
			});

			this._oActionValueHelpDialog = sap.ui.xmlfragment("com.sap.nss.nsaa.fragments.Actions", this);
			this.getView().addDependent(this._oActionValueHelpDialog);

			var oFilterBar = this._oActionValueHelpDialog.getFilterBar();
			oFilterBar.setFilterBarExpanded(false);
			oFilterBar.setBasicSearch(this._oActionBasicSearchField);

			this._oActionValueHelpDialog.getTableAsync().then(function (oTable) {
				//oTable.setModel(this._oActionModel);
				oTable.setModel(this._oActionColModel, "columns");

				if (oTable.bindRows) {
					oTable.bindAggregation("rows", "/Actions");
				}

				if (oTable.bindItems) {
					oTable.bindAggregation("items", "/Actions", function () {
						return new ColumnListItem({
							cells: aCols.map(function (column) {
								return new Label({
									text: "{" + column.template + "}"
								});
							})
						});
					});
				}

				this._oActionValueHelpDialog.update();
			}.bind(this));

			this._oActionValueHelpDialog.setTokens(this._oAction.getTokens());
			this._oActionValueHelpDialog.open();
		},

		onActionValueHelpOkPress: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this._oAction.setTokens(aTokens);
			this._oActionValueHelpDialog.close();
		},

		onActionValueHelpCancelPress: function () {
			this._oActionValueHelpDialog.close();
		},

		onActionValueHelpAfterClose: function () {
			this._oActionValueHelpDialog.destroy();
		},

		onActionFilterBarSearch: function (oEvent) {
			var sSearchQuery = this._oActionBasicSearchField.getValue(),
				aSelectionSet = oEvent.getParameter("selectionSet");
			var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					aResult.push(new Filter({
						path: oControl.getName(),
						operator: FilterOperator.Contains,
						value1: oControl.getValue()
					}));
				}

				return aResult;
			}, []);

			aFilters.push(new Filter({
				filters: [
					new Filter({
						path: "Name",
						operator: FilterOperator.Contains,
						value1: sSearchQuery
					})
				],
				and: false
			}));

			this._filterAction(new Filter({
				filters: aFilters,
				and: true
			}));
		},

		_filterAction: function (oFilter) {
			var oActionValueHelpDialog = this._oActionValueHelpDialog;

			oActionValueHelpDialog.getTableAsync().then(function (oTable) {
				if (oTable.bindRows) {
					oTable.getBinding("rows").filter(oFilter);
				}

				if (oTable.bindItems) {
					oTable.getBinding("items").filter(oFilter);
				}

				oActionValueHelpDialog.update();
			});
		},



		/* =========================================================== */
		/* begin: fragments    Layers                                		   */
		/* =========================================================== */
		_onLayerValidate: function (oArgs) {
			if (oArgs.suggestionObject) {
				var oObject = oArgs.suggestionObject.getBindingContext().getObject(),
					oToken = new Token();

				oToken.setKey(oObject.ID);
				oToken.setText(oObject.Name);
				return oToken;
			}

			return null;
		},

		onLayerValueHelpRequested: function() {
			var aCols = this._oLayerColModel.getData().cols;
			this._oLayerBasicSearchField = new SearchField({
				showSearchButton: false
			});

			this._oLayerValueHelpDialog = sap.ui.xmlfragment("com.sap.nss.nsaa.fragments.Layers", this);
			this.getView().addDependent(this._oLayerValueHelpDialog);

			var oFilterBar = this._oLayerValueHelpDialog.getFilterBar();
			oFilterBar.setFilterBarExpanded(false);
			oFilterBar.setBasicSearch(this._oLayerBasicSearchField);

			this._oLayerValueHelpDialog.getTableAsync().then(function (oTable) {
				//oTable.setModel(this._oLayerModel);
				oTable.setModel(this._oLayerColModel, "columns");

				if (oTable.bindRows) {
					oTable.bindAggregation("rows", "/Layers");
				}

				if (oTable.bindItems) {
					oTable.bindAggregation("items", "/Layers", function () {
						return new ColumnListItem({
							cells: aCols.map(function (column) {
								return new Label({
									text: "{" + column.template + "}"
								});
							})
						});
					});
				}

				this._oLayerValueHelpDialog.update();
			}.bind(this));

			this._oLayerValueHelpDialog.setTokens(this._oLayer.getTokens());
			this._oLayerValueHelpDialog.open();
		},

		onLayerValueHelpOkPress: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this._oLayer.setTokens(aTokens);
			this._oLayerValueHelpDialog.close();
		},

		onLayerValueHelpCancelPress: function () {
			this._oLayerValueHelpDialog.close();
		},

		onLayerValueHelpAfterClose: function () {
			this._oLayerValueHelpDialog.destroy();
		},

		onLayerFilterBarSearch: function (oEvent) {
			var sSearchQuery = this._oLayerBasicSearchField.getValue(),
				aSelectionSet = oEvent.getParameter("selectionSet");
			var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					aResult.push(new Filter({
						path: oControl.getName(),
						operator: FilterOperator.Contains,
						value1: oControl.getValue()
					}));
				}

				return aResult;
			}, []);

			aFilters.push(new Filter({
				filters: [
					new Filter({
						path: "Name",
						operator: FilterOperator.Contains,
						value1: sSearchQuery
					})
				],
				and: false
			}));

			this._filterLayer(new Filter({
				filters: aFilters,
				and: true
			}));
		},

		_filterLayer: function (oFilter) {
			var oLayerValueHelpDialog = this._oLayerValueHelpDialog;

			oLayerValueHelpDialog.getTableAsync().then(function (oTable) {
				if (oTable.bindRows) {
					oTable.getBinding("rows").filter(oFilter);
				}

				if (oTable.bindItems) {
					oTable.getBinding("items").filter(oFilter);
				}

				oLayerValueHelpDialog.update();
			});
		},



		/* =========================================================== */
		/* begin: fragments    BusinessObject                                		   */
		/* =========================================================== */
		_onBusinessObjectValidate: function (oArgs) {
			if (oArgs.suggestionObject) {
				var oObject = oArgs.suggestionObject.getBindingContext().getObject(),
					oToken = new Token();

				oToken.setKey(oObject.ID);
				oToken.setText(oObject.Name);
				return oToken;
			}

			return null;
		},

		onBusinessObjectValueHelpRequested: function() {
			var aCols = this._oBusinessObjectColModel.getData().cols;
			this._oBusinessObjectBasicSearchField = new SearchField({
				showSearchButton: false
			});

			this._oBusinessObjectValueHelpDialog = sap.ui.xmlfragment("com.sap.nss.nsaa.fragments.BusinessObjects", this);
			this.getView().addDependent(this._oBusinessObjectValueHelpDialog);

			var oFilterBar = this._oBusinessObjectValueHelpDialog.getFilterBar();
			oFilterBar.setFilterBarExpanded(false);
			oFilterBar.setBasicSearch(this._oBusinessObjectBasicSearchField);

			this._oBusinessObjectValueHelpDialog.getTableAsync().then(function (oTable) {
				//oTable.setModel(this._oBusinessObjectModel);
				oTable.setModel(this._oBusinessObjectColModel, "columns");

				if (oTable.bindRows) {
					oTable.bindAggregation("rows", "/BusinessObjectTypes");
				}

				if (oTable.bindItems) {
					oTable.bindAggregation("items", "/BusinessObjectTypes", function () {
						return new ColumnListItem({
							cells: aCols.map(function (column) {
								return new Label({
									text: "{" + column.template + "}"
								});
							})
						});
					});
				}

				this._oBusinessObjectValueHelpDialog.update();
			}.bind(this));

			this._oBusinessObjectValueHelpDialog.setTokens(this._oBusinessObject.getTokens());
			this._oBusinessObjectValueHelpDialog.open();
		},

		onBusinessObjectValueHelpOkPress: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this._oBusinessObject.setTokens(aTokens);
			this._oBusinessObjectValueHelpDialog.close();
		},

		onBusinessObjectValueHelpCancelPress: function () {
			this._oBusinessObjectValueHelpDialog.close();
		},

		onBusinessObjectValueHelpAfterClose: function () {
			this._oBusinessObjectValueHelpDialog.destroy();
		},

		onBusinessObjectFilterBarSearch: function (oEvent) {
			var sSearchQuery = this._oBusinessObjectBasicSearchField.getValue(),
				aSelectionSet = oEvent.getParameter("selectionSet");
			var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					aResult.push(new Filter({
						path: oControl.getName(),
						operator: FilterOperator.Contains,
						value1: oControl.getValue()
					}));
				}

				return aResult;
			}, []);

			aFilters.push(new Filter({
				filters: [
					new Filter({
						path: "Name",
						operator: FilterOperator.Contains,
						value1: sSearchQuery
					})
				],
				and: false
			}));

			this._filterBusinessObject(new Filter({
				filters: aFilters,
				and: true
			}));
		},

		_filterBusinessObject: function (oFilter) {
			var oBusinessObjectValueHelpDialog = this._oBusinessObjectValueHelpDialog;

			oBusinessObjectValueHelpDialog.getTableAsync().then(function (oTable) {
				if (oTable.bindRows) {
					oTable.getBinding("rows").filter(oFilter);
				}

				if (oTable.bindItems) {
					oTable.getBinding("items").filter(oFilter);
				}

				oBusinessObjectValueHelpDialog.update();
			});
		},

		_checkIfBatchRequestSucceeded: function (oEvent) {
			var oParams = oEvent.getParameters();
			var aRequests = oEvent.getParameters().requests;
			var oRequest;
			if (oParams.success) {
				if (aRequests) {
					for (var i = 0; i < aRequests.length; i++) {
						oRequest = oEvent.getParameters().requests[i];
						if (!oRequest.success) {
							return false;
						}
					}
				}
				return true;
			} else {
				return false;
			}
		},

		/**
		 * Handles the success of updating an object
		 * @private
		 */
		 _fnUpdateSuccess: function () {
			this.getModel("appView").setProperty("/busy", false);
			this.getView().unbindObject();
			//this.getRouter().getTargets().display("object");
		},

		
	});

	return PageController;

});