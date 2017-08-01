import {AttributeParser, defaultParser, parseNgRepeat} from "./parsers";

export function singleAttribute(name : string, parser : AttributeParser = defaultParser) : DirectiveData {
    return {
        name,
        canBeElement: false,
        canBeAttribute: true,
        expressionAttributes: [name],
        attributes: [],
        parser
    };
}

export interface DirectiveData {
    name : string;
    canBeElement : boolean;
    canBeAttribute : boolean;
    expressionAttributes : string[];
    attributes : string[];
    parser : AttributeParser;
}

const BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES = [
    'ng-if',
    'ng-click',
    'ng-class',
    'ng-show',
    'ng-hide'
];

export const directiveMap : Map<string, DirectiveData> = new Map<string, DirectiveData>();
for (const name of BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES) {
    directiveMap.set(name, singleAttribute(name));
}
directiveMap.set('ng-repeat', singleAttribute('ng-repeat', parseNgRepeat));