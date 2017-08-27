import {parseExpression} from "../../src/ngExpression/ngAstBuilder";
import {
    ExpressionFilterRectifier,
    ExpressionScopeRectifier,
    ExpressionToStringWalker
} from "../../src/ngExpression/expressionWalker";
import * as assert from "assert";

describe(`Expression walkers`, function () {
    function toAstToString(expression : string) {
        const ast = parseExpression(expression);
        const walker = new ExpressionToStringWalker();
        return walker.walk(ast);
    }

    function rectified(expression : string) {
        const ast = parseExpression(expression);
        const walker = new ExpressionFilterRectifier();
        return walker.walk(ast);
    }

    function scopeRectified(expression : string, localsStack? : Set<string>[]) {
        const ast = parseExpression(expression);
        const walker = new ExpressionScopeRectifier(1, localsStack);
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

    function verifyExpressionScopeRectifier(expression : string, expected : string, locals? : Set<string>[]) : void {
        const actual = scopeRectified(expression, locals);
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
        it(`Rectifies scope for a variable`, function () {
            verifyExpressionScopeRectifier(
                `someValue`,
                `_scope_1.someValue`
            );
        });

        it(`Rectifies scope for a function call, passing a scoped argument`, function () {
            verifyExpressionScopeRectifier(
                `someFunc(someValue)`,
                `_scope_1.someFunc(_scope_1.someValue)`
            );
        });

        it(`Rectifies scope for a member expression`, function () {
            verifyExpressionScopeRectifier(
                `anObject.someValue['member']`,
                `_scope_1.anObject.someValue["member"]`
            );
        });

        it(`Rectifies scope for a member expression with a scoped argument`, function () {
            verifyExpressionScopeRectifier(
                `anObject.someValue[propertyName]`,
                `_scope_1.anObject.someValue[_scope_1.propertyName]`
            );
        });


        it(`Rectifies scope for multiple member expressions`, function () {
            verifyExpressionScopeRectifier(
                `anObject.anotherObject.someValue[propertyName]`,
                `_scope_1.anObject.anotherObject.someValue[_scope_1.propertyName]`
            );
        });

        it(`Rectifies scope for a member expression with a function call`, function () {
            verifyExpressionScopeRectifier(
                `foo.bar()`,
                `_scope_1.foo.bar()`
            );
        });

        it(`Does not rectify filters`, function () {
            verifyExpressionScopeRectifier(
                `rootFunc() | translate : 'en-US' | limitTo : 3`,
                `limitTo(translate(_scope_1.rootFunc(), "en-US"), 3)`
            );
        });

        it(`Rectifies scope for binary operations`, function () {
            verifyExpressionScopeRectifier(
                `someValue + anotherValue - thirdValue`,
                `_scope_1.someValue + _scope_1.anotherValue - _scope_1.thirdValue`
            );
        });

        it(`Does not rectify scope for locals`, function () {
            verifyExpressionScopeRectifier(
                `someValue`,
                `someValue`,
                [new Set<string>(['someValue'])]
            );
        });
    });
});