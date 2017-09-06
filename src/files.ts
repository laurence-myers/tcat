import {
    asDirectoryName,
    asFileName,
    asTypeScriptContents,
    DirectoryName,
    FileName,
    JsonValidationError,
    readFile, requireFile,
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
                        "type": "object",
                        "additionalProperties": false
                    },
                    "type": "array"
                },
                "name": {
                    "type": "string"
                },
                "optional": {
                    "type": "boolean"
                },
                "type": {
                    "type": "string",
                    "enum": ["expression", "interpolated"]
                }
            },
            "required": ["name"],
            "type": "object",
            "additionalProperties": false
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
                },
                "priority": {
                    "type": "number"
                }
            },
            "required": ["name", "canBeElement", "canBeAttribute"],
            "type": "object",
            "additionalProperties": false
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

export function validateDirectiveDataJson(possibleDirectiveData : any) : Either<TcatError[], DirectiveData[]> {
    const schemaValidator = ajv.compile(directiveDataSchema);
    const valid = schemaValidator(possibleDirectiveData);
    if (!valid) {
        return Either.Left(schemaValidator.errors!.map((err) => new JsonValidationError(err.message)));
    } else {
        return Either.Right(possibleDirectiveData);
    }
}

export function readDirectiveDataFile(directiveFileName : FileName) : Either<TcatError[], DirectiveData[]> {
    return requireFile<DirectiveData[]>(directiveFileName)
        .flatMap(validateDirectiveDataJson);
}

export function findLongestCommonPath(fileNames : FileName[]) : string {
    if (fileNames.length >= 2) {
        const commonComponents = fileNames[0].split(path.sep);
        for (let i = 1; i < fileNames.length; i++) {
            const pathComponents = fileNames[i].split(path.sep);
            for (let j = 0; j < pathComponents.length; j++) {
                if (commonComponents[j] !== pathComponents[j]) {
                    if (commonComponents[j] !== undefined) {
                        commonComponents.splice(j);
                    }
                    break;
                }
            }
        }
        return commonComponents.join(path.sep);
    } else {
        return '';
    }
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