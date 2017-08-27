import {defaultParser, parseInterpolatedText, ParserResult, ScopeData, SuccessfulParserResult} from "../parsers";
import {Either} from "monet";
import {asHtmlContents, AttributeParserError, ElementDirectiveParserError, TcatError} from "../core";
import {GeneratorAstNode, HasChildrenAstNode, ParameterNode, ScopedBlockNode} from "../generator/ast";
import {DirectiveAttribute, DirectiveData} from "../directives";
import * as uppercamelcase from "uppercamelcase";
import {parseHtml} from "./templateParser";
import {parameter, scopedBlock} from "../generator/dsl";

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
    type : 'form';
}

function isFormNode(node : CheerioElement) : node is FormNode {
    return node.type == 'tag' && node.tagName == 'form';
}

const interpolationStartSymbol = '{{'; // TODO: make this configurable

interface ElementParserContext {
    readonly errors : AttributeParserError[];
    readonly siblings : GeneratorAstNode[];
    readonly children : GeneratorAstNode[];
    scopeData : ScopeData | undefined;
}

function addParseResultToContext(context : ElementParserContext, result : SuccessfulParserResult) : void {
    if (result.scopeData) {
        context.scopeData = result.scopeData;
        const siblingsToAdd = result.nodes.slice();
        siblingsToAdd.splice(siblingsToAdd.indexOf(context.scopeData.root), 1);
    } else {
        context.siblings.push(...result.nodes);
    }
}

function handleElementDirectiveParseResult(context : ElementParserContext, either : ElementDirectiveParserResult) : void {
    either.bimap(
        (errs) => context.errors.push(...errs),
        (result) => addParseResultToContext(context, result)
    );
}

function handleAttributeDirectiveParseResult(context : ElementParserContext, either : ParserResult) : void {
    either.bimap(
        (errs) => context.errors.push(errs),
        (result) => addParseResultToContext(context, result)
    );
}

function convertToParameter(entry : { name : string; type : string }) : ParameterNode {
    return parameter(entry.name, entry.type);
}

function parseDirectiveSubAttribute(node : CheerioElement, subAttribEntry : DirectiveAttribute, context : ElementParserContext) {
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
            addParseResultToContext(context, result);
        }
    );
}

export function parseElement(node : CheerioElement, root : HasChildrenAstNode, directives : Map<string, DirectiveData>) : Either<AttributeParserError[], GeneratorAstNode[]> {
    const context : ElementParserContext = {
        errors: [],
        siblings: [],
        children: [],
        scopeData: undefined
    };
    // Parse children
    if (node.children) {
        for (const child of node.children) {
            if (!isNgTemplate(node) || !isTextHtmlNode(child)) { // don't double-parse nested templates
                parseElement(child, root, directives)
                    .bimap(
                        (errs) => context.errors.push(...errs),
                        (nodes) => {
                            context.children.push(...nodes);
                        }
                    );
            }
        }
    }
    // Parse element directives
    const tagLookup = directives.get(node.tagName);
    if (tagLookup && tagLookup.canBeElement) {
        const elemParser = tagLookup.parser;
        if (elemParser) {
            handleElementDirectiveParseResult(
                context,
                elemParser(node, directives)
            );
        }
        for (const subAttribEntry of tagLookup.attributes) {
            parseDirectiveSubAttribute(node, subAttribEntry, context);
        }
    }
    // Parse attributes: directives and interpolated text
    for (const key in node.attribs) {
        const attribLookup = directives.get(key);
        const value = node.attribs[key];
        if (attribLookup && attribLookup.canBeAttribute) {
            for (const subAttribEntry of attribLookup.attributes) {
                parseDirectiveSubAttribute(node, subAttribEntry, context);
            }
        } else if (value && value.length > 0 && value.indexOf(interpolationStartSymbol) > -1) {
            handleAttributeDirectiveParseResult(
                context,
                parseInterpolatedText(value)
            );
        }
    }
    // Parse interpolated text
    if (isTextHtmlNode(node)) {
        handleAttributeDirectiveParseResult(
            context,
            parseInterpolatedText(node.data)
        );
    }

    let output : GeneratorAstNode[] = [];
    let arrayToAddChildren;
    if (context.scopeData) {
        if (context.scopeData.attachToRoot) {
            if (context.scopeData.root.type == 'TemplateRootNode') {
                root.children.push(...context.scopeData.root.children); // unwrap nested TemplateRootNodes
            } else {
                root.children.push(context.scopeData.root); // this should probably never happen...
            }
        } else {
            output.push(context.scopeData.root);
        }
        arrayToAddChildren = context.scopeData.childParent.children;
    } else {
        arrayToAddChildren = output;
    }
    arrayToAddChildren.push(...context.siblings);
    arrayToAddChildren.push(...context.children);
    if (context.errors.length > 0) {
        return Either.Left(context.errors);
    } else {
        return Either.Right(output);
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
                    attachToRoot: true
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
            parameter(element.attribs.name, 'IFormController') // TODO: import this interface
        ]);
        return Either.Right({
            nodes: [node],
            scopeData: {
                isStart: true,
                isEnd: true,
                root: node,
                childParent: node,
                attachToRoot: false
            }
        });
    }
}