import {parseInterpolatedText, ParserResult, ScopeData, SuccessfulParserResult} from "../parsers";
import {Either} from "monet";
import {AttributeParserError, ElementDirectiveParserError, TcatError} from "../core";
import {GeneratorAstNode} from "../generator/ast";
import {directiveMap} from "../directives";
import * as uppercamelcase from "uppercamelcase";
import {parseHtml} from "./templateParser";

export type ElementDirectiveParserResult = Either<TcatError[], SuccessfulParserResult>
export type ElementDirectiveParser = (element : CheerioElement) => ElementDirectiveParserResult;

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

const interpolationStartSymbol = '{{'; // TODO: make this configurable

interface ElementParserContext {
    readonly errors : AttributeParserError[];
    readonly siblings : GeneratorAstNode[];
    readonly children : GeneratorAstNode[];
    scopeData : ScopeData | undefined;
}

function addParseResultToContext(context : ElementParserContext, result : SuccessfulParserResult) {
    if (result.scopeData) {
        context.scopeData = result.scopeData;
        const siblingsToAdd = result.nodes.slice();
        siblingsToAdd.splice(siblingsToAdd.indexOf(context.scopeData.root), 1);
    } else {
        context.siblings.push(...result.nodes);
    }
}

function handleElementDirectiveParseResult(context : ElementParserContext, either : ElementDirectiveParserResult) {
    return either.bimap(
        (errs) => context.errors.push(...errs),
        (result) => addParseResultToContext(context, result)
    );
}

function handleAttributeDirectiveParseResult(context : ElementParserContext, either : ParserResult) {
    return either.bimap(
        (errs) => context.errors.push(errs),
        (result) => addParseResultToContext(context, result)
    );
}

export function parseElement(node : CheerioElement) : Either<AttributeParserError[], GeneratorAstNode[]> {
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
                parseElement(child)
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
    const tagLookup = directiveMap.get(node.tagName);
    if (tagLookup && tagLookup.canBeElement) {
        const elemParser = tagLookup.parser;
        if (elemParser) {
            handleElementDirectiveParseResult(
                context,
                elemParser(node)
            );
        }
        for (const subAttribEntry of tagLookup.attributes) {
            const subAttribValue = node.attribs[subAttribEntry.name];
            handleAttributeDirectiveParseResult(
                context,
                subAttribEntry.parser(subAttribValue)
            );
        }
    }
    // Parse attributes: directives and interpolated text
    for (const key in node.attribs) {
        const attribLookup = directiveMap.get(key);
        const value = node.attribs[key];
        if (attribLookup && attribLookup.canBeAttribute) {
            for (const subAttribEntry of attribLookup.attributes) {
                const subAtribValue = node.attribs[subAttribEntry.name];
                handleAttributeDirectiveParseResult(
                    context,
                    subAttribEntry.parser(subAtribValue)
                );
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
        output.push(context.scopeData.root);
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

export function parseNgTemplateElement(element : CheerioElement) : ElementDirectiveParserResult {
    if (!isScriptNode(element)) {
        return Either.Left([new ElementDirectiveParserError(`ng-template parse expected a "script" element, but got "${ element.type }" instead.`)]);
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
        const parseResult = parseHtml(childNode.data, interfaceName);
        return parseResult.map((container) => {
            return {
                nodes: [container],
                scopeData: {
                    isStart : true,
                    isEnd : true,
                    root : container,
                    childParent : container
                }
            };
        });
    }
}
