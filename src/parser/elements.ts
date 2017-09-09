import {defaultParser, parseInterpolatedText, ParserResult, ScopeData, SuccessfulParserResult} from "./attributes";
import {Either} from "monet";
import {
    asHtmlContents, assertNever,
    AttributeParserError,
    ElementDirectiveParserError, flatten, HtmlValidationError,
    last,
    TcatError,
    UnexpectedStateError
} from "../core";
import {HasChildrenAstNode, ParameterNode, ScopedBlockNode, TemplateRootNode} from "../generator/ast";
import {DirectiveAttribute, DirectiveData, DirectiveMap, normalize} from "../directives";
import * as uppercamelcase from "uppercamelcase";
import {parseHtml} from "./templateParser";
import {parameter, scopedBlock, templateRoot} from "../generator/dsl";
const htmlTagNames : string[] = require("html-tag-names");
const htmlElementAttributes : { [key : string] : string[] } = require("html-element-attributes");
const ariaAttributes : string[] = require("aria-attributes");

export type ElementDirectiveParserResult = Either<TcatError[], SuccessfulParserResult>;
export type ElementDirectiveParser = (element : CheerioElement, directives : Map<string, DirectiveData>) => ElementDirectiveParserResult;

interface TextHtmlNode extends CheerioElement {
    type : 'text';
    data : string;
}

function isTextHtmlNode(node : CheerioElement) : node is TextHtmlNode {
    return node.type === 'text';
}

interface ScriptNode extends CheerioElement {
    type : 'script';
}

function isScriptNode(node : CheerioElement) : node is ScriptNode {
    return node.type === 'script';
}

interface FormNode extends CheerioElement {
    type : 'tag';
    tagName : 'form';
}

function isFormNode(node : CheerioElement) : node is FormNode {
    return node.type === 'tag' && node.tagName === 'form';
}

interface SvgNode extends CheerioElement {
    type : 'tag';
    tagName : 'svg';
}

function isSvgNode(node : CheerioElement) : node is SvgNode {
    return node.type === 'tag' && node.tagName === 'svg';
}

const interpolationStartSymbol = '{{'; // TODO: make this configurable

export interface ElementParserContext {
    readonly errors : AttributeParserError[];
    readonly parsedAttributes : string[];
    scopeData : ScopeData | undefined;
    isScopeEnd : boolean;
}

function convertToParameter(entry : { name : string; type : string }) : ParameterNode {
    return parameter(entry.name, entry.type);
}

export function parseElement(element : CheerioElement, directives : DirectiveMap, scopeInterfaceName : string) {
    const walker = new ElementWalker(directives);
    return walker.walkTemplate(element, scopeInterfaceName);
}

export class ElementWalker {
    protected root : TemplateRootNode = templateRoot();
    protected readonly scopeStack : HasChildrenAstNode[] = [];
    protected readonly htmlElementNames : Set<string> = new Set<string>(htmlTagNames);
    protected shouldSkipHtmlValidation = false;

    constructor(
        protected readonly directives : DirectiveMap) {

    }

    protected getCurrentScope() : HasChildrenAstNode {
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
        if (scopeData) {
            context.scopeData = result.scopeData;
            if (scopeData.attachToTemplateRoot) {
                if (scopeData.root.type === 'TemplateRootNode') {
                    this.root.children.push(...scopeData.root.children); // unwrap nested TemplateRootNodes
                } else {
                    this.root.children.push(scopeData.root); // this should probably never happen...
                }
            } else {
                this.getCurrentScope().children.push(...result.nodes);
            }
            this.scopeStack.push(scopeData.childParent);
        } else {
            this.getCurrentScope().children.push(...result.nodes);
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

    protected parseChildren(node : CheerioElement, context : ElementParserContext) {
        // Parse children
        if (node.children) {
            for (const child of node.children) {
                if (!isNgTemplate(node) || !isTextHtmlNode(child)) { // don't double-parse nested templates
                    this.parseElement(child)
                        .leftMap(
                            (errs) => context.errors.push(...errs)
                        );
                }
            }
        }
    }

    protected identifyDirectives(node : CheerioElement) : DirectiveData[] {
        const directivesToParse = [];
        const elementDirectiveData : DirectiveData | undefined = this.directives.get(normalize(node.tagName));
        if (elementDirectiveData !== undefined
            && elementDirectiveData.canBeElement) {
            directivesToParse.push(elementDirectiveData);
        }
        for (const key in node.attribs) {
            const attributeDirective : DirectiveData | undefined = this.directives.get(normalize(key));
            if (attributeDirective
                && attributeDirective.canBeAttribute) {
                directivesToParse.push(attributeDirective);
            }
        }
        return directivesToParse.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    protected validateElement(node : CheerioElement, context : ElementParserContext, directives : DirectiveData[]) : void {
        if (node.type === 'tag') {
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
                    for (const attrib in node.attribs) {
                        if (!standardHtmlElementAttributes.has(attrib)
                            && !directiveAttributesSet.has(normalize(attrib))
                            && !attrib.startsWith('data-')) {
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

    protected parseElementDirective(node : CheerioElement, context : ElementParserContext, elementDirective : DirectiveData) {
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

    protected findAttributeValue(node : CheerioElement, directiveAttributeName : string) : string | undefined {
        for (const attribName in node.attribs) {
            if (normalize(attribName) == directiveAttributeName) {
                return node.attribs[attribName];
            }
        }
        return undefined;
    }

    protected parseDirectiveSubAttribute(node : CheerioElement, subAttribEntry : DirectiveAttribute, context : ElementParserContext) {
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

    protected parseAttributeDirective(node : CheerioElement, context : ElementParserContext, attributeDirective : DirectiveData) {
        // Parse attributes of a single directive
        for (const subAttribEntry of attributeDirective.attributes) {
            this.parseDirectiveSubAttribute(node, subAttribEntry, context);
        }
    }

    protected parseNonDirectiveAttributes(node : CheerioElement, context : ElementParserContext) {
        // Parse attributes: interpolated text
        for (const key in node.attribs) {
            if (context.parsedAttributes.indexOf(normalize(key)) === -1) {
                const attribLookup = this.directives.get(key);
                const value = node.attribs[key];
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

    protected parseInterpolatedText(node : CheerioElement, context : ElementParserContext) {
        // Parse interpolated text
        if (isTextHtmlNode(node)) {
            this.handleAttributeDirectiveParseResult(
                context,
                parseInterpolatedText(node.data)
            );
        }
    }

    protected parseDirectives(node : CheerioElement, context : ElementParserContext, directiveData : DirectiveData[]) {
        for (const directive of directiveData) {
            if (directive.canBeElement) {
                this.parseElementDirective(node, context, directive);
            } else {
                this.parseAttributeDirective(node, context, directive);
            }
        }
    }

    protected parseElement(node : CheerioElement) : Either<AttributeParserError[], void> {
        const context : ElementParserContext = {
            errors: [],
            parsedAttributes: [],
            scopeData: undefined,
            isScopeEnd: false
        };

        const directives = this.identifyDirectives(node);
        this.validateElement(node, context, directives);
        this.parseDirectives(node, context, directives);
        this.parseNonDirectiveAttributes(node, context);
        this.parseInterpolatedText(node, context);
        // If this is an SVG element, skip validation for child elements.
        const shouldChildrenSkipHtmlValidation = isSvgNode(node);
        if (shouldChildrenSkipHtmlValidation) {
            this.shouldSkipHtmlValidation = true;
        }
        this.parseChildren(node, context);
        if (shouldChildrenSkipHtmlValidation) {
            this.shouldSkipHtmlValidation = false;
        }

        if (context.isScopeEnd) {
            this.scopeStack.pop();
        }
        if (context.errors.length > 0) {
            return Either.Left(context.errors);
        } else {
            return Either.Right(undefined);
        }
    }

    walkTemplate(element : CheerioElement, scopeInterfaceName : string) : Either<AttributeParserError[], TemplateRootNode> {
        const block = scopedBlock([], [], scopeInterfaceName);
        this.scopeStack.push(block);
        this.root.children.push(block);
        return this.parseElement(element)
            .map(() => this.root);
    }
}

const SANITISING_PATTERN = /[^a-zA-Z0-9]/g;
export function templateIdToInterfaceName(templateId : string) : string {
    return uppercamelcase(templateId.replace(SANITISING_PATTERN, '_')) + 'Scope';
}

function isNgTemplate(element : CheerioElement) : boolean {
    return element.attribs.type === 'text/ng-template';
}

export function parseNgTemplateElement(element : CheerioElement, directives : Map<string, DirectiveData>) : ElementDirectiveParserResult {
    if (!isScriptNode(element)) {
        return Either.Left([new ElementDirectiveParserError(`ng-template parser expected a "script" element, but got "${ element.type }" instead.`)]);
    } else if (element.attribs.type !== 'text/ng-template') {
        return Either.Right({
            nodes: []
        });
    } else if (!element.attribs.id) {
        return Either.Left([new ElementDirectiveParserError(`ng-template element is missing an "id" attribute.`)]);
    } else {
        if (element.children.length !== 1) {
            return Either.Left([new ElementDirectiveParserError(`ng-template script must have exactly one child node. Found: ${ element.children.length }`)]);
        }
        const childNode = element.children[0];
        if (!isTextHtmlNode(childNode)) {
            return Either.Left([new ElementDirectiveParserError(`ng-template script child node must be a text node.`)]);
        }
        const interfaceName = templateIdToInterfaceName(element.attribs.id);
        const parseResult = parseHtml(asHtmlContents(childNode.data), interfaceName, directives);
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

export function parseFormElement(element : CheerioElement, _directives : DirectiveMap) : ElementDirectiveParserResult {
    if (!isFormNode(element)) {
        return Either.Left([new ElementDirectiveParserError(`form parser expected a "form" element, but got "${ element.type }" instead.`)]);
    } else if (!element.attribs.name) {
        return Either.Right({
            nodes: []
        });
    } else {
        const node = scopedBlock([
            parameter(element.attribs.name, 'I' + uppercamelcase(element.attribs.name))
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
