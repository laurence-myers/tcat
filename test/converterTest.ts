import {path as root} from "app-root-path";
import {readFileSync} from "fs";
import {asJadeContents, asTypeScriptContents, JadeContents, TypeScriptContents} from "../src/core";
import {convertJadeContentsToTypeScript} from "../src/converter";
import * as assert from "assert";

describe("Converter", function () {
    describe("Examples", function () {
        function verifyExample(exampleNumber : number) : void {
            const dir = `${ root }/test/data/example_${ exampleNumber }`;
            const templateContents : JadeContents = asJadeContents(readFileSync(`${ dir }/template.jade`, 'utf8'));
            const tsBaseContents : TypeScriptContents = asTypeScriptContents(readFileSync(`${ dir }/template.jade.ts`, 'utf8'));
            const expectedContents : TypeScriptContents = asTypeScriptContents(readFileSync(`${ dir }/expected.ts`, 'utf8'));
            convertJadeContentsToTypeScript(templateContents, tsBaseContents)
                .map((tsContents) => assert.equal(tsContents, expectedContents))
                .leftMap((errors) => { throw errors[0] });
        }

        const NUM_EXAMPLES = 1;
        for (let i = 0; i < NUM_EXAMPLES; i++) {
            it(`produces expected output for example #${ i + 1 }`, function () {
                verifyExample(i + 1);
            });
        }
    });
});