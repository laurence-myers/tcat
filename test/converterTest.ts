import {path as root} from "app-root-path";
import {readFileSync} from "fs";
import {asFileName, asPugFileName, asTypeScriptContents, TypeScriptContents} from "../src/core";
import {convertPugFileToTypeScript} from "../src/converter";
import * as assert from "assert";

describe("Converter", function () {
    describe("Examples", function () {
        function verifyExample(exampleNumber : number) : void {
            const dir = `${ root }/test/data/example_${ exampleNumber }`;
            const templateName = asPugFileName(`${ dir }/template.jade`);
            const directivesName = asFileName(`${ dir }/directives.json`);
            const expectedContents : TypeScriptContents = asTypeScriptContents(
                readFileSync(`${ dir }/expected.ts`, 'utf8')
                    .replace(/\r\n/g, '\n')
            );
            convertPugFileToTypeScript(templateName, directivesName)
                .map((tsContents) => assert.equal(tsContents.replace(/\r\n/g, '\n'), expectedContents))
                .leftMap((errors) => { throw errors[0] });
        }

        const NUM_EXAMPLES = 2;
        for (let i = 0; i < NUM_EXAMPLES; i++) {
            it(`produces expected output for example #${ i + 1 }`, function () {
                verifyExample(i + 1);
            });
        }
    });
});