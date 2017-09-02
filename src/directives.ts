import {
    AttributeParser,
    defaultParser,
    parseEventDirective,
    parseInterpolatedText,
    parseNgController,
    parseNgIf,
    parseNgRepeat,
    parseScopeEnd,
    wrapParseScopeStart
} from "./parser/attributes";
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
 ngInclude
 ngNonBindable - don't parse children
 ngPluralize
 select
 textarea

 Expose $event on all event directives
 */

const BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES = [
    'ng-bind',
    'ng-bind-html',
    'ng-bind-template',
    'ng-checked',
    'ng-class',
    'ng-class-even',
    'ng-class-odd',
    'ng-cloak',
    'ng-disabled',
    'ng-hide',
    'ng-init',
    'ng-maxlength', // do ng-maxlength and ng-minlength allow expressions? hmm.
    'ng-minlength',
    'ng-model',
    'ng-model-options',
    'ng-open',
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

const BUILTIN_EVENT_DIRECTIVE_NAMES = [
    'ng-blur',
    'ng-change',
    'ng-click',
    'ng-copy',
    'ng-cut',
    'ng-dblclick',
    'ng-focus',
    'ng-keydown',
    'ng-keypress',
    'ng-keyup',
    'ng-mousedown',
    'ng-mouseenter',
    'ng-mouseleave',
    'ng-mousemove',
    'ng-mouseout',
    'ng-mouseover',
    'ng-mouseup',
    'ng-paste',
];

export const builtinDirectiveMap : Map<string, DirectiveData> = new Map<string, DirectiveData>();
for (const name of BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES) {
    builtinDirectiveMap.set(name, singleAttribute(name));
}
for (const name of BUILTIN_SINGLE_ATTRIBUTE_INTERPOLATED_DIRECTIVE_NAMES) {
    builtinDirectiveMap.set(name, singleAttribute(name, parseInterpolatedText));
}
for (const name of BUILTIN_EVENT_DIRECTIVE_NAMES) {
    builtinDirectiveMap.set(name, singleAttribute(name, parseEventDirective));
}

builtinDirectiveMap.set('ng-repeat', singleAttribute('ng-repeat', parseNgRepeat));
builtinDirectiveMap.set('ng-repeat-start', singleAttribute('ng-repeat-start', wrapParseScopeStart(parseNgRepeat)));
builtinDirectiveMap.set('ng-repeat-end', singleAttribute('ng-repeat-end', parseScopeEnd));

builtinDirectiveMap.set('ng-show-start', singleAttribute('ng-show-start', wrapParseScopeStart(defaultParser)));
builtinDirectiveMap.set('ng-show-end', singleAttribute('ng-show-end', parseScopeEnd));

builtinDirectiveMap.set('ng-hide-start', singleAttribute('ng-hide-start', wrapParseScopeStart(defaultParser)));
builtinDirectiveMap.set('ng-hide-end', singleAttribute('ng-hide-end', parseScopeEnd));

builtinDirectiveMap.set('ng-if', singleAttribute('ng-if', parseNgIf));
builtinDirectiveMap.set('ng-if-start', singleAttribute('ng-if-start', wrapParseScopeStart(parseNgIf)));
builtinDirectiveMap.set('ng-if-end', singleAttribute('ng-if-end', parseScopeEnd));

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
builtinDirectiveMap.set('ng-controller', singleAttribute('ng-controller', parseNgController));


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