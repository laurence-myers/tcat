import {NG_REPEAT_SPECIAL_PROPERTIES, parseNgRepeat, SuccessfulParserResult} from "../src/parsers";
import * as assert from "assert";
import {AttributeParserError} from "../src/core";
import {GeneratorAstNode} from "../src/generator/ast";
import {arrayIteration, assign, objectIteration, scopedBlock} from "../src/generator/dsl";

describe(`Parsers`, function() {
    // describe(`expressions with filters`, function () {
    //     it(`can invoke a filter`, function () {
    //         const expression = `'SOME.KEY' | translate`;
    //
    //     });
    // });

    describe(`parseNgRepeat`, function() {
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
            testExpression(`item in items track by $id(item)`);
        });

        it('should still filter when track is present', function() {
            testExpression(`item in items | filter:isIgor track by $id(item)`);
        });

        it('should track using provided function when a filter is present', function() {
            testExpression(`item in items | filter:newArray track by item.id`);
        });

        it('should iterate over an array of primitives', function() {
            testExpression(`item in items track by $index`);
        });

        it('should iterate over object with changing primitive property values', function() {
            testExpression('(key, value) in items track by $index');
        });

        describe('alias as', function() {
            it('should assigned the filtered to the target scope property if an alias is provided', function() {
                testExpression('item in items | filter:x as results track by $index');
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
});