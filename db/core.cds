namespace nss;

using {
    cuid,
    temporal,
    managed
} from '@sap/cds/common';


entity Clients : cuid, managed {
    name                : String(1000); // Name of the company i.e. 'OwnerOperator 1, PumpManufacturer 2 or Construction Company 2'
    description         : String(5000); // Description of the company
    isMarkedForDeletion : Boolean default false; // Deletion flag
}

entity BusinessObjects : cuid, managed {
    ownerClient          : Association to Clients; // Unique Business Partner Id
    appReferenceObjectId : String(5000); // Reference to the object ID in the business application (AIN, LBN)
    boType               : String(1000); // Business Object Type (Workorder, Shipment)
    virtual metaData     : LargeString; // Meta data in json Format, implemented to be stored in Document Store
    geometries           : Composition of many Geometries
                               on geometries.boReference = $self; // Association to geometries
    isMarkedForDeletion  : Boolean default false; // Deletion flag
}

@cds.persistence.exists
entity Geometries : cuid, temporal, managed {
    //boGeometry          : hana.ST_GEOMETRY(4326)@odata.Type : 'Edm.String'; // The Geometry itself
    boGeometry          : LargeString; // The Geometry Java workaround
    boReference         : Association to BusinessObjects; //Reference to the BusinessObjects
    boContext           : String(1000); // Context reference for Geometry (i.e. BaseLocation, Service Area or Current Location)
    virtual metaData    : LargeString; // Meta data in json Format, implemented to be stored in Document Store
    isMarkedForDeletion : Boolean default false; // Deletion flag
}

entity Authorizations : cuid, managed {
    authorizedClient    : Association to Clients; // The Client Id that this Authorization entry is related to
    boReference         : Association to BusinessObjects; //Reference to the BusinessObjects entity
    geometryReference   : Association to Geometries; //Reference to the Geometries entity
    readAllowed         : Boolean default true; // Identifies if 'read' of this Business Object or Geometry is allowed
    updateAllowed       : Boolean default false; // Identifies if 'update' of this Business Object or Geometry is allowed
    deleteAllowed       : Boolean default false; // Identifies if 'delete' of this Business Object or Geometry is allowed
    isMarkedForDeletion : Boolean default false; // Deletion flag
}
