import {Either} from 'monet';
import {ParserError} from "./core";

export type ParserResult = Either<ParserError, string[]>;

// Splits a string into one or more expression strings
export type AttributeParser = (attrib : string) => ParserResult;

export function defaultParser(attrib : string) : ParserResult {
    return Either.Right([attrib]);
}

/**
 * This code is derived from the AngularJS source code.
 */
export function parseNgRepeat(expression : string) : ParserResult {
    let match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

    if (!match) {
        return Either.Left(new ParserError(`Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{${ expression }}'.`));
    }

    const lhs = match[1];
    const rhs = match[2];
    const aliasAs = match[3];
    const trackByExp = match[4];

    match = lhs.match(/^(?:(\s*[$\w]+)|\(\s*([$\w]+)\s*,\s*([$\w]+)\s*\))$/);

    if (!match) {
        return Either.Left(new ParserError(`'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{${ lhs }}'.`));
    }
    const valueIdentifier = match[3] || match[1];
    const keyIdentifier = match[2];

    if (aliasAs && (!/^[$a-zA-Z_][$a-zA-Z0-9_]*$/.test(aliasAs) ||
            /^(null|undefined|this|\$index|\$first|\$middle|\$last|\$even|\$odd|\$parent|\$root|\$id)$/.test(aliasAs))) {
        return Either.Left(new ParserError(`alias \'{${ aliasAs }}\' is invalid --- must be a valid JS identifier which is not a reserved name.`));
    }
    return Either.Right([lhs, rhs, aliasAs, trackByExp, valueIdentifier, keyIdentifier]);
}
