namespace nss;

using {
    cuid,
    temporal,
    managed,
    User
} from '@sap/cds/common';

entity Logs_Clients : cuid, managed {
    logCounter      : Integer64;
    logTime         : Timestamp;
    logUser         : User;
    ID              : UUID;
    name_old        : String(1000);
    name_new        : String(1000);
    description_old : String(5000);
    description_new : String(5000);
    isMarkedForDeletion_old  : Boolean;
    isMarkedForDeletion_new  : Boolean;
}

entity Logs_BusinessObjects : cuid {
    logCounter               : Integer64;
    logTime                  : Timestamp;
    logUser                  : User;
    ID                       : UUID;
    ownerClient_Id_old   : UUID;
    ownerClient_Id_new   : UUID;
    appReferenceObjectId_old : String(5000);
    appReferenceObjectId_new : String(5000);
    boType_old               : String(1000);
    boType_new               : String(1000);
    isMarkedForDeletion_old  : Boolean;
    isMarkedForDeletion_new  : Boolean;
}

@cds.persistence.exists
entity Logs_Geometries : cuid, temporal, managed {
    logCounter              : Integer64;
    logTime                 : Timestamp;
    logUser                 : User;
    ID                      : UUID;
    validFrom               : Timestamp;
    validTo_old             : Timestamp;
    validTo_new             : Timestamp;
    //boGeometry_old          : hana.ST_GEOMETRY(4326);
    //boGeometry_new          : hana.ST_GEOMETRY(4326);
    boGeometry_old          : LargeString;
    boGeometry_new          : LargeString;
    boReference_Id_old      : UUID;
    boReference_Id_new      : UUID;
    boContext_old           : String(1000);
    boContext_new           : String(1000);
    isMarkedForDeletion_old : Boolean;
    isMarkedForDeletion_new : Boolean;
}

entity Logs_Authorizations : cuid, managed {
    logCounter               : Integer64;
    logTime                  : Timestamp;
    logUser                  : User;
    ID                       : UUID;
    authorizedClient_Id_old   : UUID;
    authorizedClient_Id_new   : UUID;
    boReference_Id_old       : UUID;
    boReference_Id_new       : UUID;
    geometryReference_Id_old : UUID;
    geometryReference_Id_new : UUID;
    readAllowed_old          : Boolean;
    readAllowed_new          : Boolean;
    updateAllowed_old        : Boolean;
    updateAllowed_new        : Boolean;
    deleteAllowed_old        : Boolean;
    deleteAllowed_new        : Boolean;
    isMarkedForDeletion_old  : Boolean;
    isMarkedForDeletion_new  : Boolean;
}

entity Logs_Metadata {
    logCounter       : Integer64;
    logTime          : Timestamp;
    logUser          : User;
    jsonMetaData_old : LargeString;
    jsonMetaData_new : LargeString;
}
