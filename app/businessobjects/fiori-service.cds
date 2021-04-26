/**
 * Annotations for Business Object Types Entity
 */
annotate configService.BusinessObjectTypes with @(
    Common : {Label : '{i18n>BusinessObjectType}'},
    UI     : {
        SelectionFields                : [Name],
        HeaderInfo                     : {
            TypeName       : '{i18n>BusinessObjectType}',
            TypeNamePlural : '{i18n>BusinessObjectTypes}',
            Title          : {Value : Name},
            Description    : {Value : Description},

        },
        HeaderFacets                   : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#GeneralInformation'
        }],
        LineItem                       : {$value : [
            {Value : Name},
            {Value : Description}
        ]},
        FieldGroup #GeneralInformation : {Data : [{Value : JsonConfig}]}
    }
) {
    ID          @(
        Core   : {Computed : true},
        title  : '{i18n>Id}',
        UI     : {Hidden : true},
        Common : {Text : {
            $value                 : Name,
            ![@UI.TextArrangement] : #TextOnly
        }}
    );
    Name        @(
        title : '{i18n>Name}',
        // UI    : {HiddenFilter : true}
    );
    Description @title : '{i18n>Description}';
    JsonConfig  @(
        title : '{i18n>JsonConfig}',
        UI    : {MultiLineText : true}
    );
}
