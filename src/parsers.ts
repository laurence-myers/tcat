import {Either} from 'monet';
import {AttributeParserError} from "./core";
import {arrayIteration, assign, declare, objectIteration, scopedBlock} from "./generator/dsl";
import {ArrayIterationNode, GeneratorAstNode, HasChildrenAstNode, ObjectIterationNode} from "./generator/ast";
import {parseExpressionToAst} from "./ngExpression/ngAstBuilder";
import {ExpressionFilterRectifier} from "./ngExpression/expressionWalker";

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

export function rectifyExpression(expression : string) : string {
    if (!expression) return '';
    if (expression.startsWith('::')) { // strip one-time binding syntax
        expression = expression.substring(2);
    }
    const ast = parseExpressionToAst(expression);
    const rectifier = new ExpressionFilterRectifier();
    return rectifier.walk(ast);
}

export function defaultParser(attrib : string) : ParserResult {
    return Either.Right({
        nodes: [assign(rectifyExpression(attrib))]
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
    const rhs = rectifyExpression(match[2]);
    const aliasAs = match[3];
    const trackByExp = rectifyExpression(match[4]);

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

    if (trackByExp && trackByExp != '$index') {
        if (trackByExp.indexOf('$id(') > -1) {
            iteratorNode.children.push(declare('$id', '(value : any) => string'));
        }
        iteratorNode.children.push(assign(trackByExp));
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
            exp = rectifyExpression(exp);
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

/* tslint-disable max-len */
const NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([$\w][$\w]*)|(?:\(\s*([$\w][$\w]*)\s*,\s*([$\w][$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;
/* tslint-enable */

export function parseNgOptions(optionsExp : string) : ParserResult {
    const match = optionsExp.match(NG_OPTIONS_REGEXP);
    if (!(match)) {
        return Either.Left(new AttributeParserError(
            'Expected expression in form of ' +
            '\'_select_ (as _label_)? for (_key_,)?_value_ in _collection_\'' +
            ` but got \'{${ optionsExp }}\'.`));
    }

    // Extract the parts from the ngOptions expression

    // The variable name for the value of the item in the collection
    const valueName = match[5] || match[7];
    // The variable name for the key of the item in the collection
    const keyName = match[6];

    // An expression that generates the viewValue for an option if there is a label expression
    const selectAs = / as /.test(match[0]) && match[1];
    // An expression that is used to track the id of each object in the options collection
    const trackBy = match[9];
    // An expression that generates the viewValue for an option if there is no label expression
    const valueExpr = rectifyExpression(match[2] ? match[1] : valueName);
    const selectAsExpr = selectAs && rectifyExpression(selectAs);
    const viewValueExpr = selectAsExpr || valueExpr;
    const trackByExpr = trackBy && rectifyExpression(trackBy);

    const displayExpr = rectifyExpression(match[2] || match[1]);
    const groupByExpr = rectifyExpression(match[3] || '');
    const disableWhenExpr = rectifyExpression(match[4] || '');
    const valuesExpr = rectifyExpression(match[8]);

    // Convert to generator AST
    console.log([keyName, viewValueExpr, trackByExpr, displayExpr, groupByExpr, disableWhenExpr, valuesExpr]);
    const nodes : GeneratorAstNode[] = [];

    let iteratorNode : ArrayIterationNode | ObjectIterationNode;
    if (keyName) {
        iteratorNode = {
            type: "ObjectIterationNode",
            keyName: keyName,
            valueName: valueName,
            iterable: valuesExpr,
            children: []
        };
    } else {
        iteratorNode = {
            type: "ArrayIterationNode",
            valueName: valueName,
            iterable: valuesExpr,
            children: []
        };
    }
    nodes.push(iteratorNode);

    if (viewValueExpr != valueName) {
        iteratorNode.children.push(assign(viewValueExpr));
    }
    iteratorNode.children.push(assign(displayExpr));

    return Either.Right({
        nodes
    });
}