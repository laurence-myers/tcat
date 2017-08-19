import {convertJadeFileToTypeScriptFile} from "./converter";
import {asFileName} from "./core";

async function start() : Promise<void> {
    const templateName = asFileName("examples/smorgasbord/template.jade");
    convertJadeFileToTypeScriptFile(templateName)
        .leftMap(
            (errors) => {
                console.error("Errors were encountered processing templates.");
                errors.forEach((err) => console.error(err));
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