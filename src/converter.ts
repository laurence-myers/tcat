import {parseHtml, parseJadeToHtml} from "./parser/templateParser";
import {
    asFileName,
    asHtmlContents,
    asJadeContents,
    asTypeScriptContents,
    FileName,
    HtmlContents,
    JadeContents,
    readFile,
    TcatError,
    TypeScriptContents,
    wrapInArray,
    writeFile
} from "./core";
import {generateTypeScript} from "./generator/walker";
import {Either} from "monet";

function readFileWrap(templateFileName : FileName) : Either<TcatError[], string> {
    return readFile(templateFileName).leftMap(wrapInArray);
}

function writeFileWrap(templateFileName : FileName, contents : string) : Either<TcatError[], void> {
    return writeFile(templateFileName, contents).leftMap(wrapInArray);
}

function readExistingTypeScriptFile(templateFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFileWrap(asFileName(templateFileName + ".ts"))
        .map(asTypeScriptContents);
}

export function convertHtmlContentsToTypeScript(htmlContents : HtmlContents, baseTypeScript : TypeScriptContents) : Either<TcatError[], TypeScriptContents> {
    return parseHtml(htmlContents, 'TemplateScope')
        .map((ast) => {
            const tsCode = generateTypeScript(ast);
            const final = '/* tslint:disable */\n' + baseTypeScript + '\n' + tsCode;
            console.log(final);
            return asTypeScriptContents(final);
        });
}

export function convertJadeContentsToTypeScript(jadeContents : JadeContents, baseTypeScript : TypeScriptContents) : Either<TcatError[], TypeScriptContents> {
    return parseJadeToHtml(jadeContents)
        .flatMap((html) => convertHtmlContentsToTypeScript(html, baseTypeScript));
}

export function convertHtmlFileToTypeScript(templateFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFileWrap(templateFileName)
        .flatMap(
            (htmlContents) =>
                readExistingTypeScriptFile(templateFileName)
                    .flatMap((baseTypescriptContents) => convertHtmlContentsToTypeScript(asHtmlContents(htmlContents), baseTypescriptContents))
        );
}

export function convertJadeFileToTypeScript(templateFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFileWrap(templateFileName)
        .flatMap(
            (jadeContents) =>
                readExistingTypeScriptFile(templateFileName)
                    .flatMap((baseTypescriptContents) => convertJadeContentsToTypeScript(asJadeContents(jadeContents), baseTypescriptContents))
        );
}

function generateTypeScriptOutputFileName(templateFileName : FileName) : FileName {
    return asFileName(`${ templateFileName }.typeview.ts`);
}

export function convertHtmlFileToTypeScriptFile(templateFileName : FileName) : Either<TcatError[], void> {
    return convertHtmlFileToTypeScript(templateFileName)
        .flatMap(
            (typeScriptContents) => writeFileWrap(generateTypeScriptOutputFileName(templateFileName), typeScriptContents)
        );
}

export function convertJadeFileToTypeScriptFile(templateFileName : FileName) : Either<TcatError[], void> {
    return convertJadeFileToTypeScript(templateFileName)
        .flatMap(
            (typeScriptContents) => writeFileWrap(generateTypeScriptOutputFileName(templateFileName), typeScriptContents)
        );
}
