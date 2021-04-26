using {nsaa as our} from '../db/config';

service configService @(path : '/geoconfig') {
    @odata.draft.enabled
    entity Actions                      as projection on our.Actions excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    @odata.draft.enabled
    entity BusinessObjectTypes          as projection on our.BusinessObjectTypes excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    @odata.draft.enabled
    entity Layers                       as projection on our.Layers excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    @odata.draft.enabled
    entity Renderers                    as projection on our.Renderers excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Scenarios                    as projection on our.Scenarios excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Actions_in_Scenarios         as projection on our.ActionsInScenarios excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity BusinessObjects_in_Scenarios as projection on our.BusinessObjectsInScenarios excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Layers_in_Scenarios          as projection on our.LayersInScenarios excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity LayerType                    as projection on our.LayerTypes;
    entity ServiceType                  as projection on our.ServiceTypes;
    entity ActionType                   as projection on our.ActionTypes;

    @cds.redirection.target : false
    entity BusinessObjectType           as projection on our.BusinessObjectTypes excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    type NetworkSpatialConfig {
        _version            :      String;
        ClientId            :      String;
        Renderers           : many Renderer;
        Actions             : many Action;
        Layers              : many Layer;
        BusinessObjectTypes : many _BusinessObjectType;
    };

    type Action {
        ID                 : String;
        Name               : String;
        Description        : String;
        SemanticObject     : String;
        Action             : String;
        Url                : String;
        ActionType         : Association to ActionType;
        BusinessObjectType : Association to BusinessObjectType;
        Parameters         : array of Parameters;
    };

    type Parameters {
        KeyName : String;
        Value   : String;
    };

    type Layer {
        ID                       : String;
        Name                     : String;
        Description              : String;
        ServiceType              : Association to ServiceType;
        ServiceUrl               : String;
        OdataFieldNameGeometry   : String;
        OdataFieldNameProperties : String;
        LayerType                : Association to LayerType;
        MinZoom                  : Integer;
        LayoutJson               : LargeString;
        PaintJson                : LargeString;
        MarkerUrl                : String;
        MarkerFallback           : String;
        JsonConfig               : LargeString;
    };

    type Renderer {
        ID                      : String;
        Name                    : String;
        Description             : String;
        AccessToken             : String;
        CloudFoundryDestination : String;
        Url                     : String;
        DefaultCenterLatitude   : Double;
        DefaultCenterLongitude  : Double;
        DefaultZoomLevel        : Integer;
        DefaultStyle            : String;
        JsonConfig              : LargeString;
    }

    type _BusinessObjectType {
        ID          : String;
        Name        : String;
        Description : String;
        JsonConfig  : LargeString;
    };


    //function getConfig(clientId : String) returns NetworkSpatialConfig;
    function getConfig() returns NetworkSpatialConfig;

}
