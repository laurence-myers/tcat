import {parseExpressionToAst} from "../../src/ngExpression/ngAstBuilder";
import {ExpressionFilterRectifier, ExpressionToStringWalker} from "../../src/ngExpression/expressionWalker";
import * as assert from "assert";
import {logObject} from "../../src/core";

describe(`Expression walkers`, function () {
    function toAstToString(expression : string) {
        const ast = parseExpressionToAst(expression);
        logObject(ast);
        const walker = new ExpressionToStringWalker();
        return walker.walk(ast);
    }

    function rectified(expression : string) {
        const ast = parseExpressionToAst(expression);
        logObject(ast);
        const walker = new ExpressionFilterRectifier();
        return walker.walk(ast);
    }

    function verifyExpressionToStringWalker(expression : string, expected : string) : void {
        const actual = toAstToString(expression);
        assert.equal(actual, expected);
    }

    function verifyExpressionFilterRectifier(expression : string, expected : string) : void {
        const actual = rectified(expression);
        assert.equal(actual, expected);
    }

    describe(`ExpressionToStringWalker`, function () {
        it(`Transforms an expression AST back to what it was`, function () {
            verifyExpressionToStringWalker(
                `someValue|translate:'en-US'`,
                `someValue | translate : "en-US"`
            );
        });

        it(`Transforms an expression AST with multiple filters`, function () {
            verifyExpressionToStringWalker(
                `anObject.someValue['member'] + someFunc(anotherValue) | translate : 'en-US' | limitTo : 3`,
                `anObject.someValue["member"] + someFunc(anotherValue) | translate : "en-US" | limitTo : 3`
            );
        });
    });

    describe(`ExpressionFilterRectifier`, function () {
        it(`Rectifies filters`, function () {
            verifyExpressionFilterRectifier(
                `someValue | translate : 'en-US' | limitTo : 3`,
                `limitTo(translate(someValue, "en-US"), 3)`
            );
        });

        it(`Rectifies an expression AST with multiple filters`, function () {
            verifyExpressionFilterRectifier(
                `anObject.someValue['member'] + someFunc(anotherValue) | translate : 'en-US' | limitTo : 3`,
                `limitTo(translate(anObject.someValue["member"] + someFunc(anotherValue), "en-US"), 3)`
            );
        });

        it(`Rectifies multiple filtered expressions`, function () {
            verifyExpressionFilterRectifier(
                `(someValue | translate : 'en-US' | limitTo : 3) + (anotherValue | parse) | number`,
                `number(limitTo(translate(someValue, "en-US"), 3) + parse(anotherValue))`
            );
        });
    });

    describe(`ExpressionScopeRectifier`, function () {
        it(`Rectifies scopes`, function () {
            const expression = `someValue`;
            const expected = `__scope_1.someValue`;
            const actual = rectified(expression);
            assert.equal(actual, expected);
        });

        it(`Rectifies multiple scoped references`, function () {
            const expression = `anObject.someValue['member'] + someFunc(anotherValue) + thirdValue + foo.bar() + rootFunc() | translate : 'en-US' | limitTo : 3`;
            const expected = `limitTo(translate(__scope_1.anObject.someValue["member"] + __scope_1.someFunc(__scope_1.anotherValue) + __scope_1.thirdValue + foo.bar() + rootFunc(), "en-US"), 3)`;
            const actual = rectified(expression);
            assert.equal(actual, expected);
        });
    });
});