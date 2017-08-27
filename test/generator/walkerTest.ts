import * as assert from "assert";
import {GeneratorAstNode} from "../../src/generator/ast";
import {TypeScriptGenerator} from "../../src/generator/walker";
import {arrayIteration, assign, objectIteration, scopedBlock, templateRoot} from "../../src/generator/dsl";
import {NG_REPEAT_SPECIAL_PROPERTIES} from "../../src/parsers";

describe(`Generator walker`, function () {
    describe(`TypeScriptGenerator`, function () {
        function walk(node : GeneratorAstNode) : string {
            const generator = new TypeScriptGenerator();
            return generator.generate(node);
        }

        it(`assigns an expression to a const`, function () {
            const expression = `!ctrl.tagClick`;
            const actual = walk(assign(expression));
            const expected = `const _expr_1 = (!_scope_0.ctrl.tagClick);\n`;
            assert.equal(actual, expected);
        });

        it(`assigns multiple identical expressions to separate variables`, function () {
            const expression = `!ctrl.tagClick`;
            const actual = walk(scopedBlock([], [
                assign(expression),
                assign(expression)
            ]));
            const expected = `function _block_1() {
    const _expr_1 = (!_scope_0.ctrl.tagClick);
    const _expr_2 = (!_scope_0.ctrl.tagClick);
}\n`;
            assert.equal(actual, expected);
        });

        describe(`ngRepeat`, function () {
            it(`should iterate over an array of objects`, function () {
                const actual = walk(scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                    arrayIteration('item', 'items')
                ]));
                const expected = `function _block_1(
    $index : number,
    $first : boolean,
    $last : boolean,
    $middle : boolean,
    $even : boolean,
    $odd : boolean,
    $id : (value : any) => "",
) {
    for (const item of (_scope_0.items)) {
    }
}
`;
                assert.equal(actual, expected);
            });

            it(`should iterate over on object/map`, function () {
                const actual = walk(scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                    objectIteration('key', 'value', 'items')
                ]));
                const expected = `function _block_1(
    $index : number,
    $first : boolean,
    $last : boolean,
    $middle : boolean,
    $even : boolean,
    $odd : boolean,
    $id : (value : any) => "",
) {
    for (const key in (_scope_0.items)) {
        const value = (_scope_0.items)[key];
    }
}
`;
                assert.equal(actual, expected);
            });

            it(`should not look for locals in the scope object`, function () {
                const actual = walk(scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                    arrayIteration('item', 'items', [
                        assign(`item.name`),
                        assign(`someScopedValue`)
                    ])
                ]));
                const expected = `function _block_1(
    $index : number,
    $first : boolean,
    $last : boolean,
    $middle : boolean,
    $even : boolean,
    $odd : boolean,
    $id : (value : any) => "",
) {
    for (const item of (_scope_0.items)) {
        const _expr_1 = (item.name);
        const _expr_2 = (_scope_0.someScopedValue);
    }
}
`;
                assert.equal(actual, expected);
            });
        });

        it(`should de-allocate locals outside of blocks`, function () {
            const actual = walk(
                templateRoot([
                    scopedBlock([], [
                        scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                            arrayIteration('item', 'items', [
                                assign(`item.name`),
                                assign(`someScopedValue`)
                            ]),
                            assign(`item.name`)
                        ]),
                        scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                            objectIteration('someKey', 'someValue', 'someObject', [
                                assign(`someKey + '1'`),
                                assign(`someValue`)
                            ]),
                            assign(`someKey`),
                            assign(`someValue`)
                        ]),
                        assign(`_expr_7`),
                        assign(`$index`)
                    ], 'TemplateScope')
                ])
            );
            const expected = `declare const _scope_1 : TemplateScope;
function _block_1() {
    function _block_2(
        $index : number,
        $first : boolean,
        $last : boolean,
        $middle : boolean,
        $even : boolean,
        $odd : boolean,
        $id : (value : any) => "",
    ) {
        for (const item of (_scope_1.items)) {
            const _expr_1 = (item.name);
            const _expr_2 = (_scope_1.someScopedValue);
        }
        const _expr_3 = (_scope_1.item.name);
    }
    function _block_3(
        $index : number,
        $first : boolean,
        $last : boolean,
        $middle : boolean,
        $even : boolean,
        $odd : boolean,
        $id : (value : any) => "",
    ) {
        for (const someKey in (_scope_1.someObject)) {
            const someValue = (_scope_1.someObject)[someKey];
            const _expr_4 = (someKey + "1");
            const _expr_5 = (someValue);
        }
        const _expr_6 = (_scope_1.someKey);
        const _expr_7 = (_scope_1.someValue);
    }
    const _expr_8 = (_scope_1._expr_7);
    const _expr_9 = (_scope_1.$index);
}
`;
            assert.equal(actual, expected);
        });
    });
});