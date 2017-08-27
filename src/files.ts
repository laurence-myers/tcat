import {
    asDirectoryName,
    asFileName,
    asTypeScriptContents,
    DirectoryName,
    FileName,
    JsonValidationError,
    readFile,
    TcatError,
    TypeScriptContents
} from "./core";
import {Either} from "monet";
import {DirectiveData} from "./directives";
import * as Ajv from "ajv";
import * as fs from "fs";
import * as path from "path";

const directiveDataSchema = {
    "definitions": {
        "DirectiveAttribute": {
            "properties": {
                "locals": {
                    "items": {
                        "properties": {
                            "name": {
                                "type": "string"
                            },
                            "type": {
                                "type": "string"
                            }
                        },
                        "required": ["name", "type"],
                        "type": "object"
                    },
                    "type": "array"
                },
                "name": {
                    "type": "string"
                }
            },
            "required": ["name"],
            "type": "object"
        },
        "DirectiveData": {
            "properties": {
                "attributes": {
                    "items": {
                        "$ref": "#/definitions/DirectiveAttribute"
                    },
                    "type": "array"
                },
                "canBeAttribute": {
                    "type": "boolean"
                },
                "canBeElement": {
                    "type": "boolean"
                },
                "name": {
                    "type": "string"
                }
            },
            "required": ["name", "canBeElement", "canBeAttribute"],
            "type": "object"
        }
    },
    "items": {
        "$ref": "#/definitions/DirectiveData"
    },
    "type": "array"
};
const ajv = new Ajv();

export function readTypeScriptFile(typeScriptFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFile(asFileName(typeScriptFileName))
        .map(asTypeScriptContents);
}

export function validateDirectiveDataJson(contents : string) : Either<TcatError[], DirectiveData[]> {
    const directiveData = JSON.parse(contents);
    const schemaValidator = ajv.compile(directiveDataSchema);
    const valid = schemaValidator(directiveData);
    if (!valid) {
        return Either.Left(schemaValidator.errors!.map((err) => new JsonValidationError(err.message)));
    } else {
        return Either.Right(directiveData);
    }
}

export function readDirectiveDataFile(directiveFileName : FileName) : Either<TcatError[], DirectiveData[]> {
    return readFile(directiveFileName)
        .flatMap(validateDirectiveDataJson);
}

export type FileFilter = (fileName : string) => boolean;
export function walk(dir : DirectoryName, filter : FileFilter) : FileName[] {
    const results : FileName[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results.push(...walk(asDirectoryName(file), filter));
        } else if (filter(file)) {
            results.push(asFileName(file));
        }
    });
    return results;
}