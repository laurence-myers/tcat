import * as cheerio from "cheerio";
import * as jade from "jade";
import {directiveMap} from "../directives";
import {GeneratorAstNode, ScopedBlockNode} from "../generator/ast";
import {Either} from "monet";
import {AttributeParserError, TcatError, TemplateParserError} from "../core";
import {scopedBlock} from "../generator/dsl";
import {ScopeData} from "../parsers";

function processNode(node : CheerioElement) : Either<AttributeParserError[], GeneratorAstNode[]> {
    const errors : AttributeParserError[] = [];
    const siblings : GeneratorAstNode[] = [];
    const children : GeneratorAstNode[] = [];
    // Parse children
    if (node.children) {
        for (const child of node.children) {
            processNode(child)
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
        throw new Error(`TODO`);
    }
    // Parse attribute directives
    let scopeData : ScopeData | undefined;
    for (const key in node.attribs) {
        const attribLookup = directiveMap.get(key);
        if (attribLookup && attribLookup.canBeAttribute) {
            const value = node.attribs[key];
            console.log(value);
            const either = attribLookup.parser(value);
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

export function parseJade(contents : string) : Either<TcatError[], ScopedBlockNode> {
    try {
        jade.render(contents);
    } catch (err) {
        return Either.Left([new TemplateParserError(err)]);
    }
    return parseHtml(contents);
}

export function parseHtml(html : string) : Either<TcatError[], ScopedBlockNode> {
    let $;
    try {
        $ = cheerio.load(html);
    } catch (err) {
        return Either.Left([new TemplateParserError(err)]);
    }
    const result = processNode($.root().get(0));
    return result.map((nodes) => scopedBlock(nodes));
}