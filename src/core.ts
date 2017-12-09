import * as util from "util";
import {Either} from "monet";
import {readFileSync, writeFileSync} from "fs";

export class TcatError extends Error {}
export class UnexpectedStateError extends TcatError {}
export class UnsupportedTemplateFileError extends TcatError {}
export class FileReadError extends TcatError {}
export class FileRequireError extends TcatError {}
export class FileWriteError extends TcatError {}
export class DirectiveDefinitionError extends TcatError {}
export class TemplateParserError extends TcatError {}
export class AttributeParserError extends TcatError {}
export class ElementDirectiveParserError extends TcatError {}
export class JsonValidationError extends TcatError {}
export class HtmlValidationError extends TcatError {}
export class NgExpressionParserError extends AttributeParserError {}

export function assertNever(value : never) : never {
    throw new Error(`Unexpected value ${ value }`);
}

export function flatten<T>(arr : T[][]) : T[] {
    return Array.prototype.concat(...arr);
}

export function logObject(obj : any) : void {
    console.log(objectToString(obj));
}

export function objectToString(obj : any) : string {
    return util.inspect(obj, false, <any> null);
}

export function readFile(fileName : FileName) : Either<FileReadError[], string> {
    try {
        return Either.Right(readFileSync(fileName, 'utf8'));
    } catch (err) {
        return Either.Left([new FileReadError(err)]);
    }
}

export function requireFile<T>(fileName : FileName) : Either<FileReadError[], T> {
    try {
        return Either.Right(require(fileName));
    } catch (err) {
        return Either.Left([new FileRequireError(err)]);
    }
}

export function writeFile(fileName : FileName, contents : string) : Either<FileWriteError[], void> {
    try {
        return Either.Right(writeFileSync(fileName, contents));
    } catch (err) {
        return Either.Left([new FileWriteError(err)]);
    }
}

export function last<T>(arr : T[]) : T | undefined {
    return arr[arr.length - 1];
}

export function unwrapEither<E extends Error, V>(either : Either<E, V>) : V | never {
    return either.cata(
        (err) => { throw err; },
        (value) => value
    );
}

export const enum AsFileName {}
export type FileName = string & AsFileName;
export function asFileName(value : string) { return value as FileName; }

export const enum AsDirectoryName {}
export type DirectoryName = string & AsDirectoryName;
export function asDirectoryName(value : string) { return value as DirectoryName; }

export const enum AsHtmlFileName {}
export type HtmlFileName = FileName & AsHtmlFileName;
export function asHtmlFileName(value : string) { return value as HtmlFileName; }

export const enum AsPugFileName {}
export type PugFileName = FileName & AsPugFileName;
export function asPugFileName(value : string) { return value as PugFileName; }

export const enum AsPugContents {}
export type PugContents = string & AsPugContents;
export function asPugContents(value : string) { return value as PugContents; }

export const enum AsHtmlContents {}
export type HtmlContents = string & AsHtmlContents;
export function asHtmlContents(value : string) { return value as HtmlContents; }

export const enum AsTypeScriptContents {}
export type TypeScriptContents = string & AsTypeScriptContents;
export function asTypeScriptContents(value : string) { return value as TypeScriptContents; }