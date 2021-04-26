/**
 * Annotations for Renderers Entity
 */
annotate configService.Renderers with @(
    Common : {Label : '{i18n>Renderer}'},
    UI     : {
        SelectionFields                : [
            Name,
            CloudFoundryDestination
        ],
        HeaderInfo                     : {
            TypeName       : '{i18n>Renderer}',
            TypeNamePlural : '{i18n>Renderers}',
            Title          : {Value : Name},
            Description    : {Value : Description},

        },
        HeaderFacets                    : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#RendererInfo'
        }],
        LineItem                       : {$value : [
            {Value : Name},
            {Value : Description},
            {Value : AccessToken},
            {Value : CloudFoundryDestination}
        ]},
        Facets                         : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#GeneralInformation',
            Label  : '{i18n>GeneralInformation}'
        }],
        FieldGroup #RendererInfo : {Data : [
            {Value : DefaultCenterLatitude},
            {Value : DefaultCenterLongitude},
            {Value : DefaultZoomLevel}
        ]},
        FieldGroup #GeneralInformation : {Data : [

            {Value : AccessToken},
            {Value : CloudFoundryDestination},
            {
                $Type : 'UI.DataFieldWithUrl',
                Value : Url,
                Url   : Url
            },
            {Value : DefaultStyle},
            {Value : JsonConfig}
        ]}
    }
) {
    ID                      @Core  : {Computed : true};
    Name                    @title : '{i18n>Name}';
    Description             @title : '{i18n>Description}';
    AccessToken             @title : '{i18n>AccessToken}';
    Url                     @(
        title : '{i18n>ServiceUrl}',
        UI    : {MultiLineText : true}
    );
    CloudFoundryDestination @title : '{i18n>CloudFoundryDestination}';
    DefaultCenterLatitude   @title : '{i18n>DefaultCenterLatitude}';
    DefaultCenterLongitude  @title : '{i18n>DefaultCenterLongitude}';
    DefaultZoomLevel        @title : '{i18n>DefaultZoomLevel}';
    DefaultStyle            @title : '{i18n>DefaultStyle}';
    JsonConfig              @(
        title : '{i18n>JsonConfig}',
        UI    : {MultiLineText : true}
    );
}