import {parseExpressionToAst} from "../../src/ngExpression/ngAstBuilder";
import {ExpressionFilterRectifier, ExpressionToStringWalker} from "../../src/ngExpression/expressionWalker";
import * as assert from "assert";

describe(`Expression walkers`, function () {
    function toAstToString(expression : string) {
        const ast = parseExpressionToAst(expression);
        const walker = new ExpressionToStringWalker();
        return walker.walk(ast);
    }

    function rectified(expression : string) {
        const ast = parseExpressionToAst(expression);
        const walker = new ExpressionFilterRectifier();
        return walker.walk(ast);
    }

    describe(`ExpressionToStringWalker`, function () {
        it(`Transforms an expression AST back to what it was`, function () {
            const expression = `someValue|translate:'en-US'`;
            const expected = `someValue | translate : "en-US"`;
            const actual = toAstToString(expression);
            assert.equal(actual, expected);
        });

        it(`Transforms an expression AST with multiple filters`, function () {
            const expression = `someValue | translate : 'en-US' | limitTo : 3`;
            const expected = `someValue | translate : "en-US" | limitTo : 3`;
            const actual = toAstToString(expression);
            assert.equal(actual, expected);
        });
    });

    describe(`ExpressionFilterRectifier`, function () {
        it(`Rectifies filters`, function () {
            const expression = `someValue | translate : 'en-US' | limitTo : 3`;
            const expected = `limitTo(translate(someValue, "en-US"), 3)`;
            const actual = rectified(expression);
            assert.equal(actual, expected);
        });

        it(`Handles multiple filtered expressions`, function () {
            const expression = `(someValue | translate : 'en-US' | limitTo : 3) + (anotherValue | parse) | number`;
            const expected = `number(limitTo(translate(someValue, "en-US"), 3) + parse(anotherValue))`;
            const actual = rectified(expression);
            assert.equal(actual, expected);
        });
    });
});