import * as assert from "assert";
import {GeneratorAstNode} from "../../src/generator/ast";
import {TypeScriptGenerator} from "../../src/generator/walker";
import {arrayIteration, assign, objectIteration, scopedBlock} from "../../src/generator/dsl";
import {NG_REPEAT_SPECIAL_PROPERTIES} from "../../src/parsers";

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

        describe(`ngRepeat`, function () {
            function specialNgRepeatProperties() : GeneratorAstNode[] {
                const output : GeneratorAstNode[] = [];
                for (const specialProperty of NG_REPEAT_SPECIAL_PROPERTIES) {
                    output.push(assign(
                        specialProperty.value,
                        {
                            typeAnnotation: specialProperty.primitiveType,
                            name: specialProperty.name
                        }
                    ));
                }
                return output;
            }

            it(`should iterate over an array of objects`, function () {
                const actual = walk(scopedBlock([
                    ...specialNgRepeatProperties(),
                    arrayIteration('item', 'items')
                ]));
                const expected = `function block_1() {
const $index : number = 0;
const $first : boolean = false;
const $last : boolean = false;
const $middle : boolean = false;
const $even : boolean = false;
const $odd : boolean = false;
for (const item of items) {
}
}
`;
                assert.equal(actual, expected);
            });

            it(`should iterate over on object/map`, function () {
                const actual = walk(scopedBlock([
                    ...specialNgRepeatProperties(),
                    objectIteration('key', 'value', 'items')
                ]));
                const expected = `function block_1() {
const $index : number = 0;
const $first : boolean = false;
const $last : boolean = false;
const $middle : boolean = false;
const $even : boolean = false;
const $odd : boolean = false;
for (const key in items) {
const value = items[key];
}
}
`;
                assert.equal(actual, expected);
            });
        });
    });
});