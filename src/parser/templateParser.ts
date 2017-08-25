import * as cheerio from "cheerio";
import * as jade from "jade";
import {TemplateRootNode} from "../generator/ast";
import {Either} from "monet";
import {asHtmlContents, FileName, HtmlContents, JadeContents, TcatError, TemplateParserError} from "../core";
import {scopedBlock, templateRoot} from "../generator/dsl";
import {parseElement} from "./elements";
import {DirectiveData} from "../directives";

export function parseJadeToHtml(contents : JadeContents, templateFileName? : FileName) : Either<TcatError[], HtmlContents> {
    let html;
    try {
        html = jade.render(contents, {
            filename: templateFileName
        });
    } catch (err) {
        return Either.Left([new TemplateParserError(err)]);
    }
    return Either.Right(asHtmlContents(html));
}

export function parseHtml(html : HtmlContents, scopeInterfaceName : string, directives : Map<string, DirectiveData>) : Either<TcatError[], TemplateRootNode> {
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