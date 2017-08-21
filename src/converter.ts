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
            console.log(final);
            return asTypeScriptContents(final);
        });
}

export function convertJadeContentsToTypeScript(jadeContents : JadeContents, baseTypeScript : TypeScriptContents, directives : DirectiveData[]) : Either<TcatError[], TypeScriptContents> {
    return parseJadeToHtml(jadeContents)
        .flatMap((html) => convertHtmlContentsToTypeScript(html, baseTypeScript, directives));
}

export function convertHtmlFileToTypeScript(templateFileName : FileName, directivesFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFileWrap(templateFileName)
        .flatMap(
            (htmlContents) =>
                readExistingTypeScriptFile(templateFileName)
                    .flatMap((baseTypescriptContents) =>
                        readDirectiveDataFile(directivesFileName)
                            .flatMap((directives) => convertHtmlContentsToTypeScript(asHtmlContents(htmlContents), baseTypescriptContents, directives))
                    )
        );
}

export function convertJadeFileToTypeScript(templateFileName : FileName, directivesFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFileWrap(templateFileName)
        .flatMap(
            (jadeContents) =>
                readExistingTypeScriptFile(templateFileName)
                    .flatMap((baseTypescriptContents) =>
                        readDirectiveDataFile(directivesFileName)
                            .flatMap((directives) =>
                                convertJadeContentsToTypeScript(asJadeContents(jadeContents), baseTypescriptContents, directives))
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

export function convertJadeFileToTypeScriptFile(templateFileName : FileName, directivesFileName : FileName) : Either<TcatError[], void> {
    return convertJadeFileToTypeScript(templateFileName, directivesFileName)
        .flatMap(
            (typeScriptContents) => writeFileWrap(generateTypeScriptOutputFileName(templateFileName), typeScriptContents)
        );
}
