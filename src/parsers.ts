import {Either} from 'monet';
import {AttributeParserError} from "./core";
import {arrayIteration, assign, objectIteration, scopedBlock} from "./generator/dsl";
import {GeneratorAstNode, HasChildrenAstNode} from "./generator/ast";

export interface ScopeData {
    isStart : boolean;
    isEnd : boolean;
    root : HasChildrenAstNode;
    childParent : HasChildrenAstNode;
}

export interface SuccessfulParserResult {
    nodes : GeneratorAstNode[];
    scopeData? : ScopeData;
}
export type ParserResult = Either<AttributeParserError, SuccessfulParserResult>;

// Splits a string into one or more expression strings
export type AttributeParser = (attrib : string) => ParserResult;

function peek(str : string, start : number) : string {
    return (str && str[start + 1]) || '';
}

function parseFilters(filters : string) {
    const firstArgDelim = filters.indexOf(':');
    // Args
    // Skip over quoted or "ORed" expressions.
}

export function expressionParser(attrib : string) : ParserResult {
    // Assume an expression can be modified by one or more filters. Do some naive parsing to split it up.
    if (attrib) {
        for (let i = 0; i < attrib.length; i++) {
            let c = attrib[i];
            // Skip strings
            if (c == `'` || c == `"`) {
                i = attrib.indexOf(c, i + 1);
            } else if (c == '|' && peek(attrib, i) != '|') {
                parseFilters(attrib.substring(i + 1));
            }
        }
    } else {
        return Either.Right({
            nodes: [assign(attrib)]
        });
    }

}

export function defaultParser(attrib : string) : ParserResult {
    return Either.Right({
        nodes: [assign(attrib)]
    });
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
        return Either.Left(new AttributeParserError(`Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{${ expression }}'.`));
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
        return Either.Left(new AttributeParserError(`'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{${ lhs }}'.`));
    }
    const valueIdentifier = match[3] || match[1];
    const keyIdentifier = match[2];

    if (aliasAs && (!/^[$a-zA-Z_][$a-zA-Z0-9_]*$/.test(aliasAs) ||
            /^(null|undefined|this|\$index|\$first|\$middle|\$last|\$even|\$odd|\$parent|\$root|\$id)$/.test(aliasAs))) {
        return Either.Left(new AttributeParserError(`alias \'{${ aliasAs }}\' is invalid --- must be a valid JS identifier which is not a reserved name.`));
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

    return Either.Right({
        nodes: [containingNode],
        scopeData: {
            isStart: true,
            isEnd: true,
            root: containingNode,
            childParent: iteratorNode
        }
    });
}

// Derived from: https://github.com/angular/angular.js/blob/aee5d02cb789e178f3f80f95cdabea38e0090501/src/ng/interpolate.js#L240
export function parseInterpolatedText(text : string, symbols = {
    startSymbol: '{{',
    endSymbol: '}}'
}) : ParserResult {
    const startSymbolLength = symbols.startSymbol.length;
    const endSymbolLength = symbols.endSymbol.length;
    let startIndex;
    let endIndex;
    let index = 0;
    const expressions = [];
    let textLength = text.length;
    let exp;

    while (index < textLength) {
        if (((startIndex = text.indexOf(symbols.startSymbol, index)) !== -1) &&
            ((endIndex = text.indexOf(symbols.endSymbol, startIndex + startSymbolLength)) !== -1)) {
            exp = text.substring(startIndex + startSymbolLength, endIndex).trim();
            if (exp.startsWith('::')) {
                exp = exp.substring(2).trim();
            }
            expressions.push(exp);
            index = endIndex + endSymbolLength;
        } else {
            break;
        }
    }

    return Either.Right({
        nodes: expressions.map((value) => assign(value))
    });
}