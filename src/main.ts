import * as jade from "jade";
import {parseHtml} from "./parser/templateParser";
import {generateTypeScript} from "./generator/walker";
import {compileTypeScript} from "./tsc/compiler";
import {readFileSync} from "fs";
import * as ts from "typescript";

async function start() : Promise<void> {
    const tsConfigFile = "examples/templateThumbnailDirective/tsconfig.json";
    const tsConfig = ts.readConfigFile(tsConfigFile, (path) => readFileSync(path, 'utf8'));
    const templateName = "examples/templateThumbnailDirective/template.jade";
    const templateInterface = templateName + ".ts";
    const contents = jade.renderFile("examples/templateThumbnailDirective/template.jade");
    // const contents = `<div ng-if="ctrl.isLoading" ng-click="ctrl.tagClick({ tagLabel })"></div>`;
    console.log(contents);
    parseHtml(contents)
        .bimap(
            (errors) => {
                console.error("Error(s) parsing HTML");
                errors.forEach((err) => console.error(err));
            },
            (ast) => {
                const output = generateTypeScript(ast);
                const base = readFileSync(templateInterface);
                console.log(output);
                return compileTypeScript(base + '\n' + output, tsConfig.config);
            }
        );
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