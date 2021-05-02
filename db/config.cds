namespace nsaa;

using {
    cuid,
    managed,
    sap.common
} from '@sap/cds/common';

// Type definition for client Id
type ClientIdType : UUID;

/**
 * Configuration table for renderers. Examples are SAP Visual
 * Business, Mapbox, Leaflet, etc.
 */
entity Renderers : cuid, managed {
    ClientId                : ClientIdType;
    Name                    : localized String;
    Description             : localized String;
    AccessToken             : String;
    CloudFoundryDestination : String;
    Url                     : String;
    @assert.range : [
        -180,
        180
    ]
    DefaultCenterLatitude   : Double;
    @assert.range : [
        -180,
        180
    ]
    DefaultCenterLongitude  : Double;
    @assert.range : [
        0,
        100
    ]
    DefaultZoomLevel        : Integer;
    DefaultStyle            : String;
    JsonConfig              : LargeString;
};

/**
 * Layers, these can reference Basemaps, reference layers or
 * business object layers. NSC Layers combine what Mapbox calls
 * source and layer into one object
 */
entity Layers : cuid, managed {
    ClientId                 : ClientIdType;
    @mandatory Name          : localized String;
    Description              : localized String;
    @mandatory ServiceType   : Association to one ServiceTypes;
    ServiceUrl               : String;
    OdataFieldNameGeometry   : String default 'boGeometry';
    OdataFieldNameProperties : String default 'metaData';
    @mandatory LayerType     : Association to one LayerTypes;
    @assert.range : [
        0,
        100
    ] MinZoom                : Integer default 100;
    LayoutJson               : LargeString;
    PaintJson                : LargeString;
    MarkerUrl                : String;
    MarkerFallback           : String;
    Attribution              : String;
    JsonConfig               : LargeString;
};

entity LayerTypeCodeList : common.CodeList {
    key Code : String(20);
}

entity ServiceTypeCodeList : common.CodeList {
    key Code : String(20);
}

/**
 * Layer Types e.g. Line,circle etc
 */
entity LayerTypes : LayerTypeCodeList {}
/**
 * Service Types e.g. geojson,odatav4
 */
entity ServiceTypes : ServiceTypeCodeList {}

/**
 * Action, these can be 'Create Work Order' or 'Track Shipment'
 */
entity Actions : cuid, managed {
    ClientId              : ClientIdType; //Probably redundant
    @mandatory Name       : localized String; //name of the action item eg Create Work Oder
    Description           : localized String; //description of the action item eg Creates a collaborative work order
    @mandatory ActionType : Association to one ActionTypes; //list of currently supported action types eg semanticNavigation, urlNavigation
    BusinessObjectType    : Association to one BusinessObjectTypes;
    SemanticObject        : String; //the SAP standard business object eg Shipment, WorkOrder, Equipment, Notification, TruckLocation
    Action                : String; //used for semanticNavigation
    Url                   : String; //used for urlNavigation
    Parameters            : LargeString; //Provide a JSON string of additional key values necessary for the configuration
};

/**
 * Action Types e.g. semanticNavigation, urlNavigation etc
 */
entity ActionsCodeList : common.CodeList {
    key Code : String(20);
}

entity ActionTypes : ActionsCodeList {}

/**
 * Business Object Type: I.e. Work order
 */
entity BusinessObjectTypes : cuid, managed {
    ClientId        : ClientIdType;
    @mandatory Name : localized String;
    Description     : localized String;
    JsonConfig      : LargeString;
};

/**
 * Scenarios or variants
 */
entity Scenarios : cuid, managed {
    ClientId              : ClientIdType;
    Name                  : localized String;
    Description           : localized String;
    ToRenderer            : Association to one Renderers;
    ToBusinessObjectTypes : Composition of many {
                                key BusinessObjectType : Association to BusinessObjectTypes;
                            };
    ToLayers              : Composition of many {
                                key Layer : Association to Layers;
                            };
    ToActions             : Composition of many {
                                key Action : Association to Actions;
                            };
    JsonConfig            : LargeString;
};


/**
 * Applications
 */
// ApplicationType and ScreenName combination must be unique
@assert.unique : {AppScreen : [
    ApplicationType,
    ScreenName
]}
entity Application : cuid, managed {
    ClientId                   : ClientIdType;
    Name                       : localized String;
    Description                : localized String;
    @mandatory ApplicationType : Association to one ApplicationTypes;
    //Screen Name should only be alphanumeric, dash or underscore
    @mandatory ScreenName      : String @assert.format : '^[a-zA-Z0-9-_]+$';
    ToScenarios                : Composition of many {
                                     key Scenario : Association to Scenarios;
                                 };
    JsonConfig                 : LargeString;
};

/**
 * Application Types e.g. AIN, LBN, Ariba etc
 */
entity ApplicationCodeList : common.CodeList {
    key Code : String(20);
}

entity ApplicationTypes : ActionsCodeList {}