using {nss as views} from '../db/views';
using {nss as our} from '../db/core';

service spatialService @(path : '/geoservice') {

    @readonly
    entity BusinessGeometries as projection on views.V_Business_Geometry;

    entity BusinessObjects    as projection on our.BusinessObjects excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };
    
    entity Geometries         as projection on our.Geometries excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Authorizations     as projection on our.Authorizations;
    entity Clients            as projection on our.Clients;
    function executeDb(sqlStatement : String) returns String;
}
