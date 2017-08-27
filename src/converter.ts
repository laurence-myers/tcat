import {parseHtml, parsePugToHtml} from "./parser/templateParser";
import {
    asFileName,
    asHtmlContents,
    asPugContents,
    asTypeScriptContents,
    FileName,
    HtmlContents, HtmlFileName, PugFileName,
    readFile,
    TcatError,
    TypeScriptContents,
    writeFile
} from "./core";
import {generateTypeScript} from "./generator/walker";
import {Either} from "monet";
import {createDirectiveMap, DirectiveData} from "./directives";
import {readDirectiveDataFile, readTypeScriptFile} from "./files";

function readExistingTypeScriptFile(templateFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readTypeScriptFile(asFileName(templateFileName + `.ts`));
}

export function convertHtmlContentsToTypeScript(htmlContents : HtmlContents, baseTypeScript : TypeScriptContents, directives : DirectiveData[]) : Either<TcatError[], TypeScriptContents> {
    return parseHtml(htmlContents, 'TemplateScope', createDirectiveMap(directives))
        .map((ast) => {
            const tsCode = generateTypeScript(ast);
            const final = '/* tslint:disable */\n' + baseTypeScript + '\n' + tsCode;
            return asTypeScriptContents(final);
        });
}

function readFilesAndConvertContents(templateFileName : FileName, directivesFileName : FileName, htmlContents : HtmlContents) : Either<TcatError[], TypeScriptContents> {
    return readExistingTypeScriptFile(templateFileName)
        .flatMap((baseTypescriptContents) =>
            readDirectiveDataFile(directivesFileName)
                .flatMap((directives) => convertHtmlContentsToTypeScript(htmlContents, baseTypescriptContents, directives))
        );
}

export function convertHtmlFileToTypeScript(templateFileName : HtmlFileName, directivesFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFile(templateFileName)
        .flatMap(
            (htmlContents) =>
                readFilesAndConvertContents(templateFileName, directivesFileName, asHtmlContents(htmlContents))
        );
}

export function convertPugFileToTypeScript(templateFileName : PugFileName, directivesFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFile(templateFileName)
        .flatMap(
            (pugContents) =>
                parsePugToHtml(asPugContents(pugContents), templateFileName)
                    .flatMap((htmlContents) =>
                        readFilesAndConvertContents(templateFileName, directivesFileName, htmlContents)
                    )
        );
}

function generateTypeScriptOutputFileName(templateFileName : FileName) : FileName {
    return asFileName(`${ templateFileName }.typeview.ts`);
}

export function convertHtmlFileToTypeScriptFile(templateFileName : HtmlFileName, directivesFileName : FileName) : Either<TcatError[], void> {
    return convertHtmlFileToTypeScript(templateFileName, directivesFileName)
        .flatMap(
            (typeScriptContents) => writeFile(generateTypeScriptOutputFileName(templateFileName), typeScriptContents)
        );
}

export function convertPugFileToTypeScriptFile(templateFileName : PugFileName, directivesFileName : FileName) : Either<TcatError[], void> {
    return convertPugFileToTypeScript(templateFileName, directivesFileName)
        .flatMap(
            (typeScriptContents) => writeFile(generateTypeScriptOutputFileName(templateFileName), typeScriptContents)
        );
}
