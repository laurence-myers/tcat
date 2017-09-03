import * as assert from "assert";
import {GeneratorAstNode} from "../../src/generator/ast";
import {TypeScriptGenerator} from "../../src/generator/walker";
import {arrayIteration, assign, objectIteration, scopedBlock, templateRoot} from "../../src/generator/dsl";
import {NG_REPEAT_SPECIAL_PROPERTIES} from "../../src/parser/attributes";

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
            const expected = `const _block_1 = function () {
    const _expr_1 = (!_scope_0.ctrl.tagClick);
    const _expr_2 = (!_scope_0.ctrl.tagClick);
};\n`;
            assert.equal(actual, expected);
        });

        describe(`ngRepeat`, function () {
            it(`should iterate over an array of objects`, function () {
                const actual = walk(scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                    arrayIteration('item', 'items')
                ]));
                const expected = `const _block_1 = function (
    $index : number,
    $first : boolean,
    $last : boolean,
    $middle : boolean,
    $even : boolean,
    $odd : boolean,
    $id : (value : any) => string,
) {
    for (const item of (_scope_0.items)) {
    }
};
`;
                assert.equal(actual, expected);
            });

            it(`should iterate over on object/map`, function () {
                const actual = walk(scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                    objectIteration('key', 'value', 'items')
                ]));
                const expected = `const _block_1 = function (
    $index : number,
    $first : boolean,
    $last : boolean,
    $middle : boolean,
    $even : boolean,
    $odd : boolean,
    $id : (value : any) => string,
) {
    for (const key in (_scope_0.items)) {
        const value = (_scope_0.items)[key];
    }
};
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
                const expected = `const _block_1 = function (
    $index : number,
    $first : boolean,
    $last : boolean,
    $middle : boolean,
    $even : boolean,
    $odd : boolean,
    $id : (value : any) => string,
) {
    for (const item of (_scope_0.items)) {
        const _expr_1 = (item.name);
        const _expr_2 = (_scope_0.someScopedValue);
    }
};
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
            const expected = `const _block_1 = function (
    _scope_1 : TemplateScope,
) {
    const _block_2 = function (
        $index : number,
        $first : boolean,
        $last : boolean,
        $middle : boolean,
        $even : boolean,
        $odd : boolean,
        $id : (value : any) => string,
    ) {
        for (const item of (_scope_1.items)) {
            const _expr_1 = (item.name);
            const _expr_2 = (_scope_1.someScopedValue);
        }
        const _expr_3 = (_scope_1.item.name);
    };
    const _block_3 = function (
        $index : number,
        $first : boolean,
        $last : boolean,
        $middle : boolean,
        $even : boolean,
        $odd : boolean,
        $id : (value : any) => string,
    ) {
        for (const someKey in (_scope_1.someObject)) {
            const someValue = (_scope_1.someObject)[someKey];
            const _expr_4 = (someKey + "1");
            const _expr_5 = (someValue);
        }
        const _expr_6 = (_scope_1.someKey);
        const _expr_7 = (_scope_1.someValue);
    };
    const _expr_8 = (_scope_1._expr_7);
    const _expr_9 = (_scope_1.$index);
};
`;
            assert.equal(actual, expected);
        });

        it(`should de-allocate scope numbers`, function () {
            const actual = walk(
                templateRoot([
                    scopedBlock([], [
                        scopedBlock([], [

                        ], `NestedScope`),
                        assign(`someValue`)
                    ], 'TemplateScope')
                ])
            );
            const expected = `const _block_1 = function (
    _scope_1 : TemplateScope,
) {
    const _block_2 = function (
        _scope_2 : NestedScope,
    ) {
    };
    const _expr_1 = (_scope_1.someValue);
};
`;
            assert.equal(actual, expected);
        });

        it(`should not look for object literal keys on the scope`, function () {
            const actual = walk(
                templateRoot([
                    scopedBlock([], [
                        assign(`{ active: isActive }`)
                    ], 'TemplateScope')
                ])
            );
            const expected = `const _block_1 = function (
    _scope_1 : TemplateScope,
) {
    const _expr_1 = ({ active: _scope_1.isActive });
};
`;
            assert.equal(actual, expected);
        });
    });
});