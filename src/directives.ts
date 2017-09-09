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
import {Either} from "monet";

export function singleAttribute(map : DirectiveMap, name : string, parser : AttributeParser = defaultParser, priority : number = 0) : void {
    map.set(name, {
        name,
        canBeElement: false,
        canBeAttribute: true,
        attributes: [{
            name,
            parser
        }],
        priority
    });
}

export function multiElementAttributeWithScope(map : DirectiveMap, name : string, parser : AttributeParser = defaultParser, priority : number = 0) : void {
    singleAttribute(map, name, parser, priority);
    singleAttribute(map, name + '-start', wrapParseScopeStart(parser), priority);
    singleAttribute(map, name + '-end', parseScopeEnd, priority);
}

export function multiElementAttributeWithoutScope(map : DirectiveMap, name : string, parser : AttributeParser = defaultParser, priority : number = 0) : void {
    singleAttribute(map, name, parser, priority);
    singleAttribute(map, name + '-start', parser, priority);
    singleAttribute(map, name + '-end', () => Either.Right({ nodes: [] }), priority);
}

export interface AttributeLocal {
    name : string;
    type : string;
}

export interface DirectiveAttribute {
    name : string;
    optional? : boolean;
    type? : 'expression' | 'interpolated';
    locals? : AttributeLocal[];
    parser? : AttributeParser;
}

export interface DirectiveData {
    name : string;
    canBeElement : boolean;
    canBeAttribute : boolean;
    attributes : DirectiveAttribute[];
    parser? : ElementDirectiveParser;
    priority? : number;
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
 ngInclude (priority 400)
 ngNonBindable - don't parse children (priority 1000)
 ngPluralize
 select
 textarea

 Expose $event on all event directives
 */

const BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES = [
    'ng-bind',
    'ng-bind-html',
    'ng-bind-template',
    'ng-class',
    'ng-class-even',
    'ng-class-odd',
    'ng-cloak',
    'ng-maxlength', // do ng-maxlength and ng-minlength allow expressions? hmm.
    'ng-minlength',
    'ng-model-options',
    'ng-pattern',
    'ng-required',
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
    singleAttribute(builtinDirectiveMap, name);
}
for (const name of BUILTIN_SINGLE_ATTRIBUTE_INTERPOLATED_DIRECTIVE_NAMES) {
    singleAttribute(builtinDirectiveMap, name, parseInterpolatedText, 99);
}
for (const name of BUILTIN_EVENT_DIRECTIVE_NAMES) {
    singleAttribute(builtinDirectiveMap, name, parseEventDirective);
}

builtinDirectiveMap.set('form', {
    name: 'form',
    canBeElement: true,
    canBeAttribute: false,
    parser: (el, directives) => parseFormElement(el, directives),
    attributes: []
});

singleAttribute(builtinDirectiveMap, 'ng-controller', parseNgController, 500);
singleAttribute(builtinDirectiveMap, 'ng-checked', defaultParser, 100);
singleAttribute(builtinDirectiveMap, 'ng-disabled', defaultParser, 100);
multiElementAttributeWithoutScope(builtinDirectiveMap, 'ng-hide', defaultParser);
multiElementAttributeWithScope(builtinDirectiveMap, 'ng-if', parseNgIf, 600);
singleAttribute(builtinDirectiveMap, 'ng-init', defaultParser, 450);
singleAttribute(builtinDirectiveMap, 'ng-model', defaultParser, 1);
singleAttribute(builtinDirectiveMap, 'ng-open', defaultParser, 100);
singleAttribute(builtinDirectiveMap, 'ng-readonly', defaultParser, 100);
multiElementAttributeWithScope(builtinDirectiveMap, 'ng-repeat', parseNgRepeat, 1000);
singleAttribute(builtinDirectiveMap, 'ng-selected', defaultParser, 100);
multiElementAttributeWithoutScope(builtinDirectiveMap, 'ng-show', defaultParser);
singleAttribute(builtinDirectiveMap, 'ng-switch', defaultParser, 1200);

builtinDirectiveMap.set('script', {
    name: 'ng-template',
    canBeElement: true,
    canBeAttribute: false,
    parser: (el, directives) => parseNgTemplateElement(el, directives), // not sure why this wrapping function is required...
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
