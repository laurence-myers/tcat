import * as assert from "assert";
import {parseExpressionToAst} from "../../src/ngExpression/ngAstBuilder";

describe(`AST Builder/parser`, function () {
    it(`can parse an expression without filters`, function () {
        const expression = `print('some | silly : value')`;
        const ast = parseExpressionToAst(expression);
        assert.deepEqual(ast.expressionRanges, []);
    });

    it(`can parse 1 expression, 1 filter and 1 filter arg`, function () {
        const expression = `'SOME.KEY' + '.COM:PL|EX' | translate : 'en-US'`;
        const ast = parseExpressionToAst(expression);
        assert.deepEqual(ast.expressionRanges, [{
            range: {
                start: 0,
                end: 26
            },
            filters: [{
                range: {
                    start: 28,
                    end: 38
                },
                arguments: [{
                    start: 40,
                    end: 47
                }]
            }]
        }]);
        const baseExpression = expression.substring(ast.expressionRanges[0].range.start, ast.expressionRanges[0].range.end);
        assert.equal(baseExpression, `'SOME.KEY' + '.COM:PL|EX' `);
        const filterName = expression.substring(ast.expressionRanges[0].filters[0].range.start, ast.expressionRanges[0].filters[0].range.end);
        assert.equal(filterName, `translate `);
        const arg1 = expression.substring(ast.expressionRanges[0].filters[0].arguments[0].start, ast.expressionRanges[0].filters[0].arguments[0].end);
        assert.equal(arg1, `'en-US'`);
    });

    it(`can parse 1 expression, 2 filter and 1 + 2 filter args`, function () {
        const expression = `'SOME.KEY' + '.COM:PL|EX' | translate : 'en-US' | orderBy:'label':'id'`;
        const ast = parseExpressionToAst(expression);
        assert.deepEqual(ast.expressionRanges, [{
            range: {
                start: 0,
                end: 26
            },
            filters: [{
                range: {
                    start: 28,
                    end: 38
                },
                arguments: [{
                    start: 40,
                    end: 48
                }]
            }, {
                range: {
                    start: 50,
                    end: 57
                },
                arguments: [{
                    start: 58,
                    end: 65
                }, {
                    start: 66,
                    end: 70
                }]
            }]
        }]);
        const baseExpression = expression.substring(ast.expressionRanges[0].range.start, ast.expressionRanges[0].range.end);
        assert.equal(baseExpression, `'SOME.KEY' + '.COM:PL|EX' `);
        const filter1 = ast.expressionRanges[0].filters[0];
        let filterName = expression.substring(filter1.range.start, filter1.range.end);
        assert.equal(filterName, `translate `);
        let arg1 = expression.substring(filter1.arguments[0].start, filter1.arguments[0].end);
        assert.equal(arg1, `'en-US' `);
        const filter2 = ast.expressionRanges[0].filters[1];
        filterName = expression.substring(filter2.range.start, filter2.range.end);
        assert.equal(filterName, `orderBy`);
        arg1 = expression.substring(filter2.arguments[0].start, filter2.arguments[0].end);
        assert.equal(arg1, `'label'`);
        let arg2 = expression.substring(filter2.arguments[1].start, filter2.arguments[1].end);
        assert.equal(arg2, `'id'`);
    });

    it(`can parse multiple filtered expressions`, function () {
        const expression = `('hello' | upper) + ' ' + ('world' | upper)`;
        const ast = parseExpressionToAst(expression);
        console.log(ast.expressionRanges);
        // assert.deepEqual(ast.expressionRanges, [{
        //     range: {
        //         start: 0,
        //         end: 26
        //     },
        //     filters: [{
        //         range: {
        //             start: 28,
        //             end: 38
        //         },
        //         arguments: [{
        //             start: 40,
        //             end: 48
        //         }]
        //     }, {
        //         range: {
        //             start: 50,
        //             end: 57
        //         },
        //         arguments: [{
        //             start: 58,
        //             end: 65
        //         }, {
        //             start: 66,
        //             end: 70
        //         }]
        //     }]
        // }]);
        // const baseExpression = expression.substring(ast.expressionRanges[0].range.start, ast.expressionRanges[0].range.end);
        // assert.equal(baseExpression, `'SOME.KEY' + '.COM:PL|EX' `);
        // const filter1 = ast.expressionRanges[0].filters[0];
        // let filterName = expression.substring(filter1.range.start, filter1.range.end);
        // assert.equal(filterName, `translate `);
        // let arg1 = expression.substring(filter1.arguments[0].start, filter1.arguments[0].end);
        // assert.equal(arg1, `'en-US' `);
        // const filter2 = ast.expressionRanges[0].filters[1];
        // filterName = expression.substring(filter2.range.start, filter2.range.end);
        // assert.equal(filterName, `orderBy`);
        // arg1 = expression.substring(filter2.arguments[0].start, filter2.arguments[0].end);
        // assert.equal(arg1, `'label'`);
        // let arg2 = expression.substring(filter2.arguments[1].start, filter2.arguments[1].end);
        // assert.equal(arg2, `'id'`);
    });
});