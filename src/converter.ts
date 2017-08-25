import {parseHtml, parsePugToHtml} from "./parser/templateParser";
import {
    asFileName,
    asHtmlContents,
    asPugContents,
    asTypeScriptContents,
    FileName,
    HtmlContents,
    readFile,
    TcatError,
    TypeScriptContents,
    wrapInArray,
    writeFile
} from "./core";
import {generateTypeScript} from "./generator/walker";
import {Either} from "monet";
import {createDirectiveMap, DirectiveData} from "./directives";

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

function readDirectiveDataFile(directiveFileName : FileName) : Either<TcatError[], DirectiveData[]> {
    return readFileWrap(directiveFileName)
        .map((contents) => JSON.parse(contents));
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
        )
}

export function convertHtmlFileToTypeScript(templateFileName : FileName, directivesFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFileWrap(templateFileName)
        .flatMap(
            (htmlContents) =>
                readFilesAndConvertContents(templateFileName, directivesFileName, asHtmlContents(htmlContents))
        );
}

export function convertPugFileToTypeScript(templateFileName : FileName, directivesFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFileWrap(templateFileName)
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

export function convertHtmlFileToTypeScriptFile(templateFileName : FileName, directivesFileName : FileName) : Either<TcatError[], void> {
    return convertHtmlFileToTypeScript(templateFileName, directivesFileName)
        .flatMap(
            (typeScriptContents) => writeFileWrap(generateTypeScriptOutputFileName(templateFileName), typeScriptContents)
        );
}

export function convertPugFileToTypeScriptFile(templateFileName : FileName, directivesFileName : FileName) : Either<TcatError[], void> {
    return convertPugFileToTypeScript(templateFileName, directivesFileName)
        .flatMap(
            (typeScriptContents) => writeFileWrap(generateTypeScriptOutputFileName(templateFileName), typeScriptContents)
        );
}
