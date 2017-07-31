import {Either} from 'monet';
import {ParserError} from "./core";
import {arrayIteration, assign, objectIteration, scopedBlock} from "./generator/dsl";
import {GeneratorAstNode} from "./generator/ast";

export type ParserResult = Either<ParserError, GeneratorAstNode[]>;

// Splits a string into one or more expression strings
export type AttributeParser = (attrib : string) => ParserResult;

export function defaultParser(attrib : string) : ParserResult {
    return Either.Right([assign(attrib)]);
}

export const NG_REPEAT_SPECIAL_PROPERTIES = [
    {
        name: '$index',
        primitiveType: 'number',
        value: '0'
    },
    {
        name: '$first',
        primitiveType: 'boolean',
        value: 'false'
    },
    {
        name: '$last',
        primitiveType: 'boolean',
        value: 'false'
    },
    {
        name: '$middle',
        primitiveType: 'boolean',
        value: 'false'
    },
    {
        name: '$even',
        primitiveType: 'boolean',
        value: 'false'
    },
    {
        name: '$odd',
        primitiveType: 'boolean',
        value: 'false'
    }
];
/**
 * This code is derived from the AngularJS source code.
 */
export function parseNgRepeat(expression : string) : ParserResult {
    let match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

    if (!match) {
        return Either.Left(new ParserError(`Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{${ expression }}'.`));
    }

    const lhs = match[1];
    let rhs = match[2];
    if (rhs.startsWith('::')) { // strip one-time binding syntax
        rhs = rhs.substring(2);
    }
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

    const containingNode = scopedBlock();
    for (const specialProperty of NG_REPEAT_SPECIAL_PROPERTIES) {
        containingNode.children.push(assign(
            specialProperty.value,
            {
                name: specialProperty.name,
                typeAnnotation: specialProperty.primitiveType
            }));
    }

    let iteratorNode;
    let iterableName;
    if (aliasAs) { // "as" syntax aliases the filtered iterable
        iterableName = aliasAs;
        containingNode.children.push(assign(rhs, { name: aliasAs }));
    } else {
        iterableName = rhs;
    }
    if (keyIdentifier) {
        iteratorNode = objectIteration(keyIdentifier, valueIdentifier, iterableName);
    } else {
        iteratorNode = arrayIteration(valueIdentifier, iterableName);
    }

    if (trackByExp) {
        iteratorNode.children.push(assign(trackByExp)); // not really useful.
    }
    containingNode.children.push(iteratorNode);

    return Either.Right([containingNode]);
}
