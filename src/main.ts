import * as jade from "jade";
import * as cheerio from "cheerio";
import * as htmlparser from "htmlparser2";
import * as domlike from "domlike";
import {ProgramNode} from "./ngExpression/ast";
import {AstWalker} from "./ngExpression/expressionWalker";
import {directiveMap} from "./directives";

const expressions = require('angular-expressions');

// const ComplexExpressionMap = new Map<string, (value : string) => string>();
// ComplexExpressionMap.set('ng-repeat', parseNgRepeat);

async function processNode(node : CheerioElement) {
    const tagLookup = directiveMap.get(node.tagName);
    if (tagLookup && tagLookup.canBeElement) {

    }
    for (const key in node.attribs) {
        console.log(key);
        const attribLookup = directiveMap.get(key);
        if (attribLookup && attribLookup.canBeAttribute) {
            const value = node.attribs[key];
            const result : { ast : ProgramNode } = expressions.compile(value);
            const walker = new AstWalker();
            console.log(result.ast);
            walker.walk(result.ast);
        }
    }
    if (node.children) {
        for (const child of node.children) {
            await processNode(child);
        }
    }
}

async function start() : Promise<void> {
    const contents = jade.renderFile("template.jade");
    // const contents = `<div ng-if="ctrl.isLoading" ng-click="ctrl.tagClick({ tagLabel })"></div>`;
    console.log(contents);
    const handler = new domlike.Handler();
    const parser = new htmlparser.Parser(handler);
    parser.write(contents);
    parser.done();
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