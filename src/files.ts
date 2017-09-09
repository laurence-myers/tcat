import "./metadataShim";
import {
    asDirectoryName,
    asFileName,
    asTypeScriptContents,
    DirectoryName,
    FileName,
    JsonValidationError,
    readFile,
    requireFile,
    TcatError,
    TypeScriptContents
} from "./core";
import {Either} from "monet";
import {AttributeLocal, DirectiveAttribute, DirectiveData} from "./directives";
import * as fs from "fs";
import * as path from "path";
import {AnyConstraints, FunctionConstraints, NestedArray, StringConstraints, Validator} from "tsdv-joi";
import {ElementDirectiveParser} from "./parser/elements";
import {AttributeParser} from "./parser/attributes";
import Pattern = StringConstraints.Pattern;

const { Required, Only, Optional } = AnyConstraints;
const { Arity } = FunctionConstraints;
const { StringSchema } = StringConstraints;
const DIRECTIVE_NAME_PATTERN = /^[a-z][a-zA-Z]*$/;

class DirectiveAttributeLocalSchema implements AttributeLocal {
    @Required()
    @StringSchema()
    name : string;

    @Required()
    @StringSchema()
    type : string;
}

class DirectiveAttributeSchema implements DirectiveAttribute {
    @Pattern(DIRECTIVE_NAME_PATTERN)
    @Required()
    name : string;

    @Optional()
    optional? : boolean;

    @Only('expression', 'interpolated')
    @Optional()
    mode? : 'expression' | 'interpolated';

    @Optional()
    @NestedArray(DirectiveAttributeLocalSchema)
    locals? : DirectiveAttributeLocalSchema[];

    @Arity(1)
    @Optional()
    parser? : AttributeParser;
}

class DirectiveDataSchema implements DirectiveData {
    @Pattern(DIRECTIVE_NAME_PATTERN)
    @Required()
    name : string;

    @Required()
    canBeElement : boolean;

    @Required()
    canBeAttribute : boolean;

    @Optional()
    @NestedArray(DirectiveAttributeSchema)
    attributes : DirectiveAttributeSchema[];

    @Arity(2)
    @Optional()
    parser? : ElementDirectiveParser;

    @Optional()
    priority? : number;
}

const validator = new Validator({
    convert: false,
    presence: 'required'
});

export function readTypeScriptFile(typeScriptFileName : FileName) : Either<TcatError[], TypeScriptContents> {
    return readFile(asFileName(typeScriptFileName))
        .map(asTypeScriptContents);
}

export function validateDirectiveDataJson(possibleDirectiveData : any) : Either<TcatError[], DirectiveData[]> {
    const result = validator.validateArrayAsClass<DirectiveData>(possibleDirectiveData, DirectiveDataSchema);
    if (result.error) {
        return Either.Left(result.error.details.map((err) => new JsonValidationError(err.message)));
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