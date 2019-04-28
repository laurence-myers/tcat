import * as jade from "jade";
import * as pug from "pug";
import {TemplateRootNode} from "../generator/ast";
import {Either} from "monet";
import {
    asHtmlContents,
    HtmlContents,
    PugContents,
    PugFileName,
    TcatError,
    TemplateParserError
} from "../core";
import {parseElement} from "./elements";
import {DirectiveMap} from "../directives";
import {AST, parse as parseHtmlDocument} from "parse5";

export function parsePugToHtml(contents : PugContents, templateFileName? : PugFileName) : Either<TcatError[], HtmlContents> {
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

export function parseHtml(html : HtmlContents, scopeInterfaceName : string, directives : DirectiveMap) : Either<TcatError[], TemplateRootNode> {
    let document : AST.Default.Document;
    try {
        document = <AST.Default.Document> parseHtmlDocument(html);
    } catch (err) {
        return Either.Left([new TemplateParserError(err)]);
    }
    const htmlNode = document.childNodes.find((node) => node.nodeName === 'html');
    if (!htmlNode) {
        return Either.Left([new TemplateParserError(`No HTML node found in parsed document.`)]);
    } else {
        return parseElement(htmlNode, directives, scopeInterfaceName);
    }
}
