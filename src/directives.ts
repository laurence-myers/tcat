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

/*
TODO:
 form - parse "name" as an assignment to the scope.
 input - name (property of the form), ng-model, ng-required, ng-minlength, ng-maxlength, ng-pattern, ng-change, ng-trim
 input[checkbox] - ng-model, ng-true-value, ng-false-value, ng-change
 input[date] - min (interp), max (interp), ng-min, ng-max, ng-required, ng-change
 input[datetime-local]
 input[email]
 input[month]
 input[number]
 input[radio]
 input[range]
 input[text]
 input[time]
 input[url]
 input[week]
 ngController
 ngForm
 ngHide (multiElement)
 ngIf (multiElement)
 ngInclude
 ngNonBindable - don't parse children
 ngOptions
 ngPluralize
 ngRepeat (multiElement)
 ngShow (multiElement)
 script
 select
 textarea


 Expose $event on all event directives
 */

const BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES = [
    'ng-bind',
    'ng-bind-html',
    'ng-bind-template',
    'ng-blur',
    'ng-change',
    'ng-checked',
    'ng-class',
    'ng-class-even',
    'ng-class-odd',
    'ng-click',
    'ng-cloak',
    'ng-copy',
    'ng-cut',
    'ng-dblclick',
    'ng-disabled',
    'ng-focus',
    'ng-hide',
    'ng-if',
    'ng-init',
    'ng-keydown',
    'ng-keypress',
    'ng-keyup',
    'ng-maxlength',
    'ng-minlength',
    'ng-model',
    'ng-model-options',
    'ng-mousedown',
    'ng-mouseenter',
    'ng-mouseleave',
    'ng-mousemove',
    'ng-mouseover',
    'ng-mouseup',
    'ng-open',
    'ng-paste',
    'ng-pattern',
    'ng-readonly',
    'ng-required',
    'ng-selected',
    'ng-show',
    'ng-style',
    'ng-submit',
    'ng-switch', // This has ng-switch-where in child nodes
    'ng-value'
];

const BUILTIN_SINGLE_ATTRIBUTE_INTERPOLATED_DIRECTIVE_NAMES = [
    'ng-href',
    'ng-src',
    'ng-srcset'
];

export const directiveMap : Map<string, DirectiveData> = new Map<string, DirectiveData>();
for (const name of BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES) {
    directiveMap.set(name, singleAttribute(name));
}
for (const name of BUILTIN_SINGLE_ATTRIBUTE_INTERPOLATED_DIRECTIVE_NAMES) {
    directiveMap.set(name, singleAttribute(name, parseInterpolatedText));
}
directiveMap.set('ng-repeat', singleAttribute('ng-repeat', parseNgRepeat));