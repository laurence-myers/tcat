import * as assert from "assert";
import {GeneratorAstNode} from "../../src/generator/ast";
import {TypeScriptGenerator} from "../../src/generator/walker";
import {assign, scopedBlock} from "../../src/generator/dsl";

describe(`Walker`, function () {
    describe(`TypeScriptGenerator`, function () {
        function walk(node : GeneratorAstNode) : string {
            const generator = new TypeScriptGenerator();
            return generator.generate(node);
        }

        it(`assigns an expression to a const`, function () {
            const expression = `!ctrl.tagClick`;
            const actual = walk(assign(expression));
            const expected = `const expr_1 = !ctrl.tagClick;\n`;
            assert.equal(actual, expected);
        });

        it(`assigns multiple identical expressions to separate variables`, function () {
            const expression = `!ctrl.tagClick`;
            const actual = walk(scopedBlock([
                assign(expression),
                assign(expression)
            ]));
            const expected = `function block_1() {\nconst expr_1 = !ctrl.tagClick;\nconst expr_2 = !ctrl.tagClick;\n}\n`;
            assert.equal(actual, expected);
        });
    });
});