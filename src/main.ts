// import * as jade from "jade";
import * as cheerio from "cheerio";
import * as htmlparser from "htmlparser2";
import * as domlike from "domlike";

const expressions = require('angular-expressions');

const KNOWN_EXPRESSION_ATTRIBUTES = [
    'ng-if'
];

async function processNode(node : CheerioElement) {
    for (const key in node.attribs) {
        console.log(key);
        if (KNOWN_EXPRESSION_ATTRIBUTES.indexOf(key) > -1) {
            const value = node.attribs[key];
            const result = expressions.compile(value);
            console.log(result.ast.body[0].expression);
        }
    }
    for (const child of node.children) {
        await processNode(child);
    }
}

async function start() : Promise<void> {
    // const contents = jade.renderFile("template.jade");
    const contents = `<div ng-if="ctrl.isLoading"></div>`;
    console.log(contents);
    const handler = new domlike.Handler();
    const parser = new htmlparser.Parser(handler);
    parser.write(contents);
    parser.done();
    // const node = handler.document.childNodes[0];
    // console.log();
    const $ = cheerio.load(contents);
    await processNode($.root().get(0));
}

async function main() : Promise<void> {
    console.log("Starting...");
    let exitCode = 0;
    try {
        await start();
        console.log("Done!");
    } catch (err) {
        console.error("Error", err);
        exitCode = 1;
    }
    process.exitCode = exitCode;
}

main();