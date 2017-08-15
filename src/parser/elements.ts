import {parseInterpolatedText, ScopeData, SuccessfulParserResult} from "../parsers";
import {Either} from "monet";
import {AttributeParserError, ElementDirectiveParserError} from "../core";
import {GeneratorAstNode} from "../generator/ast";
import {directiveMap} from "../directives";
import {declare, scopedBlock} from "../generator/dsl";
import * as uppercamelcase from "uppercamelcase";

export type ElementDirectiveParserResult = Either<ElementDirectiveParserError, SuccessfulParserResult>
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

// export function singleAttributeParser(attributeName : string, attributeParser? : AttributeParser) : ElementParser {
//     return (element : CheerioElement) : ParserResult => {
//         const attrib = element.attribs[attributeName];
//         if (attrib == undefined) {
//             return Either.Left(new AttributeParserError(`Element is missing expected attribute: ${ attributeName }`));
//         } else if (attributeParser) {
//             return attributeParser(attrib);
//         } else {
//             return defaultParser(attrib);
//         }
//     };
// }

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
        for (const subAttribEntry of tagLookup.attributes) {
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
        return Either.Left(new ElementDirectiveParserError(`ng-template parse expected a "script" element, but got "${ element.type }" instead.`));
    } else if (element.attribs.type !== 'text/ng-template') {
        return Either.Right({
            nodes: []
        });
    } else if (!element.attribs.id) {
        return Either.Left(new ElementDirectiveParserError(`ng-template element is missing an "id" attribute.`));
    } else {
        const container = scopedBlock([
            declare(`__scope_1`, templateIdToInterfaceName(element.attribs.id))
        ]);
        return Either.Right({
            nodes: [container],
            scopeData: {
                isStart : true,
                isEnd : true,
                root : container,
                childParent : container
            }
        });
    }
}
