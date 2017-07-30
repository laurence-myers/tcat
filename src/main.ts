import * as jade from "jade";
import {parseHtml} from "./parser/templateParser";
import {generateTypeScript} from "./generator/walker";

async function start() : Promise<void> {
    const contents = jade.renderFile("template.jade");
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
                console.log(output);
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