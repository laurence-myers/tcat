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
import camelCase = require('lodash.camelcase');

export function singleAttribute(map : DirectiveMap, name : string, parser : AttributeParser = defaultParser, priority : number = 0) : void {
    map.attributes.set(name, {
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
    singleAttribute(map, name + 'Start', wrapParseScopeStart(parser), priority);
    singleAttribute(map, name + 'End', parseScopeEnd, priority);
}

export function multiElementAttributeWithoutScope(map : DirectiveMap, name : string, parser : AttributeParser = defaultParser, priority : number = 0) : void {
    singleAttribute(map, name, parser, priority);
    singleAttribute(map, name + 'Start', parser, priority);
    singleAttribute(map, name + 'End', () => Either.Right({ nodes: [] }), priority);
}

export interface AttributeLocal {
    name : string;
    type : string;
}

export interface DirectiveAttribute {
    name : string;
    optional? : boolean;
    mode? : 'expression' | 'interpolated';
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

export interface DirectiveMap {
    elements : Map<string, DirectiveData>;
    attributes : Map<string, DirectiveData>;
}

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
 textarea

 Expose $event on all event directives
 */

const BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES = [
    'ngBind',
    'ngBindHtml',
    'ngBindTemplate',
    'ngClass',
    'ngClassEven',
    'ngClassOdd',
    'ngCloak',
    'ngMaxlength', // do ngMaxlength and ngMinlength allow expressions? hmm.
    'ngMinlength',
    'ngModelOptions',
    'ngPattern',
    'ngRequired',
    'ngStyle',
    'ngSubmit',
    'ngSwitch', // This has ngSwitchWhere in child nodes
    'ngValue'
];

const BUILTIN_SINGLE_ATTRIBUTE_INTERPOLATED_DIRECTIVE_NAMES = [
    'ngHref',
    'ngSrc',
    'ngSrcset'
];

const BUILTIN_EVENT_DIRECTIVE_NAMES = [
    'ngBlur',
    'ngChange',
    'ngClick',
    'ngCopy',
    'ngCut',
    'ngDblclick',
    'ngFocus',
    'ngKeydown',
    'ngKeypress',
    'ngKeyup',
    'ngMousedown',
    'ngMouseenter',
    'ngMouseleave',
    'ngMousemove',
    'ngMouseout',
    'ngMouseover',
    'ngMouseup',
    'ngPaste',
];

export const builtinDirectiveMap : DirectiveMap = {
    elements: new Map<string, DirectiveData>(),
    attributes: new Map<string, DirectiveData>()
};
for (const name of BUILTIN_SINGLE_ATTRIBUTE_DIRECTIVE_NAMES) {
    singleAttribute(builtinDirectiveMap, name);
}
for (const name of BUILTIN_SINGLE_ATTRIBUTE_INTERPOLATED_DIRECTIVE_NAMES) {
    singleAttribute(builtinDirectiveMap, name, parseInterpolatedText, 99);
}
for (const name of BUILTIN_EVENT_DIRECTIVE_NAMES) {
    singleAttribute(builtinDirectiveMap, name, parseEventDirective);
}

builtinDirectiveMap.elements.set('form', {
    name: 'form',
    canBeElement: true,
    canBeAttribute: false,
    parser: (el, directives) => parseFormElement(el, directives),
    attributes: []
});

singleAttribute(builtinDirectiveMap, 'ngController', parseNgController, 500);
singleAttribute(builtinDirectiveMap, 'ngChecked', defaultParser, 100);
singleAttribute(builtinDirectiveMap, 'ngDisabled', defaultParser, 100);
multiElementAttributeWithoutScope(builtinDirectiveMap, 'ngHide', defaultParser);
multiElementAttributeWithScope(builtinDirectiveMap, 'ngIf', parseNgIf, 600);
builtinDirectiveMap.elements.set('ngInclude', {
    name: 'ngInclude',
    canBeElement: true,
    canBeAttribute: false,
    attributes: [
        {
            name: 'src'
        },
        {
            name: 'onload',
            optional: true
        },
        {
            name: 'autoscroll',
            optional: true
        }
    ]
});
builtinDirectiveMap.attributes.set('ngInclude', {
    name: 'ngInclude',
    canBeElement: false,
    canBeAttribute: true,
    attributes: [
        {
            name: 'ngInclude'
        },
        {
            name: 'onload',
            optional: true
        },
        {
            name: 'autoscroll',
            optional: true
        }
    ]
});
singleAttribute(builtinDirectiveMap, 'ngInit', defaultParser, 450);
singleAttribute(builtinDirectiveMap, 'ngModel', defaultParser, 1);
singleAttribute(builtinDirectiveMap, 'ngOpen', defaultParser, 100);
builtinDirectiveMap.elements.set('ngPluralize', {
    name: 'ngPluralize',
    canBeElement: true,
    canBeAttribute: false,
    attributes: []
});
builtinDirectiveMap.attributes.set('when', {
    name: 'ngPluralize',
    canBeElement: false,
    canBeAttribute: true,
    attributes: [
        {
            name: 'count',
            mode: 'expression'
        },
        {
            name: 'when',
            mode: 'interpolated'
        },
        {
            name: 'offset',
            mode: 'interpolated',
            optional: true
        }
    ]
});
singleAttribute(builtinDirectiveMap, 'ngReadonly', defaultParser, 100);
multiElementAttributeWithScope(builtinDirectiveMap, 'ngRepeat', parseNgRepeat, 1000);
singleAttribute(builtinDirectiveMap, 'ngSelected', defaultParser, 100);
multiElementAttributeWithoutScope(builtinDirectiveMap, 'ngShow', defaultParser);
singleAttribute(builtinDirectiveMap, 'ngSwitch', defaultParser, 1200);

builtinDirectiveMap.elements.set('script', {
    name: 'ngTemplate',
    canBeElement: true,
    canBeAttribute: false,
    parser: (el, directives) => parseNgTemplateElement(el, directives), // not sure why this wrapping function is required...
    attributes: []
});

// TODO: support multiple directives per tag/element name. (1:M)
export function createDirectiveMap(directives : DirectiveData[]) : DirectiveMap {
    const elementMap = new Map<string, DirectiveData>();
    const attributeMap = new Map<string, DirectiveData>();
    for (const [key, value] of builtinDirectiveMap.elements.entries()) {
        elementMap.set(key, value);
    }
    for (const [key, value] of builtinDirectiveMap.attributes.entries()) {
        attributeMap.set(key, value);
    }
    for (const directive of directives) {
        if (directive.canBeElement) {
            elementMap.set(directive.name, directive);
        }
        if (directive.canBeAttribute) {
            attributeMap.set(directive.name, directive);
        }
    }
    return {
        elements: elementMap,
        attributes: attributeMap
    };
}

export function normalize(attributeName : string | null | undefined) : string {
    return attributeName ? camelCase(attributeName.replace(/^(x-|data-)/, '')) : '';
}