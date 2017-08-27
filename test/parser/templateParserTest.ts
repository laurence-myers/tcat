import {parseHtml} from "../../src/parser/templateParser";
import * as assert from "assert";
import {assign, templateRoot, scopedBlock, parameter} from "../../src/generator/dsl";
import {TemplateRootNode} from "../../src/generator/ast";
import {createDirectiveMap, DirectiveData} from "../../src/directives";
import {asHtmlContents} from "../../src/core";

describe(`Template parsers`, function () {
    describe(`parseHtml`, function () {
        function verifyHtml(html : string, expected : TemplateRootNode, directives : DirectiveData[]) {
            const either = parseHtml(asHtmlContents(html), 'TemplateScope', createDirectiveMap(directives));
            either.bimap((errors) => {
                assert.ok(either.isRight(), "Expected to parse HTML successfully, got errors: " + errors.join('\n'));
            }, () => {
                const result = either.right();
                assert.deepEqual(result, expected);
            });
        }

        it(`parses ng-template with nested elements`, function () {
            const html = `<script type="text/ng-template" id="some/nested/template.html">
    <div ng-click="someFunc()"></div>
</script>`;
            const expected = templateRoot([
                scopedBlock([], [
                ], `TemplateScope`),
                scopedBlock([], [
                    assign(`someFunc()`)
                ], `SomeNestedTemplateHtmlScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`parses ng-template with nested ng-template`, function () {
            const html = `<script type="text/ng-template" id="some/nested/template.html">
    <script type="text/ng-template" id="another/nested/template.html">
        <div ng-click="someFunc()"></div>
    </script>
</script>`;
            const expected = templateRoot([
                scopedBlock([], [
                ], `TemplateScope`),
                scopedBlock([], [
                ], `SomeNestedTemplateHtmlScope`),
                scopedBlock([], [
                    assign(`someFunc()`)
                ], `AnotherNestedTemplateHtmlScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`parses custom element directives`, function () {
            const html = `<my-element-directive first-arg="scopeProperty1"></my-element-directive>`;
            const directives = [
                {
                    name: "my-element-directive", // TODO: normalise names
                    canBeElement: true,
                    canBeAttribute: false,
                    attributes: [
                        {
                            name: "first-arg"
                        }
                    ]
                }
            ];
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`scopeProperty1`)
                ], `TemplateScope`),
            ]);
            verifyHtml(html, expected, directives);
        });

        xit(`parses custom element directives with transcluded content`, function () {

        });

        it(`parses custom attribute directives`, function () {
            const html = `<div my-attribute-directive first-arg="scopeProperty1"></div>`;
            const directives = [
                {
                    name: "my-attribute-directive", // TODO: normalise names
                    canBeElement: false,
                    canBeAttribute: true,
                    attributes: [
                        {
                            name: "first-arg"
                        }
                    ]
                }
            ];
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`scopeProperty1`)
                ], `TemplateScope`),
            ]);
            verifyHtml(html, expected, directives);
        });

        it(`parses custom attribute directives with expression locals`, function () {
            const html = `<div my-attribute-directive first-arg="updateSomeValue(localValue)"></div>`;
            const directives = [
                {
                    name: "my-attribute-directive", // TODO: normalise names
                    canBeElement: false,
                    canBeAttribute: true,
                    attributes: [
                        {
                            name: "first-arg",
                            locals: [
                                {
                                    name: "localValue",
                                    type: "string"
                                }
                            ]
                        }
                    ]
                }
            ];
            const expected = templateRoot([
                scopedBlock([], [
                    scopedBlock([parameter(`localValue`, `string`)], [
                        assign(`updateSomeValue(localValue)`)
                    ])
                ], `TemplateScope`),
            ]);
            verifyHtml(html, expected, directives);
        });

        it(`parses a form element with a name`, function () {
            const html = `<form name="myForm"><p>{{ myForm.$error.required }}</p></form>`;
            const expected = templateRoot([
                scopedBlock([], [
                    scopedBlock([
                        parameter(`myForm`, `IMyForm`)
                    ], [
                        assign(`myForm.$error.required`)
                    ])
                ], `TemplateScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`parses a form element without a name`, function () {
            const html = `<form><p>{{ myForm.$error.required }}</p></form>`;
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`myForm.$error.required`)
                ], `TemplateScope`)
            ]);
            verifyHtml(html, expected, []);
        });
    });
});