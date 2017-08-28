import {
    AttributeParser,
    defaultParser,
    parseInterpolatedText,
    parseNgRepeat,
    parseNgRepeatEnd,
    parseNgRepeatStart
} from "./parsers";
import {ElementDirectiveParser, parseFormElement, parseNgTemplateElement} from "./parser/elements";

export function singleAttribute(name : string, parser : AttributeParser = defaultParser) : DirectiveData {
    return {
        name,
        canBeElement: false,
        canBeAttribute: true,
        attributes: [{
            name,
            parser
        }]
    };
}

export interface DirectiveAttribute {
    name : string;
    locals? : { name : string, type : string }[];
    parser? : AttributeParser;
}

export interface DirectiveData {
    name : string;
    canBeElement : boolean;
    canBeAttribute : boolean;
    attributes : DirectiveAttribute[];
    parser? : ElementDirectiveParser;
}

export type DirectiveMap = Map<string, DirectiveData>;

/*
TODO:
 input - name (property of the form)
 input[checkbox] - ng-model, ng-true-value, ng-false-value
 input[date] - min (interp), max (interp), ng-min, ng-max, ng-required
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
 ngHide (multiElement)
 ngIf (multiElement)
 ngInclude
 ngNonBindable - don't parse children
 ngPluralize
 ngShow (multiElement)
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
    'ng-maxlength', // do ng-maxlength and ng-minlength allow expressions? hmm.
    'ng-minlength',
    'ng-model',
    'ng-model-options',
    'ng-mousedown',
    'ng-mouseenter',
    'ng-mouseleave',
    'ng-mousemove',
    'ng-mouseout',
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

export const builtinDirectiveMap : Map<string, DirectiveData> = new Map<string, DirectiveData>();
for (const name of BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES) {
    builtinDirectiveMap.set(name, singleAttribute(name));
}
for (const name of BUILTIN_SINGLE_ATTRIBUTE_INTERPOLATED_DIRECTIVE_NAMES) {
    builtinDirectiveMap.set(name, singleAttribute(name, parseInterpolatedText));
}

builtinDirectiveMap.set('ng-repeat', singleAttribute('ng-repeat', parseNgRepeat));
builtinDirectiveMap.set('ng-repeat-start', singleAttribute('ng-repeat-start', parseNgRepeatStart));
builtinDirectiveMap.set('ng-repeat-end', singleAttribute('ng-repeat-end', parseNgRepeatEnd));

builtinDirectiveMap.set('script', {
    name: 'ng-template',
    canBeElement: true,
    canBeAttribute: false,
    parser: (el, directives) => parseNgTemplateElement(el, directives), // not sure why this wrapping function is required...
    attributes: []
});
builtinDirectiveMap.set('form', {
    name: 'form',
    canBeElement: true,
    canBeAttribute: false,
    parser: (el, directives) => parseFormElement(el, directives),
    attributes: []
});

// TODO: support multiple directives per tag/element name. (1:M)
export function createDirectiveMap(directives : DirectiveData[]) : Map<string, DirectiveData> {
    const map = new Map<string, DirectiveData>();
    for (const [key, value] of builtinDirectiveMap.entries()) {
        map.set(key, value);
    }
    for (const directive of directives) {
        map.set(directive.name, directive);
    }
    return map;
}