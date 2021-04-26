/**
 * Annotations for LayerTypes Entity
 */
annotate configService.LayerType with {
    Code @(
        title  : '{i18n>Code}',
        UI     : {Hidden : true},
        Common : {Text : {
            $value                 : name,
            ![@UI.TextArrangement] : #TextOnly
        }}
    );
    Name @(
        title : '{i18n>Name}',
        UI    : {HiddenFilter : true}
    );
};

/**
 * Annotations for ServiceTypes Entity
 */
annotate configService.ServiceType with {
    Code @(
        title  : '{i18n>Code}',
        UI     : {Hidden : true},
        Common : {Text : {
            $value                 : name,
            ![@UI.TextArrangement] : #TextOnly
        }}
    );
    Name @(
        title : '{i18n>Name}',
        UI    : {HiddenFilter : true}
    );
};


/**
 * Annotations for Layers Entity
 */
annotate configService.Layers with @(
    Common : {Label : '{i18n>Layer}'},
    UI     : {
        SelectionFields                 : [
            Name,
            LayerType_Code,
            ServiceType_Code
        ],
        HeaderInfo                      : {
            TypeName       : '{i18n>Layer}',
            TypeNamePlural : '{i18n>Layers}',
            Title          : {Value : Name},
            Description    : {Value : Description},

        },
        HeaderFacets                    : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#LayerInfo'
        }],
        LineItem                        : {$value : [
            {Value : Name},
            {Value : LayerType_Code},
            {Value : ServiceType_Code},
            {Value : MinZoom}
        ]},
        FieldGroup #LayerInfo           : {Data : [
            {Value : LayerType_Code},
            {Value : MinZoom}
        ]},
        FieldGroup #GeneralInformation  : {Data : [

            {Value : ServiceType_Code},
            {
                $Type : 'UI.DataFieldWithUrl',
                Value : ServiceUrl,
                Url   : ServiceUrl
            },
            {Value : OdataFieldNameGeometry},
            {Value : OdataFieldNameProperties},
        ]},
        FieldGroup #ConfigurationDetail : {Data : [

            {Value : LayoutJson},
            {Value : PaintJson},
            {Value : MarkerUrl},
            {Value : MarkerFallback},
            {Value : JsonConfig},

        ]},
        Facets                          : [{
            $Type  : 'UI.CollectionFacet',
            Label  : '{i18n>LayerOverview}',
            ID     : 'LayerOverviewFacet',
            Facets : [
                {
                    $Type  : 'UI.ReferenceFacet',
                    Label  : '{i18n>GeneralInformation}',
                    ID     : 'GeneralInformationFacet',
                    Target : '@UI.FieldGroup#GeneralInformation'
                },
                {
                    $Type  : 'UI.ReferenceFacet',
                    Label  : '{i18n>ConfigurationDetail}',
                    ID     : 'ConfigurationDetailFacet',
                    Target : '@UI.FieldGroup#ConfigurationDetail'
                },

            //begin of reference facet enhancement

            //end of reference facet enhancement
            ]
        }

        ]
    }
) {
    ID                       @Core  : {Computed : true};
    Name                     @(
        title    : '{i18n>Name}',
        required : 'true'
    );
    Description              @(
        title : '{i18n>Description}',
        UI    : {MultiLineText : true}
    );
    LayerType                @(
        title  : '{i18n>LayerType}',
        Common : {
            Text            : LayerType.name,
            TextArrangement : #TextOnly,
            ValueListWithFixedValues,

        }
    );
    ServiceType              @(
        title  : '{i18n>ServiceType}',
        Common : {
            Text            : ServiceType.name,
            TextArrangement : #TextOnly,
            ValueListWithFixedValues
        }
    );
    ServiceUrl               @title : '{i18n>ServiceUrl}';
    MinZoom                  @title : '{i18n>MinZoom}';
    LayoutJson               @(
        title : '{i18n>LayoutJson}',
        UI    : {MultiLineText : true}
    );
    PaintJson                @(
        title : '{i18n>PaintJson}',
        UI    : {MultiLineText : true}
    );
    MarkerUrl                @title : '{i18n>MarkerUrl}';
    MarkerFallback           @title : '{i18n>MarkerFallback}';
    JsonConfig               @(
        title : '{i18n>JsonConfig}',
        UI    : {MultiLineText : true}
    );
    OdataFieldNameGeometry   @title : '{i18n>OdataFieldNameGeometry}';
    OdataFieldNameProperties @title : '{i18n>OdataFieldNameProperties}';
}
