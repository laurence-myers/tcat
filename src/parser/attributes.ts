import {Either} from 'monet';
import {AttributeParserError, NgExpressionParserError} from "../core";
import {arrayIteration, assign, ifStatement, objectIteration, parameter, scopedBlock} from "../generator/dsl";
import {
    ArrayIterationNode,
    GeneratorAstNode,
    HasChildrenAstNode,
    ObjectIterationNode,
    ParameterNode
} from "../generator/ast";
import {parseExpression} from "../ngExpression/ngAstBuilder";
import {ProgramNode} from "../ngExpression/ast";

export interface ScopeData {
    root : HasChildrenAstNode;
    childParent : HasChildrenAstNode;
    attachToTemplateRoot? : boolean;
}

export interface SuccessfulParserResult {
    nodes : GeneratorAstNode[];
    scopeData? : ScopeData;
    isScopeEnd? : boolean;
    terminate? : boolean;
}
export type ParserResult = Either<AttributeParserError, SuccessfulParserResult>;

// Splits a string into one or more expression strings
export type AttributeParser = (attrib : string) => ParserResult;

export function defaultParser(attrib : string) : ParserResult {
    return parseExpression(attrib)
        .map((ast) => ({
            nodes: [assign(ast)]
        }));
}

export const NG_REPEAT_SPECIAL_PROPERTIES : ParameterNode[] = [
    parameter(`$index`, `number`),
    parameter(`$first`, `boolean`),
    parameter(`$last`, `boolean`),
    parameter(`$middle`, `boolean`),
    parameter(`$even`, `boolean`),
    parameter(`$odd`, `boolean`),
    parameter(`$id`, `(value : any) => string`)
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
    const rhsString = match[2];
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

    const containingNode = scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES);

    return parseExpression(rhsString)
        .flatMap((rhs) => {
            if (aliasAs) { // "as" syntax aliases the filtered iterable
                containingNode.children.push(assign(rhs, { name: aliasAs }));
                return parseExpression(aliasAs);
            } else {
                return Either.Right(rhs);
            }
        }).flatMap((iterable) => {
            let iteratorNode : ObjectIterationNode | ArrayIterationNode;
            if (keyIdentifier) {
                iteratorNode = objectIteration(keyIdentifier, valueIdentifier, iterable);
            } else {
                iteratorNode = arrayIteration(valueIdentifier, iterable);
            }

            if (trackByExp && trackByExp !== '$index') {
                return parseExpression(trackByExp)
                    .map((trackByExpAst) => {
                        iteratorNode.children.push(assign(trackByExpAst));
                        return iteratorNode;
                    });
            } else {
                return Either.Right(iteratorNode);
            }
        }).map((iteratorNode) => {
            containingNode.children.push(iteratorNode);

            return {
                nodes: [containingNode],
                isScopeEnd: true,
                scopeData: {
                    root: containingNode,
                    childParent: iteratorNode
                }
            };
        });
}

export function wrapParseScopeStart(parser : AttributeParser) : AttributeParser {
    return (expression : string) => {
        return parser(expression)
            .map((result : SuccessfulParserResult) => {
                return {
                    ...result,
                    isScopeEnd: false
                };
            });
    };
}

export function parseScopeEnd(_expression? : string) : ParserResult {
    return Either.Right({
        nodes: [],
        isScopeEnd: true
    });
}

export function parseNgIf(expression : string) : ParserResult {
    return parseExpression(expression)
        .map((ast) => {
            const node = ifStatement(ast);
            return {
                nodes: [node],
                scopeData: {
                    root: node,
                    childParent: node
                }
            };
        });
}

export function parseEventDirective(expression : string) : ParserResult {
    return parseExpression(expression)
        .map((ast) => {
            const node = scopedBlock([
                // not ideal, consumers need to manually import IAngularEvent
                parameter(`$event`, `IAngularEvent`)
            ], [
                assign(ast)
            ]);
            return {
                nodes: [node]
            };
        });
}

function parseExpressions(expressions : string[]) : Either<AttributeParserError, ProgramNode[]> {
    return Either.Right<AttributeParserError, string[]>(expressions)
        .flatMap((expressions) => {
            return expressions.map(parseExpression)
                .reduce((accumulator : Either<NgExpressionParserError, ProgramNode[]>, currentValue : Either<NgExpressionParserError, ProgramNode>) : Either<NgExpressionParserError, ProgramNode[]> => {
                    if (accumulator.isLeft()) {
                        return accumulator;
                    } else if (currentValue.isLeft()) {
                        return Either.Left(currentValue.left());
                    } else {
                        return Either.Right(accumulator.right().concat(currentValue.right()));
                    }
                }, Either.Right([]));
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
            expressions.push(exp);
            index = endIndex + endSymbolLength;
        } else {
            break;
        }
    }

    return parseExpressions(expressions)
        .map((asts) => ({
            nodes: asts.map((ast) => assign(ast))
        }));
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
    const valueExpr = match[2] ? match[1] : valueName;
    const viewValueExpr = selectAs || valueExpr;

    const displayExpr = match[2] || match[1];
    const groupByExpr = match[3] || '';
    const disableWhenExpr = match[4] || '';
    const valuesExpr = match[8];

    // Convert to generator AST
    const nodes : GeneratorAstNode[] = [];
    let iteratorNode : ArrayIterationNode | ObjectIterationNode;

    return parseExpression(valuesExpr)
        .flatMap((valuesAst) => {
            if (keyName) {
                iteratorNode = objectIteration(keyName, valueName, valuesAst);
            } else {
                iteratorNode = arrayIteration(valueName, valuesAst);
            }
            nodes.push(iteratorNode);

            const expressionsToParse = [];
            if (viewValueExpr !== valueName) {
                expressionsToParse.push(viewValueExpr);
            }
            if (displayExpr !== valueName) {
                expressionsToParse.push(displayExpr);
            }
            if (groupByExpr) {
                expressionsToParse.push(groupByExpr);
            }
            if (disableWhenExpr) {
                expressionsToParse.push(disableWhenExpr);
            }
            if (trackBy) {
                expressionsToParse.push(trackBy);
            }
            return parseExpressions(expressionsToParse);
        }).map((asts) => {
            asts.forEach((ast) => {
                iteratorNode.children.push(assign(ast));
            });
            return {
                nodes
            };
        });
}

const CNTRL_REG = /^(\S+)(\s+as\s+([\w$]+))?$/;
export function parseNgController(expression : string) : ParserResult {
    const match = expression.match(CNTRL_REG);
    if (!match) {
        return Either.Left(new AttributeParserError(
            `Badly formed controller string '${ expression }'. ` +
            'Must match `__name__ as __id__` or `__name__`.'));
    }
    const constructorInterface = match[1] + 'Scope';
    const identifier = match[3];

    const scopeInterface = identifier
        ? `{ ${ identifier } : ${ constructorInterface } }`
        : constructorInterface;


    const scope = scopedBlock([], [], scopeInterface);

    return Either.Right({
        nodes: [scope],
        scopeData: <ScopeData> {
            root: scope,
            childParent: scope
        }
    });
}