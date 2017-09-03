import {parseHtml} from "../../src/parser/templateParser";
import * as assert from "assert";
import {assign, templateRoot, scopedBlock, parameter, arrayIteration, ifStatement} from "../../src/generator/dsl";
import {TemplateRootNode} from "../../src/generator/ast";
import {createDirectiveMap, DirectiveData} from "../../src/directives";
import {asHtmlContents} from "../../src/core";
import {NG_REPEAT_SPECIAL_PROPERTIES} from "../../src/parser/attributes";

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
                    scopedBlock([
                        parameter(`$event`, `IAngularEvent`)
                    ], [
                        assign(`someFunc()`)
                    ])
                ], `SomeNestedTemplateHtmlScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`parses ng-template with proceeding sibling elements`, function () {
            const html = `<script type="text/ng-template" id="some/nested/template.html">
    <div ng-click="someFunc()"></div>
</script>
<div>{{ someValue }}</div>`;
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`someValue`)
                ], `TemplateScope`),
                scopedBlock([], [
                    scopedBlock([
                        parameter(`$event`, `IAngularEvent`)
                    ], [
                        assign(`someFunc()`)
                    ])
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
                    scopedBlock([
                        parameter(`$event`, `IAngularEvent`)
                    ], [
                        assign(`someFunc()`)
                    ])
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

        it(`parses nested multi-element ng-repeat directives`, function () {
            const html =
`<div ng-repeat-start="item in items">
    <div ng-repeat-start="value in item.values"></div>
    <div ng-repeat-end>{{ value }}</div>
</div>
<div ng-repeat-end>{{ item.name }}</div>`;
            const expected = templateRoot([
                scopedBlock([], [
                    scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                        arrayIteration(`item`, `items`, [
                            scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                                arrayIteration(`value`, `item.values`, [
                                    assign(`value`)
                                ])
                            ]),
                            assign(`item.name`)
                        ])
                    ])
                ], `TemplateScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`parses multi-element ng-show and ng-hide`, function () {
            const html =
`<div ng-show-start="items.length > 0"></div>
<div ng-show-end</div> {{ items[0] }}
<div ng-hide-start="items.length == 0"></div>
<p ng-hide-end>{{ items.length }} items found</p>`;
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`items.length > 0`),
                    assign(`items[0]`),
                    assign(`items.length == 0`),
                    assign(`items.length`)
                ], `TemplateScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`parses multi-element ng-if`, function () {
            const html =
`<div ng-if-start="someProperty"></div>
<div ng-if-end>{{ someProperty.name }}</div>`;
            const expected = templateRoot([
                scopedBlock([], [
                    ifStatement(`someProperty`, [
                        assign(`someProperty.name`)
                    ]),
                ], `TemplateScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`ng-if does not encapsulate following sibling expressions`, function () {
            const html =
                `<div ng-if="someProperty"></div>
<div>{{ someProperty.name }}`;
            const expected = templateRoot([
                scopedBlock([], [
                    ifStatement(`someProperty`, [
                    ]),
                    assign(`someProperty.name`)
                ], `TemplateScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`parses ng-click and provides an $event local`, function () {
            const html =
                `<div ng-click="doSomething($event)"></div>`;
            const expected = templateRoot([
                scopedBlock([], [
                    scopedBlock([
                        parameter(`$event`, `IAngularEvent`)
                    ], [
                        assign(`doSomething($event)`)
                    ])
                ], `TemplateScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`parses ng-controller directives`, function () {
            const html = `
<div ng-controller="FooController">{{ fooValue }}</div>
<div ng-controller="BarController as ctrl">{{ ctrl.barValue }}</div>`;
            const expected = templateRoot([
                scopedBlock([], [
                    scopedBlock([
                    ], [
                        assign(`fooValue`)
                    ], `FooControllerScope`),
                    scopedBlock([
                    ], [
                        assign(`ctrl.barValue`)
                    ], `{ ctrl : BarControllerScope }`)
                ], `TemplateScope`)
            ]);
            verifyHtml(html, expected, []);
        });

        it(`parses directives in order of priority - ng-repeat is parsed before ng-class`, function () {
            const html = `<a ng-class="item.class" ng-repeat="item in items"></a>`;
            const expected = templateRoot([
                scopedBlock([], [
                    scopedBlock(NG_REPEAT_SPECIAL_PROPERTIES, [
                        arrayIteration(`item`, `items`, [
                            assign(`item.class`)
                        ])
                    ])
                ], `TemplateScope`)
            ]);
            verifyHtml(html, expected, []);
        });
    });
});