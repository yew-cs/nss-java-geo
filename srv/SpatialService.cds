using {nss as views} from '../db/views';
using {nss as our} from '../db/core';

service spatialService @(path : '/geoservice') {

    entity BusinessObjects    as projection on our.BusinessObjects excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Geometries         as projection on our.GeometryProxy excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Authorizations     as projection on our.Authorizations;
    entity Clients            as projection on our.Clients;
    function executeDb(sqlStatement : String) returns String;
}
