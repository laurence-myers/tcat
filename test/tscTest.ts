import * as ts from "typescript";
import {path as root} from "app-root-path";
import * as path from "path";

describe(`TSC Integration`, function () {
    xit(`Can compile an example file`, function () {
        this.timeout(30000);
        function compile(fileNames : string[], options : ts.CompilerOptions) : void {
            let program = ts.createProgram(fileNames, options);
            let emitResult = program.emit();
            console.log(emitResult);

            let allDiagnostics = (
                ts.getPreEmitDiagnostics(program)
            );

            console.log(allDiagnostics);
            allDiagnostics.forEach(diagnostic => {
                if (diagnostic.file) {
                    let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
                        diagnostic.start!
                    );
                    let message = ts.flattenDiagnosticMessageText(
                        diagnostic.messageText,
                        "\n"
                    );
                    console.log(
                        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
                    );
                } else {
                    console.log(
                        `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
                    );
                }
            });
        }

        const filesToCompile = [
            path.join(root, 'test', 'data', 'error_example_3', 'template.jade.tcat.ts')
        ];
        compile(filesToCompile, {
            struct: true,
            noEmit: true,
            noImplicitAny: true,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.CommonJS
        });
    });
});
