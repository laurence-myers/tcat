import * as cheerio from "cheerio";
import * as pug from "pug";
import {TemplateRootNode} from "../generator/ast";
import {Either} from "monet";
import {asHtmlContents, FileName, HtmlContents, PugContents, TcatError, TemplateParserError} from "../core";
import {scopedBlock, templateRoot} from "../generator/dsl";
import {parseElement} from "./elements";
import {DirectiveData} from "../directives";

export function parsePugToHtml(contents : PugContents, templateFileName? : FileName) : Either<TcatError[], HtmlContents> {
    let html;
    try {
        html = pug.render(contents, {
            filename: templateFileName,

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