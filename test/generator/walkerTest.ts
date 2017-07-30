import * as assert from "assert";
import {GeneratorAstNode} from "../../src/generator/ast";
import {TypeScriptGenerator} from "../../src/generator/walker";
import {expr} from "../../src/generator/dsl";

describe(`Walker`, function () {
    describe(`TypeScriptGenerator`, function () {
        function walk(node : GeneratorAstNode) : string {
            const generator = new TypeScriptGenerator();
            return generator.generate(node);
        }

        it(`assigns an expression to a const`, function () {
            const expression = `!ctrl.tagClick`;
            const actual = walk(expr(expression));
            const expected = `const expr_1 = !ctrl.tagClick;\n`;
            assert.equal(actual, expected);
        });
    });
});