import { parseJade } from "./parser/templateParser";
import { generateTypeScript } from "./generator/walker";
import { readFileSync, writeFileSync } from "fs";

async function start() : Promise<void> {
    const templateName = "examples/smorgasbord/template.jade";
    const templateInterface = templateName + ".ts";
    const outputTypeView = templateName + '.typeview.ts';
    const contents = readFileSync(templateName, 'utf8');
    parseJade(contents, 'TemplateScope')
        .bimap(
            (errors) => {
                console.error("Error(s) parsing HTML");
                errors.forEach((err) => console.error(err));
            },
            (ast) => {
                const tsCode = generateTypeScript(ast);
                const base = readFileSync(templateInterface);
                const final = '/* tslint:disable */\n' + base + '\n' + tsCode;
                console.log(final);
                writeFileSync(outputTypeView, final);
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