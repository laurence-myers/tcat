import * as cheerio from "cheerio";
import * as jade from "jade";
import {GeneratorAstNode, ScopedBlockNode} from "../generator/ast";
import {Either} from "monet";
import {TcatError, TemplateParserError} from "../core";
import {declare, scopedBlock} from "../generator/dsl";
import {parseElement} from "./elements";

export function parseJadeToHtml(contents : string) : Either<TcatError[], string> {
    let html;
    try {
        html = jade.render(contents);
    } catch (err) {
        return Either.Left([new TemplateParserError(err)]);
    }
    return Either.Right(html);
}

export function parseHtml(html : string, scopeInterfaceName : string) : Either<TcatError[], ScopedBlockNode> {
    let $;
    try {
        $ = cheerio.load(html);
    } catch (err) {
        return Either.Left([new TemplateParserError(err)]);
    }
    const result = parseElement($.root().get(0));
    return result.map((nodes) => {
        const initial : GeneratorAstNode[] = [
            declare(`__scope_1`, scopeInterfaceName)
        ];
        return scopedBlock(initial.concat(nodes))
    });
}