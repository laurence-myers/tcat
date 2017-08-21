import * as cheerio from "cheerio";
import * as jade from "jade";
import {TemplateRootNode} from "../generator/ast";
import {Either} from "monet";
import {asHtmlContents, HtmlContents, TcatError, TemplateParserError} from "../core";
import {scopedBlock, templateRoot} from "../generator/dsl";
import {parseElement} from "./elements";
import {DirectiveData} from "../directives";

export function parseJadeToHtml(contents : string) : Either<TcatError[], HtmlContents> {
    let html;
    try {
        html = jade.render(contents);
    } catch (err) {
        return Either.Left([new TemplateParserError(err)]);
    }
    return Either.Right(asHtmlContents(html));
}

export function parseHtml(html : string, scopeInterfaceName : string, directives : Map<string, DirectiveData>) : Either<TcatError[], TemplateRootNode> {
    let $;
    try {
        $ = cheerio.load(html);
    } catch (err) {
        return Either.Left([new TemplateParserError(err)]);
    }
    const rootAstNode = templateRoot();
    return parseElement($.root().get(0), rootAstNode, directives)
        .map((nodes) => {
            const block = scopedBlock(nodes, scopeInterfaceName);
            rootAstNode.children.unshift(block);
            return rootAstNode;
        });
}