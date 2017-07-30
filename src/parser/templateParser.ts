import * as cheerio from "cheerio";
import * as jade from "jade";
import {directiveMap} from "../directives";
import {GeneratorNonRootAstNode, RootNode} from "../generator/ast";
import {root} from "../generator/dsl";
import {Either} from "monet";
import {ParserError} from "../core";

function processNode(node : CheerioElement) : Either<ParserError[], GeneratorNonRootAstNode[]> {
    const errors : ParserError[] = [];
    const output : GeneratorNonRootAstNode[] = [];
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
            result.bimap((err) => errors.push(err), (astNodes) => output.push(...astNodes));
        }
    }
    // Parse children
    if (node.children) {
        for (const child of node.children) {
            processNode(child)
                .bimap(
                    (errs) => errors.push(...errs),
                        (nodes) => output.push(...nodes)
                );
        }
    }
    if (errors.length > 0) {
        return Either.Left(errors);
    } else {
        return Either.Right(output);
    }
}

export function parseJade(contents : string) : Either<ParserError[], RootNode> {
    try {
        jade.render(contents);
    } catch (err) {
        return Either.Left([new ParserError(err)]);
    }
    return parseHtml(contents);
}

export function parseHtml(html : string) : Either<ParserError[], RootNode> {
    const $ = cheerio.load(html);
    const result = processNode($.root().get(0));
    return result.map((nodes) => root(...nodes));
}