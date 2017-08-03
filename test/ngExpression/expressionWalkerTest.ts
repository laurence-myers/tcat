import {parseExpressionToAst} from "../../src/ngExpression/ngAstBuilder";
import {ExpressionToStringWalker} from "../../src/ngExpression/expressionWalker";
import * as assert from "assert";

describe(`Expression walkers`, function () {
    function toAstToString(expression : string) {
        const ast = parseExpressionToAst(expression);
        const walker = new ExpressionToStringWalker();
        return walker.walk(ast);
    }

    describe(`ExpressionToStringWalker`, function () {
        it(`Transforms an expression AST back to what it was`, function () {
            const expression = `someValue|translate:'en-US'`;
            const expected = `someValue | translate : "en-US"`;
            const actual = toAstToString(expression);
            assert.equal(actual, expected);
        });
    });
});