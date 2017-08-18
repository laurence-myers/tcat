import {
    defaultParser,
    NG_REPEAT_SPECIAL_PROPERTIES,
    parseNgOptions,
    parseNgRepeat,
    SuccessfulParserResult
} from "../src/parsers";
import * as assert from "assert";
import {AttributeParserError} from "../src/core";
import {GeneratorAstNode} from "../src/generator/ast";
import {arrayIteration, assign, declare, objectIteration, scopedBlock} from "../src/generator/dsl";

describe(`Parsers`, function() {
    describe(`expressions with filters`, function () {
        it(`can invoke a filter with one-time binding`, function () {
            const expression = `:: 'SOME.KEY' | translate`;
            const result = defaultParser(expression);
            assert.ok(result.isRight(), `Failed to parse expression: ${ expression }`);
            const actual = result.right();
            const expected = [
                {
                    type: "AssignmentNode",
                    expression: {
                        type: 'Program',
                        body: [{
                            expression: {
                                "type": "CallExpression",
                                arguments: [{
                                    type: "Literal",
                                    isString: true,
                                    value: "SOME.KEY"
                                }],
                                callee: {
                                    type: "Identifier",
                                    name: "translate"
                                },
                                filter: true
                            },
                            type: "ExpressionStatement"
                        }]
                    },
                    variableType: 'const',
                    typeAnnotation: undefined,
                    name: undefined
                }
            ];
            assert.deepEqual(actual.nodes, expected);
        });
    });

    describe(`parseNgRepeat`, function () {
        function specialProperties() : GeneratorAstNode[] {
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

        function testExpression(expression : string) : SuccessfulParserResult {
            const result = parseNgRepeat(expression);
            assert.ok(result.isRight(), `Failed to parse expression: ${ expression }`);
            return result.right();
        }

        function testParseFailure(expression : string) : AttributeParserError {
            const result = parseNgRepeat(expression);
            assert.ok(result.isLeft(), `Expected expression to fail parsing: ${ expression }`);
            return result.left();
        }

        it(`should iterate over an array of objects`, function () {
            const iterationNode = arrayIteration('item', 'items');
            const rootNode = scopedBlock([
                ...specialProperties(),
                iterationNode
            ]);
            const actual = testExpression('item in items');
            const expected = [
                rootNode
            ];
            assert.deepEqual(actual.nodes, expected);
            assert.deepEqual(actual.scopeData, {
                isStart: true,
                isEnd: true,
                root: rootNode,
                childParent: iterationNode
            });
        });

        it(`should be possible to use one-time bindings on the collection`, function () {
            const actual = testExpression('item in ::items');
            const expected = [
                scopedBlock([
                    ...specialProperties(),
                    arrayIteration('item', 'items')
                ])
            ];
            assert.deepEqual(actual.nodes, expected);
        });

        it(`should iterate over on object/map`, function () {
            const actual = testExpression('(key, value) in items');
            const expected = [
                scopedBlock([
                    ...specialProperties(),
                    objectIteration('key', 'value', 'items')
                ])
            ];
            assert.deepEqual(actual.nodes, expected);
        });

        it(`should iterate over on object/map where (key,value) contains whitespaces`, function () {
            const actual = testExpression(`(  key ,  value  ) in items`);
            const expected = [
                scopedBlock([
                    ...specialProperties(),
                    objectIteration('key', 'value', 'items')
                ])
            ];
            assert.deepEqual(actual.nodes, expected);
        });

        it(`should track using expression function`, function () {
            const actual = testExpression(`item in items track by item.id`);
            const expected = [
                scopedBlock([
                    ...specialProperties(),
                    arrayIteration('item', 'items', [
                        assign('item.id')
                    ]),
                ])
            ];
            assert.deepEqual(actual.nodes, expected);
        });

        it(`should track using build in $id function`, function () {
            const actual = testExpression(`item in items track by $id(item)`);
            const expected = [
                scopedBlock([
                    ...specialProperties(),
                    arrayIteration('item', 'items', [
                        declare('$id', '(value : any) => string'),
                        assign('$id(item)')
                    ]),
                ])
            ];
            assert.deepEqual(actual.nodes, expected);
        });

        it('should still filter when track is present', function() {
            const actual = testExpression(`item in items | filter:isIgor track by $id(item)`);
            const expected = [
                scopedBlock([
                    ...specialProperties(),
                    arrayIteration('item', 'items | filter : isIgor', [
                        declare('$id', '(value : any) => string'),
                        assign('$id(item)')
                    ]),
                ])
            ];
            assert.deepEqual(actual.nodes, expected);
        });

        it('should track using provided function when a filter is present', function() {
            const actual = testExpression(`item in items | filter:newArray track by item.id`);
            const expected = [
                scopedBlock([
                    ...specialProperties(),
                    arrayIteration('item', 'items | filter : newArray', [
                        assign('item.id')
                    ]),
                ])
            ];
            assert.deepEqual(actual.nodes, expected);
        });

        it('should iterate over an array of primitives', function() {
            const actual = testExpression(`item in items track by $index`);
            const expected = [
                scopedBlock([
                    ...specialProperties(),
                    arrayIteration('item', 'items', [
                    ]),
                ])
            ];
            assert.deepEqual(actual.nodes, expected);
        });

        it('should iterate over object with changing primitive property values', function() {
            const actual = testExpression('(key, value) in items track by $index');
            const expected = [
                scopedBlock([
                    ...specialProperties(),
                    objectIteration('key', 'value', 'items', [
                    ]),
                ])
            ];
            assert.deepEqual(actual.nodes, expected);
        });

        describe('alias as', function() {
            it('should assigned the filtered to the target scope property if an alias is provided', function() {
                const actual = testExpression('item in items | filter:x as results track by $index');
                const expected = [
                    scopedBlock([
                        ...specialProperties(),
                        assign('items | filter : x', {
                            name: 'results'
                        }),
                        arrayIteration('item', 'results', [
                        ]),
                    ])
                ];
                assert.deepEqual(actual.nodes, expected);
            });

            it('should throw if alias identifier is not a simple identifier', function() {
                const aliases = [
                    'null',
                    'this',
                    'undefined',
                    '$parent',
                    '$root',
                    '$id',
                    '$index',
                    '$first',
                    '$middle',
                    '$last',
                    '$even',
                    '$odd',
                    'obj[key]',
                    'obj["key"]',
                    'obj[\'key\']',
                    'obj.property',
                    'foo=6'
                ];

                for (const expr of aliases) {
                    const expression = ('item in items | filter:x as ' + expr + ' track by $index').replace(/"/g, '&quot;');
                    testParseFailure(expression);
                }
            });
        });
    });

    describe(`parseNgOptions`, function () {
        function testExpression(expression : string) : SuccessfulParserResult {
            const result = parseNgOptions(expression);
            assert.ok(result.isRight(), `Failed to parse expression: ${ expression }`);
            return result.right();
        }

        function verifyExpression(expression : string, expected : GeneratorAstNode[]) : void {
            const actual = testExpression(expression);
            assert.deepEqual(actual.nodes, expected);
        }

        it(`should parse a list`, function () {
            verifyExpression(`value.name for value in values`, [
                arrayIteration(`value`, `values`, [
                    assign(`value.name`)
                ])
            ]);
        });

        it(`should parse an object`, function () {
            verifyExpression(`value for (key, value) in values`,[
                objectIteration(`key`, `value`, `values`, [
                ])
            ]);
        });

        it(`should parse an object with label`, function () {
            verifyExpression(`value as key for (key, value) in values`, [
                objectIteration(`key`, `value`, `values`, [
                    assign(`key`)
                ])
            ]);
        });

        it(`should parse the label expression`, function () {
            verifyExpression(`option.id as option.display for option in values`, [
                arrayIteration(`option`, `values`, [
                    assign(`option.id`),
                    assign(`option.display`)
                ])
            ]);
        });

        it(`should parse a function call in the label expression`, function () {
            verifyExpression(`value as createLabel(value) for value in array`, [
                arrayIteration(`value`, `array`, [
                    assign(`createLabel(value)`)
                ])
            ]);
        });

        it(`should parse a filtered iterable`, function () {
            verifyExpression(`value for value in array | filter : isNotFoo`, [
                arrayIteration(`value`, `array | filter : isNotFoo`, [
                ])
            ]);
        });

        it(`should parse one-time binding`, function () {
            verifyExpression(`value for value in ::array`, [
                arrayIteration(`value`, `array`, [
                ])
            ]);
        });

        it(`should parse disableWhen expression`, function () {
            verifyExpression(`o.value as o.name disable when o.unavailable for o in options`, [
                arrayIteration(`o`, `options`, [
                    assign(`o.value`),
                    assign(`o.name`),
                    assign(`o.unavailable`)
                ])
            ]);
        });

        it(`should parse single select with object source`, function () {
            verifyExpression(`val.score as val.label for (key, val) in obj`, [
                objectIteration(`key`, `val`, `obj`, [
                    assign(`val.score`),
                    assign(`val.label`)
                ])
            ]);
        });

        it(`should parse track by`, function () {
            verifyExpression(`item.label for item in arr track by item.id`, [
                arrayIteration(`item`, `arr`, [
                    assign(`item.label`),
                    assign(`item.id`)
                ])
            ]);
        });

        it(`should parse nested track by`, function () {
            verifyExpression(`item.subItem as item.subItem.label for item in arr track by (item.id || item.subItem.id)`, [
                arrayIteration(`item`, `arr`, [
                    assign(`item.subItem`),
                    assign(`item.subItem.label`),
                    assign(`item.id || item.subItem.id`)
                ])
            ]);
        });

        it(`should parse group by`, function () {
            verifyExpression(`item.name group by item.group for item in values`, [
                arrayIteration(`item`, `values`, [
                    assign(`item.name`),
                    assign(`item.group`)
                ])
            ]);
        });

        it(`should parse array literal`, function () {
            verifyExpression(`item for item in ['first', 'second', 'third']`, [
                arrayIteration(`item`, `["first", "second", "third"]`, [
                ])
            ]);
        })
    });
});