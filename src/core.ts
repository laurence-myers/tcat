import * as util from "util";
import {Either} from "monet";
import {readFileSync, writeFileSync} from "fs";

export class TcatError extends Error {}
export class UnsupportedTemplateFileError extends TcatError {}
export class FileReadError extends TcatError {}
export class FileWriteError extends TcatError {}
export class TemplateParserError extends TcatError {}
export class AttributeParserError extends TcatError {}
export class ElementDirectiveParserError extends TcatError {}
export class JsonValidationError extends TcatError {}

export function assertNever(value : never) : never {
    throw new Error(`Unexpected value ${ value }`);
}

export function flatten<T>(arr : T[][]) : T[] {
    return Array.prototype.concat(...arr);
}

export function logObject(obj : any): void {
    console.log(util.inspect(obj, false, <any> null));
}

export function readFile(fileName : string) : Either<FileReadError[], string> {
    try {
        return Either.Right(readFileSync(fileName, 'utf8'));
    } catch (err) {
        return Either.Left([new FileReadError(err)]);
    }
}

export function writeFile(fileName : string, contents : string) : Either<FileWriteError[], void> {
    try {
        return Either.Right(writeFileSync(fileName, contents));
    } catch (err) {
        return Either.Left([new FileWriteError(err)]);
    }
}

const enum AsFileName {}
export type FileName = string & AsFileName;
export function asFileName(value : string) { return value as FileName; }

const enum AsDirectoryName {}
export type DirectoryName = string & AsDirectoryName;
export function asDirectoryName(value : string) { return value as DirectoryName; }

const enum AsHtmlFileName {}
export type HtmlFileName = FileName & AsHtmlFileName;
export function asHtmlFileName(value : string) { return value as HtmlFileName; }

const enum AsPugFileName {}
export type PugFileName = FileName & AsPugFileName;
export function asPugFileName(value : string) { return value as PugFileName; }

const enum AsPugContents {}
export type PugContents = string & AsPugContents;
export function asPugContents(value : string) { return value as PugContents; }

const enum AsHtmlContents {}
export type HtmlContents = string & AsHtmlContents;
export function asHtmlContents(value : string) { return value as HtmlContents; }

const enum AsTypeScriptContents {}
export type TypeScriptContents = string & AsTypeScriptContents;
export function asTypeScriptContents(value : string) { return value as TypeScriptContents; }