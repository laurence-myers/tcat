import * as cheerio from "cheerio";
import * as jade from "jade";
import {ScopedBlockNode} from "../generator/ast";
import {Either} from "monet";
import {TcatError, TemplateParserError} from "../core";
import {scopedBlock} from "../generator/dsl";
import {parseElement} from "./elements";

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
    const result = parseElement($.root().get(0));
    return result.map((nodes) => scopedBlock(nodes));
}