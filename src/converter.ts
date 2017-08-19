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

export function convertHtmlContentsToTypeScript(htmlContents : HtmlContents, templateFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return parseHtml(htmlContents, 'TemplateScope')
        .flatMap((ast) => {
            const templateInterfaceFileName = asFileName(templateFileName + ".ts");
            return readFileWrap(templateInterfaceFileName)
                .map((base) => {
                    const tsCode = generateTypeScript(ast);
                    const final = '/* tslint:disable */\n' + base + '\n' + tsCode;
                    console.log(final);
                    return asTypeScriptContents(final);
                });
        });
}

export function convertJadeContentsToTypeScript(jadeContents : JadeContents, templateFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return parseJadeToHtml(jadeContents)
        .flatMap((html) => convertHtmlContentsToTypeScript(html, templateFileName));
}

export function convertHtmlFileToTypeScript(templateFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFileWrap(templateFileName)
        .flatMap(
            (htmlContents) => convertHtmlContentsToTypeScript(asHtmlContents(htmlContents), templateFileName)
        );
}

export function convertJadeFileToTypeScript(templateFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFileWrap(templateFileName)
        .flatMap(
            (jadeContents) => convertJadeContentsToTypeScript(asJadeContents(jadeContents), templateFileName)
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
