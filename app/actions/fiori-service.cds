/**
 * Annotations for Actions Entity
 */
annotate configService.Actions with @(
    Common : {Label : '{i18n>Action}'},
    UI     : {
        SelectionFields                : [
            Name,
            ActionType_Code,
            BusinessObjectType_ID
        ],
        HeaderInfo                     : {
            TypeName       : '{i18n>Action}',
            TypeNamePlural : '{i18n>Actions}',
            Title          : {Value : Name},
            Description    : {Value : Description},

        },
        LineItem                       : {$value : [
            {Value : Name},
            {Value : Description},
            {Value : ActionType_Code},
            {Value : BusinessObjectType_ID},
            {Value : SemanticObject}

        ]},
        Facets                         : [{
            $Type  : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#GeneralInformation',
            Label  : '{i18n>GeneralInformation}'
        }],
        FieldGroup #GeneralInformation : {Data : [
            {Value : ActionType_Code},
            {Value : BusinessObjectType_ID},
            {Value : SemanticObject},
            {Value : Action},
            {
                $Type : 'UI.DataFieldWithUrl',
                Value : Url,
                Url   : Url
            },
            {Value : Parameters},

        ]}
    }
) {
    ID                 @Core  : {Computed : true};
    Name               @title : '{i18n>Name}';
    Description        @title : '{i18n>Description}';
    ActionType         @(
        title  : '{i18n>ActionType}',
        Common : {
            Text            : ActionType.name,
            TextArrangement : #TextOnly,
            ValueListWithFixedValues
        }
    );
    BusinessObjectType @(
        title  : '{i18n>BusinessObjectType}',
        Common : {
            Text                     : {
                $value                 : BusinessObjectType.Name,
                ![@UI.TextArrangement] : #TextOnly
            },
            ValueListWithFixedValues : true,
            ValueList                : {
                CollectionPath : 'BusinessObjectTypes',
                Parameters     : [
                    {
                        $Type             : 'Common.ValueListParameterInOut',
                        LocalDataProperty : BusinessObjectType_ID,
                        ValueListProperty : 'ID'
                    },
                    {
                        $Type             : 'Common.ValueListParameterDisplayOnly',
                        ValueListProperty : 'Name'
                    }
                ]
            }
        }
    );
    Parameters         @(
        title : '{i18n>Parameters}',
        UI    : {MultiLineText : true}
    );
    Url                @title : '{i18n>Url}';
    Action             @title : '{i18n>Action}';
    SemanticObject     @title : '{i18n>SemanticObject}';
}

/**
 * Annotations for ActionType Entity
 */
annotate configService.ActionType with {
    Code @(
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