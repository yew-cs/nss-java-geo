using {nsaa as our} from '../db/config';

service configServiceV2 @(path : '/adminconfig') {
    entity Actions             as projection on our.Actions excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity BusinessObjectTypes as projection on our.BusinessObjectTypes excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Layers              as projection on our.Layers excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Renderers           as projection on our.Renderers excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Scenarios           as projection on our.Scenarios excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity Applications        as projection on our.Application excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    };

    entity LayerType           as projection on our.LayerTypes;
    entity ServiceType         as projection on our.ServiceTypes;
    entity ActionType          as projection on our.ActionTypes;

}
