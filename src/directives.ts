import {AttributeParser, defaultParser, parseInterpolatedText, parseNgRepeat} from "./parsers";

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
    'ng-class',
    'ng-click',
    'ng-hide',
    'ng-if',
    'ng-show'
];

const BUILTIN_SINGLE_ATTRIBUTE_INTERPOLATED_DIRECTIVE_NAMES = [
    'ng-href',
    'ng-src'
];

export const directiveMap : Map<string, DirectiveData> = new Map<string, DirectiveData>();
for (const name of BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES) {
    directiveMap.set(name, singleAttribute(name));
}
for (const name of BUILTIN_SINGLE_ATTRIBUTE_INTERPOLATED_DIRECTIVE_NAMES) {
    directiveMap.set(name, singleAttribute(name, parseInterpolatedText));
}
directiveMap.set('ng-repeat', singleAttribute('ng-repeat', parseNgRepeat));