import * as assert from "assert";
import {GeneratorAstNode} from "../../src/generator/ast";
import {TypeScriptGenerator} from "../../src/generator/walker";
import {arrayIteration, assign, objectIteration, scopedBlock} from "../../src/generator/dsl";
import {NG_REPEAT_SPECIAL_PROPERTIES} from "../../src/parsers";

describe(`Generator walker`, function () {
    describe(`TypeScriptGenerator`, function () {
        function walk(node : GeneratorAstNode) : string {
            const generator = new TypeScriptGenerator();
            return generator.generate(node);
        }

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

        it(`assigns an expression to a const`, function () {
            const expression = `!ctrl.tagClick`;
            const actual = walk(assign(expression));
            const expected = `const expr_1 = (!__scope_1.ctrl.tagClick);\n`;
            assert.equal(actual, expected);
        });

        it(`assigns multiple identical expressions to separate variables`, function () {
            const expression = `!ctrl.tagClick`;
            const actual = walk(scopedBlock([
                assign(expression),
                assign(expression)
            ]));
            const expected = `function block_1() {
    const expr_1 = (!__scope_1.ctrl.tagClick);
    const expr_2 = (!__scope_1.ctrl.tagClick);
}\n`;
            assert.equal(actual, expected);
        });

        describe(`ngRepeat`, function () {
            it(`should iterate over an array of objects`, function () {
                const actual = walk(scopedBlock([
                    ...specialNgRepeatProperties(),
                    arrayIteration('item', 'items')
                ]));
                const expected = `function block_1() {
    const $index : number = (0);
    const $first : boolean = (false);
    const $last : boolean = (false);
    const $middle : boolean = (false);
    const $even : boolean = (false);
    const $odd : boolean = (false);
    for (const item of (__scope_1.items)) {
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
    const $index : number = (0);
    const $first : boolean = (false);
    const $last : boolean = (false);
    const $middle : boolean = (false);
    const $even : boolean = (false);
    const $odd : boolean = (false);
    for (const key in (__scope_1.items)) {
        const value = (__scope_1.items)[key];
    }
}
`;
                assert.equal(actual, expected);
            });

            it(`should not look for locals in the scope object`, function () {
                const actual = walk(scopedBlock([
                    ...specialNgRepeatProperties(),
                    arrayIteration('item', 'items', [
                        assign(`item.name`),
                        assign(`someScopedValue`)
                    ])
                ]));
                const expected = `function block_1() {
    const $index : number = (0);
    const $first : boolean = (false);
    const $last : boolean = (false);
    const $middle : boolean = (false);
    const $even : boolean = (false);
    const $odd : boolean = (false);
    for (const item of (__scope_1.items)) {
        const expr_1 = (item.name);
        const expr_2 = (__scope_1.someScopedValue);
    }
}
`;
                assert.equal(actual, expected);
            });
        });

        it(`should de-allocate locals outside of blocks`, function () {
            const actual = walk(scopedBlock([
                scopedBlock([
                    ...specialNgRepeatProperties(),
                    arrayIteration('item', 'items', [
                        assign(`item.name`),
                        assign(`someScopedValue`)
                    ]),
                    assign(`item.name`)
                ]),
                scopedBlock([
                    ...specialNgRepeatProperties(),
                    objectIteration('someKey', 'someValue', 'someObject', [
                        assign(`someKey + '1'`),
                        assign(`someValue`)
                    ]),
                    assign(`someKey`),
                    assign(`someValue`)
                ]),
                assign(`expr_7`),
                assign(`$index`)
            ]));
            const expected = `function block_1() {
    function block_2() {
        const $index : number = (0);
        const $first : boolean = (false);
        const $last : boolean = (false);
        const $middle : boolean = (false);
        const $even : boolean = (false);
        const $odd : boolean = (false);
        for (const item of (__scope_1.items)) {
            const expr_1 = (item.name);
            const expr_2 = (__scope_1.someScopedValue);
        }
        const expr_3 = (__scope_1.item.name);
    }
    function block_3() {
        const $index : number = (0);
        const $first : boolean = (false);
        const $last : boolean = (false);
        const $middle : boolean = (false);
        const $even : boolean = (false);
        const $odd : boolean = (false);
        for (const someKey in (__scope_1.someObject)) {
            const someValue = (__scope_1.someObject)[someKey];
            const expr_4 = (someKey + "1");
            const expr_5 = (someValue);
        }
        const expr_6 = (__scope_1.someKey);
        const expr_7 = (__scope_1.someValue);
    }
    const expr_8 = (__scope_1.expr_7);
    const expr_9 = (__scope_1.$index);
}
`;
            assert.equal(actual, expected);
        });
    });
});