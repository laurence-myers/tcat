import {defaultParser, parseInterpolatedText, ParserResult, ScopeData, SuccessfulParserResult} from "../parsers";
import {Either} from "monet";
import {asHtmlContents, AttributeParserError, ElementDirectiveParserError, TcatError} from "../core";
import {HasChildrenAstNode, ParameterNode, ScopedBlockNode, TemplateRootNode} from "../generator/ast";
import {DirectiveAttribute, DirectiveData, DirectiveMap} from "../directives";
import * as uppercamelcase from "uppercamelcase";
import {parseHtml} from "./templateParser";
import {parameter, scopedBlock, templateRoot} from "../generator/dsl";

export type ElementDirectiveParserResult = Either<TcatError[], SuccessfulParserResult>
export type ElementDirectiveParser = (element : CheerioElement, directives : Map<string, DirectiveData>) => ElementDirectiveParserResult;

interface TextHtmlNode extends CheerioElement {
    type : 'text';
    data : string;
}

function isTextHtmlNode(node : CheerioElement) : node is TextHtmlNode {
    return node.type == 'text';
}

interface ScriptNode extends CheerioElement {
    type : 'script';
}

function isScriptNode(node : CheerioElement) : node is ScriptNode {
    return node.type == 'script';
}

interface FormNode extends CheerioElement {
    type : 'tag';
    tagName : 'form';
}

function isFormNode(node : CheerioElement) : node is FormNode {
    return node.type == 'tag' && node.tagName == 'form';
}

const interpolationStartSymbol = '{{'; // TODO: make this configurable

interface ElementParserContext {
    readonly errors : AttributeParserError[];
    scopeData : ScopeData | undefined;
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

    constructor(
        protected readonly directives : DirectiveMap) {

    }

    protected getCurrentScope() : HasChildrenAstNode {
        return this.scopeStack[this.scopeStack.length - 1];
    }

    protected addParseResult(context : ElementParserContext, result : SuccessfulParserResult) : void {
        const scopeData = result.scopeData;
        if (scopeData) {
            context.scopeData = result.scopeData;
            if (scopeData.attachToTemplateRoot) {
                if (scopeData.root.type == 'TemplateRootNode') {
                    this.root.children.push(...scopeData.root.children); // unwrap nested TemplateRootNodes
                } else {
                    this.root.children.push(scopeData.root); // this should probably never happen...
                }
            } else {
                this.getCurrentScope().children.push(...result.nodes);
            }
            if (scopeData.isStart) {
                this.scopeStack.push(scopeData.childParent);
            }
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

    protected parseElementDirective(node : CheerioElement, context : ElementParserContext) {
        // Parse element directives
        const tagLookup = this.directives.get(node.tagName);
        if (tagLookup && tagLookup.canBeElement) {
            const elemParser = tagLookup.parser;
            if (elemParser) {
                this.handleElementDirectiveParseResult(
                    context,
                    elemParser(node, this.directives)
                );
            }
            for (const subAttribEntry of tagLookup.attributes) {
                this.parseDirectiveSubAttribute(node, subAttribEntry, context);
            }
        }
    }

    protected parseDirectiveSubAttribute(node : CheerioElement, subAttribEntry : DirectiveAttribute, context : ElementParserContext) {
        const subAttribValue = node.attribs[subAttribEntry.name];
        let containingBlock : ScopedBlockNode | undefined;
        if (subAttribEntry.locals && subAttribEntry.locals.length > 0) {
            containingBlock = scopedBlock(subAttribEntry.locals.map(convertToParameter));
        }
        const parser = subAttribEntry.parser || defaultParser;
        return parser(subAttribValue).bimap(
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
    }

    protected parseDirectiveAttributes(node : CheerioElement, context : ElementParserContext) {
        // Parse attributes: directives and interpolated text
        for (const key in node.attribs) {
            const attribLookup = this.directives.get(key);
            const value = node.attribs[key];
            if (attribLookup && attribLookup.canBeAttribute) {
                for (const subAttribEntry of attribLookup.attributes) {
                    this.parseDirectiveSubAttribute(node, subAttribEntry, context);
                }
            } else if (value && value.length > 0 && value.indexOf(interpolationStartSymbol) > -1) {
                this.handleAttributeDirectiveParseResult(
                    context,
                    parseInterpolatedText(value)
                );
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

    protected parseElement(node : CheerioElement) : Either<AttributeParserError[], void> {
        const context : ElementParserContext = {
            errors: [],
            scopeData: undefined
        };

        this.parseElementDirective(node, context);
        this.parseDirectiveAttributes(node, context);
        this.parseInterpolatedText(node, context);
        this.parseChildren(node, context);

        if (context.scopeData) {
            if (context.scopeData.isStart) {
                if (context.scopeData.attachToTemplateRoot) {

                }
                if (!context.scopeData.isEnd) {
                    this.scopeStack.push(context.scopeData.childParent);
                }
            } else if (context.scopeData.isEnd) {
                this.scopeStack.pop();
            }
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
    return element.attribs.type === 'text/ng-template'
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
        if (element.children.length != 1) {
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
                    isStart: true,
                    isEnd: true,
                    root: rootNode,
                    childParent: rootNode,
                    attachToTemplateRoot: true
                }
            };
        });
    }
}

export function parseFormElement(element : CheerioElement, _directives : Map<string, DirectiveData>) : ElementDirectiveParserResult {
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
                isStart: true,
                isEnd: true,
                root: node,
                childParent: node,
                attachToTemplateRoot: false
            }
        });
    }
}
