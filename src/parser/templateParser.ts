import * as cheerio from "cheerio";
import * as jade from "jade";
import * as pug from "pug";
import {TemplateRootNode} from "../generator/ast";
import {Either} from "monet";
import {asHtmlContents, FileName, HtmlContents, PugContents, TcatError, TemplateParserError} from "../core";
import {parseElement} from "./elements";
import {DirectiveData} from "../directives";

export function parsePugToHtml(contents : PugContents, templateFileName? : FileName) : Either<TcatError[], HtmlContents> {
    let html;
    try {
        // In pug files, "include" statements expect a file extension of .pug. You can work around this by explicitly
        // including the file extension of .jade, but it still emits a warning message to stdout.
        // So, let's just use the legacy module for old ".jade" templates.
        if (templateFileName && templateFileName.toLowerCase().endsWith('.jade')) {
            html = jade.render(contents, {
                filename: templateFileName
            });
        } else {
            html = pug.render(contents, {
                filename: templateFileName
            });
        }
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
    return parseElement($.root().get(0), directives, scopeInterfaceName);
}