import * as util from "util";
import {Either} from "monet";
import {readFileSync, writeFileSync} from "fs";

export class TcatError extends Error {}
export class FileReadError extends TcatError {}
export class FileWriteError extends TcatError {}
export class TemplateParserError extends TcatError {}
export class AttributeParserError extends TcatError {}
export class ElementDirectiveParserError extends TcatError {}

export function assertNever(value : never) : never {
    throw new Error(`Unexpected value ${ value }`);
}

export function logObject(obj : any): void {
    console.log(util.inspect(obj, false, <any> null));
}

export function readFile(fileName : string) : Either<FileReadError, string> {
    try {
        return Either.Right(readFileSync(fileName, 'utf8'));
    } catch (err) {
        return Either.Left(new FileReadError(err));
    }
}

export function writeFile(fileName : string, contents : string) : Either<FileWriteError, void> {
    try {
        return Either.Right(writeFileSync(fileName, contents));
    } catch (err) {
        return Either.Left(new FileWriteError(err));
    }
}

export function wrapInArray<T>(value : T) : T[] {
    return [value];
}