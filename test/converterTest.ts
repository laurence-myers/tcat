import {path as root} from "app-root-path";
import {readdirSync, readFileSync, statSync} from "fs";
import {
    asDirectoryName,
    asFileName,
    asPugFileName,
    asTypeScriptContents,
    DirectoryName,
    TypeScriptContents
} from "../src/core";
import {convertPugFileToTypeScript} from "../src/converter";
import * as assert from "assert";
import {readDirectiveDataFile} from "../src/files";
import * as path from "path";

describe("Converter", function () {
    describe("Examples", function () {
        function verifyExample(dir : DirectoryName) : void {
            const templateName = asPugFileName(path.join(dir, `template.jade`));
            const directivesName = asFileName(path.join(dir, `directives.json`));
            const expectedContents : TypeScriptContents = asTypeScriptContents(
                readFileSync(path.join(dir, `expected.ts`), 'utf8')
                    .replace(/\r\n/g, '\n')
            );
            const result = readDirectiveDataFile(directivesName)
                .flatMap((directives) => convertPugFileToTypeScript(templateName, directives))
                .map((tsContents) => assert.equal(tsContents.replace(/\r\n/g, '\n'), expectedContents));
            if (result.isLeft()) {
                assert.deepStrictEqual(result.left(), undefined);
            }
        }

        const examplesContainingDirectory = path.join(root, `test`, `data`);
        const exampleDirectories = readdirSync(examplesContainingDirectory)
            .filter((name) => name.startsWith('example_'))
            .map((name) => path.join(examplesContainingDirectory, name))
            .filter((entry : string) => statSync(entry).isDirectory());
        for (const exampleDir of exampleDirectories) {
            it(`produces expected output for ${ exampleDir }`, function () {
                verifyExample(asDirectoryName(exampleDir));
            });
        }
    });
});
