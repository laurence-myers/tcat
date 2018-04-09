import {defaultParser, parseInterpolatedText, ParserResult, ScopeData, SuccessfulParserResult} from "./attributes";
import {Either} from "monet";
import {
    asHtmlContents,
    assertNever,
    AttributeParserError,
    ElementDirectiveParserError,
    flatten,
    HtmlValidationError,
    last,
    TcatError,
    UnexpectedStateError
} from "../core";
import {HasChildrenAstNode, ParameterNode, ScopedBlockNode, TemplateRootNode} from "../generator/ast";
import {DirectiveAttribute, DirectiveData, DirectiveMap, normalize} from "../directives";
import * as uppercamelcase from "uppercamelcase";
import {parseHtml} from "./templateParser";
import {parameter, scopedBlock, templateRoot} from "../generator/dsl";
import {AST} from "parse5";
import Default = AST.Default;
import Node = Default.Node;
import TextNode = Default.TextNode;
import Element = Default.Element;
import ParentNode = Default.ParentNode;

const htmlTagNames : string[] = require("html-tag-names");
const htmlElementAttributes : { [key : string] : string[] } = require("html-element-attributes");
const ariaAttributes : string[] = require("aria-attributes");

export type ElementDirectiveParserResult = Either<TcatError[], SuccessfulParserResult>;
export type ElementDirectiveParser = (element : Element, directives : DirectiveMap) => ElementDirectiveParserResult;

function isParentNode(node : Node | ParentNode) : node is Node & ParentNode {
    return (node as ParentNode).childNodes !== undefined;
}

function isTagNode(node : Node | Element) : node is Element {
    return (node as Element).tagName !== undefined;
}

function isTextHtmlNode(node : Node) : node is TextNode {
    return node.nodeName === '#text';
}

interface ScriptNode extends Element {
    nodeName : 'script';
    tagName : 'script';
}

function isScriptNode(node : Node) : node is ScriptNode {
    return node.nodeName === 'script';
}

interface FormNode extends Element {
    nodeName : 'form';
    tagName : 'form';
}

function isFormNode(node : Node) : node is FormNode {
    return node.nodeName === 'form';
}

interface SvgNode extends Element {
    nodeName : 'svg';
    tagName : 'svg';
}

function isSvgNode(node : Node) : node is SvgNode {
    return node.nodeName === 'svg';
}

const interpolationStartSymbol = '{{'; // TODO: make this configurable

export interface ElementParserContext {
    readonly node : Node;
    readonly errors : AttributeParserError[];
    readonly parsedAttributes : string[];
    scopeData : ScopeData | undefined;
    isScopeEnd : boolean;
    terminated : boolean;
}

export interface ScopeStackEntry {
    element : Node;
    astNode : HasChildrenAstNode;
}

function convertToParameter(entry : { name : string; type : string }) : ParameterNode {
    return parameter(entry.name, entry.type);
}

function compareDirectivesByPriority(a : DirectiveData, b : DirectiveData) : number {
    return (b.priority || 0) - (a.priority || 0);
}

export function parseElement(element : Node, directives : DirectiveMap, scopeInterfaceName : string) {
    const walker = new ElementWalker(directives);
    return walker.walkTemplate(element, scopeInterfaceName);
}

export class ElementWalker {
    protected root : TemplateRootNode = templateRoot();
    protected readonly scopeStack : ScopeStackEntry[] = [];
    protected readonly htmlElementNames : Set<string> = new Set<string>(htmlTagNames);
    protected shouldSkipHtmlValidation = false;

    constructor(
        protected readonly directives : DirectiveMap) {

    }

    protected getCurrentScope() : ScopeStackEntry {
        const node = last(this.scopeStack);
        if (node === undefined) {
            throw new UnexpectedStateError(`ElementWalker should always have at least one scope on the stack.`);
        }
        return node;
    }

    protected addParseResult(context : ElementParserContext, result : SuccessfulParserResult) : void {
        const scopeData = result.scopeData;
        context.isScopeEnd = result.isScopeEnd !== undefined
            ? result.isScopeEnd
            : result.scopeData !== undefined || context.scopeData !== undefined; // by default, end scopes opened on this element.
        context.terminated = context.terminated || result.terminate === true;
        if (scopeData) {
            context.scopeData = result.scopeData;
            if (scopeData.attachToTemplateRoot) {
                if (scopeData.root.type === 'TemplateRootNode') {
                    this.root.children.push(...scopeData.root.children); // unwrap nested TemplateRootNodes
                } else {
                    this.root.children.push(scopeData.root); // this should probably never happen...
                }
            } else {
                this.getCurrentScope().astNode.children.push(...result.nodes);
            }
            // To support multiple scopes being opened on the one element, we'll only keep track of the latest scope
            if (context.node === this.getCurrentScope().element) {
                this.scopeStack.pop();
            }
            this.scopeStack.push({
                element: context.node,
                astNode: scopeData.childParent
            });
        } else {
            this.getCurrentScope().astNode.children.push(...result.nodes);
        }
    }

    protected handleElementDirectiveParseResult(context : ElementParserContext, either : ElementDirectiveParserResult) : void {
        either.bimap(
            (errs) => context.errors.push(...errs),
            (result) => this.addParseResult(context, result)
        );
    }

    protected handleAttributeDirectiveParseResult(context : ElementParserContext, either : ParserResult) : void {
        either.bimap(
            (errs) => context.errors.push(errs),
            (result) => this.addParseResult(context, result)
        );
    }

    protected parseChildren(node : Node | ParentNode, context : ElementParserContext) {
        // Parse children
        if (isParentNode(node)) {
            for (const child of node.childNodes) {
                if (!isNgTemplate(node) || !isTextHtmlNode(child)) { // don't double-parse nested templates
                    this.parseElement(child)
                        .leftMap(
                            (errs) => context.errors.push(...errs)
                        );
                }
            }
        }
    }

    protected identifyDirectives(node : Element) : DirectiveData[] {
        const identifiedDirectives = [];
        const elementDirectiveData : DirectiveData | undefined = this.directives.elements.get(normalize(node.tagName));
        if (elementDirectiveData !== undefined) {
            identifiedDirectives.push(elementDirectiveData);
        }
        for (const attr of node.attrs) {
            const attributeDirective : DirectiveData | undefined = this.directives.attributes.get(normalize(attr.name));
            if (attributeDirective !== undefined) {
                identifiedDirectives.push(attributeDirective);
            }
        }
        return identifiedDirectives.sort(compareDirectivesByPriority);
    }

    protected validateElement(node : Node | Element, context : ElementParserContext, directives : DirectiveData[]) : void {
        if (isTagNode(node)) {
            if (!this.shouldSkipHtmlValidation) {
                const elementDirectiveNames = directives
                    .filter((directive) => directive.canBeElement)
                    .map((directive) => directive.name);
                if (!this.htmlElementNames.has(node.tagName)
                    && elementDirectiveNames.indexOf(normalize(node.tagName)) === -1) {
                    context.errors.push(new HtmlValidationError(`"${ node.tagName }" is an unrecognised HTML tag. Is this a custom directive?`));
                } else {
                    // Check that all attributes in the HTML are recognised
                    const directiveAttributes : string[] = flatten(
                        directives.map((directive) => {
                            const names = [];
                            if (directive.canBeAttribute) {
                                names.push(directive.name);
                            }
                            return names.concat(
                                directive.attributes.map((attrib) => attrib.name)
                            );
                        })
                    );
                    const standardHtmlElementAttributes = new Set(
                        htmlElementAttributes['*']
                            .concat(ariaAttributes)
                            .concat(htmlElementAttributes[node.tagName] || []));
                    const directiveAttributesSet = new Set<string>(directiveAttributes);
                    for (const attribData of node.attrs) {
                        const attrib = attribData.name;
                        if (!standardHtmlElementAttributes.has(attrib)
                            && !directiveAttributesSet.has(normalize(attrib))
                            && !/^(data|ng-attr)-/.test(attrib)) {
                            // If there's an directive directive whose name matches the HTML attribute, but doesn't match
                            //  the normalised HTML attribute name, then the directive attribute name is not normalised.
                            // e.g. given an directive name of "my-directive", HTML attribute "my-directive" will be
                            //  normalised to "myDirective", which doesn't match "my-directive".
                            const miscasedAttributes = directiveAttributes.filter((attr) => attr === attrib);
                            if (miscasedAttributes.length > 0) {
                                context.errors.push(new HtmlValidationError(`Attribute definition for "${ miscasedAttributes[0] }" is kebab-case, but should be camelCase.`));
                            } else {
                                context.errors.push(new HtmlValidationError(`"${ node.tagName }" has an unrecognised attribute "${ attrib }". Is this a directive scope binding?`));
                            }
                        }
                    }
                }
            }

            // Check that each directive has all of its required attributes
            for (const directive of directives) {
                for (const attribute of directive.attributes) {
                    if ((attribute.optional === undefined
                            || attribute.optional === false)
                        && this.findAttributeValue(node, attribute.name) === undefined) {
                        context.errors.push(new HtmlValidationError(`"${ directive.name }" is missing the required attribute "${ attribute.name }".`));
                    }
                }
            }
        }
    }

    protected parseElementDirective(node : Element, context : ElementParserContext, elementDirective : DirectiveData) {
        const elemParser = elementDirective.parser;
        if (elemParser) {
            this.handleElementDirectiveParseResult(
                context,
                elemParser(node, this.directives)
            );
        }
        for (const subAttribEntry of elementDirective.attributes) {
            this.parseDirectiveSubAttribute(node, subAttribEntry, context);
        }
    }

    protected findAttributeValue(node : Element, directiveAttributeName : string) : string | undefined {
        for (const attrib of node.attrs) {
            if (normalize(attrib.name) === directiveAttributeName) {
                return attrib.value;
            }
        }
        return undefined;
    }

    protected parseDirectiveSubAttribute(node : Element, subAttribEntry : DirectiveAttribute, context : ElementParserContext) {
        const subAttribValue = this.findAttributeValue(node, subAttribEntry.name);
        if (subAttribValue === undefined) {
            return;
        }
        switch (subAttribEntry.mode) {
            case undefined:
            case "expression":
                let containingBlock : ScopedBlockNode | undefined;
                if (subAttribEntry.locals && subAttribEntry.locals.length > 0) {
                    containingBlock = scopedBlock(subAttribEntry.locals.map(convertToParameter));
                }
                const parser = subAttribEntry.parser || defaultParser;
                parser(subAttribValue).bimap(
                    (errs) => context.errors.push(errs),
                    (result : SuccessfulParserResult) => {
                        // TODO: make this better
                        if (containingBlock) {
                            containingBlock.children.push(...result.nodes);
                            result.nodes = [containingBlock];
                            if (result.scopeData) {
                                result.scopeData.root = containingBlock;
                            }
                        }
                        this.addParseResult(context, result);
                    }
                );
                context.parsedAttributes.push(subAttribEntry.name);
                break;
            case "interpolated":
                this.handleAttributeDirectiveParseResult(
                    context,
                    parseInterpolatedText(subAttribValue)
                );
                context.parsedAttributes.push(subAttribEntry.name);
                break;
            default:
                assertNever(subAttribEntry.mode);
        }
    }

    protected parseAttributeDirective(node : Element, context : ElementParserContext, attributeDirective : DirectiveData) {
        // Parse attributes of a single directive
        for (const subAttribEntry of attributeDirective.attributes) {
            this.parseDirectiveSubAttribute(node, subAttribEntry, context);
        }
    }

    protected parseNonDirectiveAttributes(node : Element, context : ElementParserContext) {
        // Parse attributes: interpolated text
        for (const attrib of node.attrs) {
            const key = attrib.name;
            if (context.parsedAttributes.indexOf(normalize(key)) === -1) {
                const attribLookup = this.directives.attributes.get(normalize(key));
                const value = attrib.value;
                if (attribLookup && attribLookup.canBeAttribute) {
                    continue;
                } else if (value && value.length > 0 && value.indexOf(interpolationStartSymbol) > -1) {
                    this.handleAttributeDirectiveParseResult(
                        context,
                        parseInterpolatedText(value)
                    );
                }
            }
        }
    }

    protected parseInterpolatedText(node : TextNode, context : ElementParserContext) {
        // Parse interpolated text
        this.handleAttributeDirectiveParseResult(
            context,
            parseInterpolatedText(node.value)
        );
    }

    protected parseDirectives(node : Element, context : ElementParserContext, directiveData : DirectiveData[]) {
        for (const directive of directiveData) {
            if (directive.canBeElement) {
                this.parseElementDirective(node, context, directive);
            } else {
                this.parseAttributeDirective(node, context, directive);
            }
            if (context.terminated) {
                return;
            }
        }
    }

    protected parseElement(node : Node) : Either<AttributeParserError[], void> {
        const context : ElementParserContext = {
            node,
            errors: [],
            parsedAttributes: [],
            scopeData: undefined,
            isScopeEnd: false,
            terminated: false
        };

        if (isTagNode(node)) {
            const directives = this.identifyDirectives(node);
            this.validateElement(node, context, directives);
            this.parseDirectives(node, context, directives);
            if (!context.terminated) {
                this.parseNonDirectiveAttributes(node, context);

                // If this is an SVG element, skip validation for child elements.
                const shouldChildrenSkipHtmlValidation = isSvgNode(node);
                if (shouldChildrenSkipHtmlValidation) {
                    this.shouldSkipHtmlValidation = true;
                }
                this.parseChildren(node, context);
                if (shouldChildrenSkipHtmlValidation) {
                    this.shouldSkipHtmlValidation = false;
                }
            }

            if (context.isScopeEnd) {
                this.scopeStack.pop();
            }
        } else if (isTextHtmlNode(node)) {
            this.parseInterpolatedText(node, context);
        }

        if (context.errors.length > 0) {
            return Either.Left(context.errors);
        } else {
            return Either.Right(undefined);
        }
    }

    walkTemplate(element : Node, scopeInterfaceName : string) : Either<AttributeParserError[], TemplateRootNode> {
        const block = scopedBlock([], [], scopeInterfaceName);
        this.scopeStack.push({
            element,
            astNode: block
        });
        this.root.children.push(block);
        return this.parseElement(element)
            .map(() => this.root);
    }
}

const SANITISING_PATTERN = /[^a-zA-Z0-9]/g;
export function templateIdToInterfaceName(templateId : string) : string {
    return uppercamelcase(templateId.replace(SANITISING_PATTERN, '_')) + 'Scope';
}

function findUnnormalizedAttributeValue(element : Element, attributeName : string) : string | undefined {
    for (const attrib of element.attrs) {
        if (attrib.name === attributeName) {
            return attrib.value;
        }
    }
    return undefined;
}

function isNgTemplate(element : Node | Element) : boolean {
    return isTagNode(element) && findUnnormalizedAttributeValue(element, 'type') === 'text/ng-template';
}

export function parseNgTemplateElement(element : Element, directives : DirectiveMap) : ElementDirectiveParserResult {
    if (!isScriptNode(element)) {
        return Either.Left([new ElementDirectiveParserError(`ng-template parser expected a "script" element, but got "${ element.nodeName }" instead.`)]);
    } else if (findUnnormalizedAttributeValue(element, 'type') !== 'text/ng-template') {
        return Either.Right({
            nodes: []
        });
    } else if (!findUnnormalizedAttributeValue(element, 'id')) {
        return Either.Left([new ElementDirectiveParserError(`ng-template element is missing an "id" attribute.`)]);
    } else {
        if (element.childNodes.length !== 1) {
            return Either.Left([new ElementDirectiveParserError(`ng-template script must have exactly one child node. Found: ${ element.childNodes.length }`)]);
        }
        const childNode = element.childNodes[0];
        if (!isTextHtmlNode(childNode)) {
            return Either.Left([new ElementDirectiveParserError(`ng-template script child node must be a text node.`)]);
        }
        const interfaceName = templateIdToInterfaceName(findUnnormalizedAttributeValue(element, 'id')!);
        const parseResult = parseHtml(asHtmlContents(childNode.value), interfaceName, directives);
        return parseResult.map((rootNode) => {
            return {
                nodes: [rootNode],
                scopeData: {
                    root: rootNode,
                    childParent: rootNode,
                    attachToTemplateRoot: true
                }
            };
        });
    }
}

export function parseFormElement(element : Element, _directives : DirectiveMap) : ElementDirectiveParserResult {
    if (!isFormNode(element)) {
        return Either.Left([new ElementDirectiveParserError(`form parser expected a "form" element, but got "${ element.nodeName }" instead.`)]);
    } else if (!findUnnormalizedAttributeValue(element, 'name')) {
        return Either.Right({
            nodes: []
        });
    } else {
        const formName = findUnnormalizedAttributeValue(element, 'name')!;
        const node = scopedBlock([
            parameter(formName, 'I' + uppercamelcase(formName))
        ]);
        return Either.Right({
            nodes: [node],
            scopeData: {
                root: node,
                childParent: node,
                attachToTemplateRoot: false
            }
        });
    }
}

const inputAttributesMap = new Map<string, string[]>([
    ['ng-true-value', ['checkbox']],
    ['ng-false-value', ['checkbox']],
    ['ng-min', ['date', 'datetime-local', 'month', 'number', 'week']],
    ['ng-max', ['date', 'datetime-local', 'month', 'number', 'week']],
    ['ng-step', ['number']],
]);

export function parseInputElement(element : Element, _directives : DirectiveMap) : ElementDirectiveParserResult {
    const errors : ElementDirectiveParserError[] = [];
    const inputType = findUnnormalizedAttributeValue(element, 'type') || 'text';
    for (const attribData of element.attrs) {
        const attrib = attribData.name;
        const allowedElements = inputAttributesMap.get(attrib);
        if (allowedElements !== undefined) {
            if (allowedElements.indexOf(inputType) === -1) {
                const msg = `input with type "${ inputType }" has attribute "${ attrib }", but this is only allowed on inputs with these types: ${ allowedElements.map(ae => `"${ ae }"`).join(',') }`;
                const err = new ElementDirectiveParserError(msg);
                errors.push(err);
            }
        }
    }
    if (errors.length > 0) {
        return Either.Left(errors);
    } else {
        return Either.Right({ nodes: [] });
    }
}
