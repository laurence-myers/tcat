import * as ts from "typescript";
import {TcatError} from "../core";
import {CompilerOptions} from "typescript";

// Derived from: https://github.com/nwolverson/blog-typescript-api/blob/d3bea8d3b4fdca40b5f75b6d96abfa2cf116faf5/src/MemoryCompilerHost.ts
class MemoryCompilerHost implements ts.CompilerHost {
    files: { [fileName: string]: string } = {};

    getSourceFile(filename: string, languageVersion: ts.ScriptTarget, _?: (message: string) => void): ts.SourceFile {
        var text = this.files[filename];
        console.log(filename);
        return ts.createSourceFile(filename, text || '', languageVersion);
    }
    getDefaultLibFileName = (_: ts.CompilerOptions) => 'lib.d.ts';
    getDirectories = (_: string): string[] => [];

    writeFile = (_: string, __: string, ___: boolean, ____?: (message: string) => void) => {};
    getCurrentDirectory = () => "";
    getCanonicalFileName = (fileName: string) => fileName;
    useCaseSensitiveFileNames = () => true;
    getNewLine = () => "\n";
    fileExists = (fileName: string) => !!this.files[fileName];
    readFile = (fileName: string) => this.files[fileName];

    addFile(fileName: string, body: string) {
        this.files[fileName] = body;
    }
}

function logErrors(program : ts.Program) {
    let allDiagnostics = program.getOptionsDiagnostics()
        .concat(program.getSyntacticDiagnostics())
        .concat(program.getSemanticDiagnostics());

    allDiagnostics.forEach(diagnostic => {
        let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(<any> diagnostic.start);
            console.log(`  Error ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        }
        else {
            console.log(`  Error: ${message}`);
        }
    });
}

export function compileTypeScript(input : string, tsConfig : CompilerOptions) : TcatError[] {
    const fileName = 'temp.ts';
    const compilerHost = new MemoryCompilerHost();
    compilerHost.files[fileName] = input;
    const result = ts.createProgram([fileName], tsConfig, compilerHost);
    logErrors(result);
    return [];
}