import {AttributeParser, defaultParser} from "./parsers";

export function singleAttribute(name : string, parser : AttributeParser = defaultParser) : DirectiveData {
    return {
        name,
        canBeElement: false,
        canBeAttribute: true,
        expressionAttributes: [name],
        parser
    };
}

export interface DirectiveData {
    name : string;
    canBeElement : boolean;
    canBeAttribute : boolean;
    expressionAttributes : string[];
    parser : AttributeParser;
}

const BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES = [
    'ng-if',
    'ng-click',
    'ng-repeat'
];

export const directiveMap : Map<string, any> = new Map<string, any>();
for (const name of BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES) {
    directiveMap.set(name, singleAttribute(name));
}