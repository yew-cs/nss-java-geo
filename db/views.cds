namespace nss;

using {User} from '@sap/cds/common';
using {nss.BusinessObjects} from '../db/core';

@cds.persistence.exists
entity GeometryView {
    key id                  : UUID;
        validFrom           : Timestamp;
        validTo             : Timestamp;
        createdAt           : Timestamp;
        createdBy           : User;
        modifiedAt          : Timestamp;
        modifiedBy          : User;
        boGeometry          : LargeString; // The Geometry Java workaround
        geometryType        : String(20);
        boReference         : Association to BusinessObjects; //Reference to the BusinessObjects
        boContext           : String(1000); // Context reference for Geometry (i.e. BaseLocation, Service Area or Current Location)
        metaData            : LargeString; // Stored in DocuStore. Cannot use Virtual as it is ignored in Create/Update
        isMarkedForDeletion : Boolean; // Deletion flag
}
