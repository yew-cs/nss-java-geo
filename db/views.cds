namespace nss;

using {User} from '@sap/cds/common';

@cds.persistence.exists
entity V_Business_Geometry {
    BusinessObjectId              : UUID;
    GeometryID                    : UUID;
    BusinessObjectReferenceId     : String(5000);
    BusinessObjectType            : String(5000);
    GeometryValidFrom             : Timestamp;
    GeometryValidTo               : Timestamp;
    BusinessObjectGeometryGeoJson : LargeString;
    BusinessObjectContext         : String(1000);
    BoCreatedAt                   : Timestamp;
    BoCreatedBy                   : User;
    BoModifiedAt                  : Timestamp;
    BoModifiedBy                  : User;
    GeomCreatedAt                 : Timestamp;
    GeomCreatedBy                 : User;
    GeomModifiedAt                : Timestamp;
    GeomModifiedBy                : User;
    AuthorizedClient_Id           : UUID;
}
