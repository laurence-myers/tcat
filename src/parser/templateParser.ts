import * as cheerio from "cheerio";
import * as jade from "jade";
import {directiveMap} from "../directives";
import {GeneratorAstNode, ScopedBlockNode} from "../generator/ast";
import {Either} from "monet";
import {AttributeParserError, TcatError, TemplateParserError} from "../core";
import {scopedBlock} from "../generator/dsl";

function processNode(node : CheerioElement) : Either<AttributeParserError[], GeneratorAstNode[]> {
    const errors : AttributeParserError[] = [];
    const output : GeneratorAstNode[] = [];
    let scopedBlock : ScopedBlockNode | undefined;
    // Parse element directives
    const tagLookup = directiveMap.get(node.tagName);
    if (tagLookup && tagLookup.canBeElement) {
        throw new Error(`TODO`);
    }
    // Parse attribute directives
    for (const key in node.attribs) {
        const attribLookup = directiveMap.get(key);
        if (attribLookup && attribLookup.canBeAttribute) {
            const value = node.attribs[key];
            console.log(value);
            const result = attribLookup.parser(value);
            result.bimap((err) => errors.push(err), (astNodes) => {
                if (astNodes && astNodes.length == 1) {
                    const firstNode = astNodes[0];
                    if (firstNode.type == "ScopedBlockNode") {
                        scopedBlock = firstNode;
                    }
                }
                output.push(...astNodes)
            });
        }
    }
    // Parse children
    if (node.children) {
        for (const child of node.children) {
            processNode(child)
                .bimap(
                    (errs) => errors.push(...errs),
                        (nodes) => {
                            if (scopedBlock) {
                                scopedBlock.children.push(...nodes);
                            } else {
                                output.push(...nodes)
                            }
                        }
                );
        }
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