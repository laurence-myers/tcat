import {parseInterpolatedText, ScopeData, SuccessfulParserResult} from "../parsers";
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

export function parseElement(node : CheerioElement) : Either<AttributeParserError[], GeneratorAstNode[]> {
    const errors : AttributeParserError[] = [];
    const siblings : GeneratorAstNode[] = [];
    const children : GeneratorAstNode[] = [];
    let scopeData : ScopeData | undefined;
    // Parse children
    if (node.children) {
        for (const child of node.children) {
            parseElement(child)
                .bimap(
                    (errs) => errors.push(...errs),
                    (nodes) => {
                        children.push(...nodes);
                    }
                );
        }
    }
    // Parse element directives
    const tagLookup = directiveMap.get(node.tagName);
    if (tagLookup && tagLookup.canBeElement) {
        const elemParser = tagLookup.parser;
        if (elemParser) {
            const either = elemParser(node);
            either.bimap((errs) => errors.push(...errs), (result) => {
                if (result.scopeData) {
                    scopeData = result.scopeData;
                    const siblingsToAdd = result.nodes.slice();
                    siblingsToAdd.splice(siblingsToAdd.indexOf(scopeData.root), 1);
                } else {
                    siblings.push(...result.nodes);
                }
            });
        }
        for (const subAttribEntry of tagLookup.attributes) {
            const subAttribValue = node.attribs[subAttribEntry.name];
            const either = subAttribEntry.parser(subAttribValue);
            either.bimap((err) => errors.push(err), (result) => {
                if (result.scopeData) {
                    scopeData = result.scopeData;
                    const siblingsToAdd = result.nodes.slice();
                    siblingsToAdd.splice(siblingsToAdd.indexOf(scopeData.root), 1);
                } else {
                    siblings.push(...result.nodes);
                }
            });
        }
    }
    // Parse attributes: directives and interpolated text
    for (const key in node.attribs) {
        const attribLookup = directiveMap.get(key);
        const value = node.attribs[key];
        if (attribLookup && attribLookup.canBeAttribute) {
            for (const subAttribEntry of attribLookup.attributes) {
                const subAtribValue = node.attribs[subAttribEntry.name];
                const either = subAttribEntry.parser(subAtribValue);
                either.bimap((err) => errors.push(err), (result) => {
                    if (result.scopeData) {
                        scopeData = result.scopeData;
                        const siblingsToAdd = result.nodes.slice();
                        siblingsToAdd.splice(siblingsToAdd.indexOf(scopeData.root), 1);
                    } else {
                        siblings.push(...result.nodes);
                    }
                });
            }
        } else if (value && value.length > 0 && value.indexOf(interpolationStartSymbol) > -1) {
            const either = parseInterpolatedText(value);
            either.bimap((err) => errors.push(err), (result) => {
                siblings.push(...result.nodes);
            });
        }
    }
    // Parse interpolated text
    if (isTextHtmlNode(node)) {
        const either = parseInterpolatedText(node.data);
        either.bimap((err) => errors.push(err), (result) => {
            children.push(...result.nodes);
        });
    }

    let output = [];
    if (scopeData) {
        output.push(scopeData.root);
        scopeData.childParent.children.push(...siblings);
        scopeData.childParent.children.push(...children);
    } else {
        output.push(...siblings);
        output.push(...children);
    }
    if (errors.length > 0) {
        return Either.Left(errors);
    } else {
        return Either.Right(output);
    }
}

const SANITISING_PATTERN = /[^a-zA-Z0-9]/g;
export function templateIdToInterfaceName(templateId : string) : string {
    return uppercamelcase(templateId.replace(SANITISING_PATTERN, '_')) + 'Scope';
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
