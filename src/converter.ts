import {parseHtml, parseJadeToHtml} from "./parser/templateParser";
import {readFile, TcatError, wrapInArray, writeFile} from "./core";
import {generateTypeScript} from "./generator/walker";
import {Either} from "monet";

function readFileWrap(templateFileName : string) : Either<TcatError[], string> {
    return readFile(templateFileName).leftMap(wrapInArray);
}

function writeFileWrap(templateFileName : string, contents : string) : Either<TcatError[], void> {
    return writeFile(templateFileName, contents).leftMap(wrapInArray);
}

export function convertHtmlContentsToTypeScript(htmlContents : string, templateFileName : string) : Either<TcatError[], string> {
    return parseHtml(htmlContents, 'TemplateScope')
        .flatMap((ast) => {
            const templateInterfaceFileName = templateFileName + ".ts";
            return readFileWrap(templateInterfaceFileName)
                .map((base) => {
                    const tsCode = generateTypeScript(ast);
                    const final = '/* tslint:disable */\n' + base + '\n' + tsCode;
                    console.log(final);
                    return final;
                });
        });
}

export function convertJadeContentsToTypeScript(jadeContents : string, templateFileName : string) : Either<TcatError[], string> {
    return parseJadeToHtml(jadeContents)
        .flatMap((html) => convertHtmlContentsToTypeScript(html, templateFileName));
}

export function convertHtmlFileToTypeScript(templateFileName : string) : Either<TcatError[], string> {
    return readFileWrap(templateFileName)
        .flatMap(
            (htmlContents) => convertHtmlContentsToTypeScript(htmlContents, templateFileName)
        );
}

export function convertJadeFileToTypeScript(templateFileName : string) : Either<TcatError[], string> {
    return readFileWrap(templateFileName)
        .flatMap(
            (jadeContents) => convertJadeContentsToTypeScript(jadeContents, templateFileName)
        );
}

function generateTypeScriptOutputFileName(templateFileName : string) : string {
    return `${ templateFileName }.typeview.ts`;
}

export function convertHtmlFileToTypeScriptFile(templateFileName : string) : Either<TcatError[], void> {
    return convertHtmlFileToTypeScript(templateFileName)
        .flatMap(
            (typeScriptContents) => writeFileWrap(generateTypeScriptOutputFileName(templateFileName), typeScriptContents)
        );
}

export function convertJadeFileToTypeScriptFile(templateFileName : string) : Either<TcatError[], void> {
    return convertJadeFileToTypeScript(templateFileName)
        .flatMap(
            (typeScriptContents) => writeFileWrap(generateTypeScriptOutputFileName(templateFileName), typeScriptContents)
        );
}
