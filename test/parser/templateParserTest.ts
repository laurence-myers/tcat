import {parseHtml} from "../../src/parser/templateParser";
import * as assert from "assert";
import {arrayIteration, assign, ifStatement, parameter, scopedBlock, templateRoot} from "../../src/generator/dsl";
import {TemplateRootNode} from "../../src/generator/ast";
import {createDirectiveMap, DirectiveData} from "../../src/directives";
import {asHtmlContents} from "../../src/core";
import {NG_REPEAT_SPECIAL_PROPERTIES} from "../../src/parser/attributes";

describe(`Template parsers`, function () {
    describe(`parseHtml`, function () {
        function verifyHtml(html : string, directives : DirectiveData[], expected : TemplateRootNode) {
            const either = parseHtml(asHtmlContents(html), 'TemplateScope', createDirectiveMap(directives));
            either.bimap((errors) => {
                assert.ok(either.isRight(), "Expected to parse HTML successfully, got errors: " + errors.join('\n'));
            }, () => {
                const result = either.right();
                assert.deepEqual(result, expected);
            });
        }

        function verifyParseFailure(html : string, directives : DirectiveData[], expectedErrorMessages : string[]) {
            const either = parseHtml(asHtmlContents(html), 'TemplateScope', createDirectiveMap(directives));
            either.bimap((errors) => {
                const messages = errors.map((err) => err.message);
                assert.deepEqual(messages, expectedErrorMessages);
            }, () => {
                assert.ok(either.isLeft(), "Expected to fail parsing HTML");
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
            verifyHtml(html, [], expected);
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
            verifyHtml(html, [], expected);
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
            verifyHtml(html, [], expected);
        });

        it(`parses custom element directives`, function () {
            const html = `<my-element-directive first-arg="scopeProperty1"></my-element-directive>`;
            const directives = [
                {
                    name: "myElementDirective",
                    canBeElement: true,
                    canBeAttribute: false,
                    attributes: [
                        {
                            name: "firstArg"
                        }
                    ]
                }
            ];
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`scopeProperty1`)
                ], `TemplateScope`),
            ]);
            verifyHtml(html, directives, expected);
        });

        /**
         * Translcuded content reads from the _outer_ scope. From the AngularJS docs:
         * "The transclude option changes the way scopes are nested.
         *  It makes it so that the contents of a transcluded directive have whatever scope is outside the directive,
         *  rather than whatever scope is on the inside.
         *  In doing so, it gives the contents access to the outside scope."
         */
        it(`parses custom element directives with transcluded content`, function () {
            const html = `<my-element-directive first-arg="scopeProperty1"><p>{{ someValue }}</p></my-element-directive>`;
            const directives = [
                {
                    name: "myElementDirective",
                    canBeElement: true,
                    canBeAttribute: false,
                    attributes: [
                        {
                            name: "firstArg"
                        }
                    ]
                }
            ];
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`scopeProperty1`),
                    assign(`someValue`)
                ], `TemplateScope`),
            ]);
            verifyHtml(html, directives, expected);
        });

        it(`parses custom attribute directives`, function () {
            const html = `<div my-attribute-directive first-arg="scopeProperty1"></div>`;
            const directives = [
                {
                    name: "myAttributeDirective",
                    canBeElement: false,
                    canBeAttribute: true,
                    attributes: [
                        {
                            name: "firstArg"
                        }
                    ]
                }
            ];
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`scopeProperty1`)
                ], `TemplateScope`),
            ]);
            verifyHtml(html, directives, expected);
        });

        it(`parses custom attribute directives with expression locals`, function () {
            const html = `<div my-attribute-directive first-arg="updateSomeValue(localValue)"></div>`;
            const directives = [
                {
                    name: "myAttributeDirective",
                    canBeElement: false,
                    canBeAttribute: true,
                    attributes: [
                        {
                            name: "firstArg",
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
            verifyHtml(html, directives, expected);
        });

        it(`parses directive attributes that contain interpolated text (e.g. scope bindings that use "@")`, function () {
            const html = `<div my-attribute-directive interpolated-arg="hello {{ name }}"></div>`;
            const directives : DirectiveData[] = [
                {
                    name: "myAttributeDirective",
                    canBeElement: false,
                    canBeAttribute: true,
                    attributes: [
                        {
                            name: "interpolatedArg",
                            mode: "interpolated"
                        }
                    ]
                }
            ];
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`name`)
                ], `TemplateScope`),
            ]);
            verifyHtml(html, directives, expected);
        });

        it(`parses optional directive attributes`, function () {
            const html = `<div my-attribute-directive></div>`;
            const directives : DirectiveData[] = [
                {
                    name: "myAttributeDirective",
                    canBeElement: false,
                    canBeAttribute: true,
                    attributes: [
                        {
                            name: "firstArg",
                            optional: true
                        }
                    ]
                }
            ];
            const expected = templateRoot([
                scopedBlock([], [
                ], `TemplateScope`),
            ]);
            verifyHtml(html, directives, expected);
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
            verifyHtml(html, [], expected);
        });

        it(`parses a form element without a name`, function () {
            const html = `<form><p>{{ myForm.$error.required }}</p></form>`;
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`myForm.$error.required`)
                ], `TemplateScope`)
            ]);
            verifyHtml(html, [], expected);
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
            verifyHtml(html, [], expected);
        });

        it(`parses multi-element ng-show and ng-hide`, function () {
            const html =
`<div ng-show-start="items.length > 0"></div>
<div ng-show-end>{{ items[0] }}</div>
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
            verifyHtml(html, [], expected);
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
            verifyHtml(html, [], expected);
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
            verifyHtml(html, [], expected);
        });

        it(`parses ng-click and provides an $event local, closing scope correctly`, function () {
            const html =
                `<div ng-click="doSomething($event)" ng-class="someProperty"></div>`;
            const expected = templateRoot([
                scopedBlock([], [
                    scopedBlock([
                        parameter(`$event`, `IAngularEvent`)
                    ], [
                        assign(`doSomething($event)`)
                    ]),
                    assign(`someProperty`)
                ], `TemplateScope`)
            ]);
            verifyHtml(html, [], expected);
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
            verifyHtml(html, [], expected);
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
            verifyHtml(html, [], expected);
        });

        it(`parses ngPluralize directives`, function () {
            const html = `
<ng-pluralize count="personCount" when="{'0': 'Nobody is viewing.',
   '1': '{{person1}} is viewing.',
   '2': '{{person1}} and {{person2}} are viewing.',
   'one': '{{person1}}, {{person2}} and one other person are viewing.',
   'other': '{{person1}}, {{person2}} and {} other people are viewing.'}"></ng-pluralize>
<div ng-pluralize count="anotherCount" when="{}" offset="2"></div>`;
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`personCount`),
                    assign(`person1`),
                    assign(`person1`),
                    assign(`person2`),
                    assign(`person1`),
                    assign(`person2`),
                    assign(`person1`),
                    assign(`person2`),
                    assign(`anotherCount`),
                ], `TemplateScope`)
            ]);
            verifyHtml(html, [], expected);
        });

        it(`parses ngInclude directives`, function () {
            const html = `<ng-include src="template.url"></ng-include>
<div ng-include="anotherTemplate.url" onload="doSomething()" autoscroll="shouldAutoscroll"></div>`;
            const expected = templateRoot([
                scopedBlock([], [
                    assign(`template.url`),
                    assign(`anotherTemplate.url`),
                    assign(`doSomething()`),
                    assign(`shouldAutoscroll`),
                ], `TemplateScope`)
            ]);
            verifyHtml(html, [], expected);
        });

        it(`parses ngNonBindable directives`, function () {
            const html = `<div ng-non-bindable>{{ someValue + anotherValue }}</div>
<div ng-non-bindable><div ng-include="someTemplate.url"></div></div>
<div ng-class="{ 'someClass': showClass }" ng-non-bindable></div>`;
            const expected = templateRoot([
                scopedBlock([], [
                ], `TemplateScope`)
            ]);
            verifyHtml(html, [], expected);
        });

        describe(`HTML validation`, function () {
            it(`Fails validation for an unrecognised HTML tag`, function () {
                const html = `<my-custom-directive></my-custom-directive>>`;
                const directives : DirectiveData[] = [];
                verifyParseFailure(html, directives, [
                    `"my-custom-directive" is an unrecognised HTML tag. Is this a custom directive?`
                ]);
            });

            it(`Fails validation for an unrecognised HTML tag attribute`, function () {
                const html = `<my-custom-directive my-first-arg="ctrl.someValue"></my-custom-directive>>`;
                const directives : DirectiveData[] = [
                    {
                        name: 'myCustomDirective',
                        canBeElement: true,
                        canBeAttribute: false,
                        attributes: []
                    }
                ];
                verifyParseFailure(html, directives, [
                    `"my-custom-directive" has an unrecognised attribute "my-first-arg". Is this a directive scope binding?`
                ]);
            });

            it(`Fails validation for a missing required directive attribute`, function () {
                const html = `<my-custom-directive></my-custom-directive>>`;
                const directives : DirectiveData[] = [
                    {
                        name: 'myCustomDirective',
                        canBeElement: true,
                        canBeAttribute: false,
                        attributes: [
                            {
                                name: 'myFirstArg'
                            }
                        ]
                    }
                ];
                verifyParseFailure(html, directives, [
                    `"myCustomDirective" is missing the required attribute "myFirstArg".`
                ]);
            });

            it(`Passes validation for a span element`, function () {
                const html = `<span></span>`;
                const directives : DirectiveData[] = [];
                verifyHtml(html, directives, templateRoot([
                    scopedBlock([], [
                    ], `TemplateScope`)
                ]));
            });

            it(`Passes validation for ARIA attributes`, function () {
                const html = `<div role="button" aria-hidden="false"></div>`;
                const directives : DirectiveData[] = [];
                verifyHtml(html, directives, templateRoot([
                    scopedBlock([], [
                    ], `TemplateScope`)
                ]));
            });

            it(`Passes validation for SVG elements`, function () {
                const html = `<svg><ellipse rx="12" ry="34"></ellipse></svg>`;
                const directives : DirectiveData[] = [];
                verifyHtml(html, directives, templateRoot([
                    scopedBlock([], [
                    ], `TemplateScope`)
                ]));
            });

            it(`Passes validation for attributes prefixed with "ng-data-"`, function () {
                const html = `<div data-user-id="123"></div>`;
                const directives : DirectiveData[] = [];
                verifyHtml(html, directives, templateRoot([
                    scopedBlock([], [
                    ], `TemplateScope`)
                ]));
            });

            it(`Passes validation for attributes prefixed with "ng-attr-"`, function () {
                const html = `<svg ng-attr-view_box="{{ viewBox }}"></svg>`;
                const directives : DirectiveData[] = [];
                verifyHtml(html, directives, templateRoot([
                    scopedBlock([], [
                        assign(`viewBox`)
                    ], `TemplateScope`)
                ]));
            });

            it(`Fails validation for a missing required interpolated directive attribute`, function () {
                const html = `<my-custom-directive></my-custom-directive>>`;
                const directives : DirectiveData[] = [
                    {
                        name: 'myCustomDirective',
                        canBeElement: true,
                        canBeAttribute: false,
                        attributes: [
                            {
                                name: 'myFirstArg',
                                mode: 'interpolated'
                            }
                        ]
                    }
                ];
                verifyParseFailure(html, directives, [
                    `"myCustomDirective" is missing the required attribute "myFirstArg".`
                ]);
            });

            it(`Fails validation for a directive with the wrong case in the directive data`, function () {
                const html = `<my-custom-directive></my-custom-directive>>`;
                const directives : DirectiveData[] = [
                    {
                        name: 'my-custom-directive',
                        canBeElement: true,
                        canBeAttribute: false,
                        attributes: []
                    }
                ];
                verifyParseFailure(html, directives, [
                    `"my-custom-directive" is an unrecognised HTML tag. Is this a custom directive?`
                ]);
            });

            it(`Fails validation for an element directive with the wrong case in the HTML`, function () {
                const html = `<myCustomDirective></myCustomDirective>>`;
                const directives : DirectiveData[] = [
                    {
                        name: 'myCustomDirective',
                        canBeElement: true,
                        canBeAttribute: false,
                        attributes: []
                    }
                ];
                verifyParseFailure(html, directives, [
                    // Ideally, this would say "myCustomDirective", but Cheerio lowercases all tag names, even when
                    // you tell it not to.
                    `"mycustomdirective" is an unrecognised HTML tag. Is this a custom directive?`
                ]);
            });

            it(`Fails validation for an attribute directive with the wrong case in the HTML`, function () {
                const html = `<my-custom-directive first-arg="blah"></my-custom-directive>>`;
                const directives : DirectiveData[] = [
                    {
                        name: 'myCustomDirective',
                        canBeElement: true,
                        canBeAttribute: false,
                        attributes: [
                            {
                                name: 'first-arg'
                            }
                        ]
                    }
                ];
                verifyParseFailure(html, directives, [
                    `Attribute definition for "first-arg" is kebab-case, but should be camelCase.`,
                    `"myCustomDirective" is missing the required attribute "first-arg".`
                ]);
            });
        });

        describe(`input directives`, function () {
            describe(`common attributes`, function () {
                it(`parses required attributes`, function () {
                    const html = `<input ng-model="someProperty">`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`someProperty`)
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });

                it(`parses optional attributes`, function () {
                    const html = `<input 
    ng-model="someProperty" 
    name="myInput" 
    required="badRequired" 
    ng-required="goodRequired" 
    minlength="{{ interpMinLength }}"
    ng-minlength="exprMinLength"
    maxlength="{{ interpMaxLength }}"
    ng-maxlength="exprMaxLength"
    pattern="{{ interpPattern }}"
    ng-pattern="exprPattern"
    ng-change="doSomething()"
    ng-trim="shouldTrim">`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`someProperty`),
                            assign(`shouldTrim`), // happens to be first, due to use of an element parser
                            assign(`goodRequired`),
                            assign(`exprMinLength`),
                            assign(`exprMaxLength`),
                            assign(`exprPattern`),
                            scopedBlock([parameter(`$event`, `IAngularEvent`)], [
                                assign(`doSomething()`)
                            ]),
                            // Interpolated expressions are parsed after AngularJS expressions
                            assign(`interpMinLength`),
                            assign(`interpMaxLength`),
                            assign(`interpPattern`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`attribute exclusivity`, function () {
                it(`does not allow ng-true-value or ng-false-value on text inputs`, function () {
                    const html = `
<input 
    type="text"
    ng-true-value="someTrueValue"
    ng-false-value="someFalseValue"
>`;
                    verifyParseFailure(html, [], [
                        `input with type "text" has attribute "ng-true-value", but this is only allowed on inputs with these types: "checkbox"`,
                        `input with type "text" has attribute "ng-false-value", but this is only allowed on inputs with these types: "checkbox"`
                    ]);
                });
            });

            describe(`checkbox`, function () {
                it(`parses optional attributes`, function () {
                    const html = `
<input 
    type="checkbox"
    ng-true-value="someTrueValue"
    ng-false-value="someFalseValue"
>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`someTrueValue`),
                            assign(`someFalseValue`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`date`, function () {
                it(`parses optional attributes`, function () {
                    const html = `
<input 
    type="date"
    min="{{ interpMin }}"
    max="{{ interpMax }}"
    ng-min="exprMin"
    ng-max="exprMax"
>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`exprMin`),
                            assign(`exprMax`),
                            assign(`interpMin`),
                            assign(`interpMax`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`datetime-local`, function () {
                it(`parses optional attributes`, function () {
                    const html = `
<input 
    type="datetime-local"
    min="{{ interpMin }}"
    max="{{ interpMax }}"
    ng-min="exprMin"
    ng-max="exprMax"
>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`exprMin`),
                            assign(`exprMax`),
                            assign(`interpMin`),
                            assign(`interpMax`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`email`, function () {
                it(`parses optional attributes`, function () {
                    const html = `
<input 
    type="email"
    name="myEmail"
    required="{{ interpRequired }}"
    ng-required="exprRequired"
    ng-minlength="exprMinLength"
    ng-maxlength="exprMaxLength"
    pattern="{{ interpPattern }}"
    ng-pattern="exprPattern"
    ng-change="doSomething()"
>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`exprRequired`),
                            assign(`exprMinLength`),
                            assign(`exprMaxLength`),
                            assign(`exprPattern`),
                            scopedBlock([
                                parameter(`$event`, `IAngularEvent`)
                            ], [
                                assign(`doSomething()`)
                            ]),
                            assign(`interpRequired`),
                            assign(`interpPattern`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`month`, function () {
                it(`parses optional attributes`, function () {
                    const html = `
<input 
    type="month"
    min="{{ interpMin }}"
    max="{{ interpMax }}"
    ng-min="exprMin"
    ng-max="exprMax"
>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`exprMin`),
                            assign(`exprMax`),
                            assign(`interpMin`),
                            assign(`interpMax`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`number`, function () {
                it(`parses optional attributes`, function () {
                    const html = `
<input 
    type="number"
    min="{{ interpMin }}"
    ng-min="exprMin"
    max="{{ interpMax }}"
    ng-max="exprMax"
    step="{{ interpStep }}"
    ng-step="exprStep"
    required="{{ interpRequired }}"
    ng-required="exprRequired"
    pattern="{{ interpPattern }}"
    ng-pattern="exprPattern"
    ng-minlength="exprMinlength"
    ng-maxlength="exprMaxlength"
    ng-change="doSomething()"
>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`exprMin`),
                            assign(`exprMax`),
                            assign(`exprStep`),
                            assign(`exprRequired`),
                            assign(`exprPattern`),
                            assign(`exprMinlength`),
                            assign(`exprMaxlength`),
                            scopedBlock([
                                parameter(`$event`, `IAngularEvent`)
                            ], [
                                assign(`doSomething()`)
                            ]),
                            assign(`interpMin`),
                            assign(`interpMax`),
                            assign(`interpStep`),
                            assign(`interpRequired`),
                            assign(`interpPattern`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`radio`, function () {
                it(`parses optional attributes`, function () {
                    const html = `
<input 
    type="checkbox"
    ng-value="someValue"
>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`someValue`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`range`, function () {
                it(`parses range attributes`, function () {
                    const html = `
<input 
    type="range"
    min="{{ interpMin }}"
    max="{{ interpMax }}"
    step="{{ interpStep }}"
    ng-checked="exprChecked"
>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`exprChecked`),
                            assign(`interpMin`),
                            assign(`interpMax`),
                            assign(`interpStep`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`select`, function () {
                it(`parses optional attributes`, function () {
                    const html = `<select 
    ng-model="someProperty" 
    name="myInput" 
    multiple="{{ interpMultiple }}"
    required="{{ interpRequired }}" 
    ng-required="exprRequired"
    ng-options="opt.label for opt in options"
    ng-attr-size="{{ interpSize }}"></select>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`someProperty`),
                            assign(`exprRequired`),
                            arrayIteration(`opt`, `options`, [
                                assign(`opt.label`)
                            ]),
                            // Interpolated expressions are parsed after AngularJS expressions
                            assign(`interpMultiple`),
                            assign(`interpRequired`),
                            assign(`interpSize`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`text`, function () {
                it(`parses optional attributes`, function () {
                    const html = `<input 
    type="text"
    ng-model="someProperty" 
    name="myInput" 
    required="badRequired" 
    ng-required="goodRequired" 
    minlength="{{ interpMinLength }}"
    ng-minlength="exprMinLength"
    maxlength="{{ interpMaxLength }}"
    ng-maxlength="exprMaxLength"
    pattern="{{ interpPattern }}"
    ng-pattern="exprPattern"
    ng-change="doSomething()"
    ng-trim="shouldTrim">`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`someProperty`),
                            assign(`shouldTrim`), // happens to be first, due to use of an element parser
                            assign(`goodRequired`),
                            assign(`exprMinLength`),
                            assign(`exprMaxLength`),
                            assign(`exprPattern`),
                            scopedBlock([parameter(`$event`, `IAngularEvent`)], [
                                assign(`doSomething()`)
                            ]),
                            // Interpolated expressions are parsed after AngularJS expressions
                            assign(`interpMinLength`),
                            assign(`interpMaxLength`),
                            assign(`interpPattern`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`textarea`, function () {
                it(`parses optional attributes`, function () {
                    const html = `<textarea 
    ng-model="someProperty" 
    name="myInput" 
    required="badRequired" 
    ng-required="goodRequired" 
    ng-minlength="exprMinLength"
    ng-maxlength="exprMaxLength"
    ng-pattern="exprPattern"
    ng-change="doSomething()"
    ng-trim="shouldTrim"></textarea>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`someProperty`),
                            assign(`shouldTrim`), // happens to be first, due to use of an element parser
                            assign(`goodRequired`),
                            assign(`exprMinLength`),
                            assign(`exprMaxLength`),
                            assign(`exprPattern`),
                            scopedBlock([parameter(`$event`, `IAngularEvent`)], [
                                assign(`doSomething()`)
                            ]),
                            // Interpolated expressions are parsed after AngularJS expressions
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`url`, function () {
                it(`parses optional attributes`, function () {
                    const html = `<input 
    type="text"
    ng-model="someUrl"
    name="myInput" 
    required="badRequired" 
    ng-required="goodRequired" 
    ng-minlength="exprMinLength"
    ng-maxlength="exprMaxLength"
    pattern="{{ interpPattern }}"
    ng-pattern="exprPattern"
    ng-change="doSomething()">`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`someUrl`),
                            assign(`goodRequired`),
                            assign(`exprMinLength`),
                            assign(`exprMaxLength`),
                            assign(`exprPattern`),
                            scopedBlock([parameter(`$event`, `IAngularEvent`)], [
                                assign(`doSomething()`)
                            ]),
                            // Interpolated expressions are parsed after AngularJS expressions
                            assign(`interpPattern`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });

            describe(`week`, function () {
                it(`parses optional attributes`, function () {
                    const html = `
<input 
    type="week"
    min="{{ interpMin }}"
    max="{{ interpMax }}"
    ng-min="exprMin"
    ng-max="exprMax"
>`;
                    const expected = templateRoot([
                        scopedBlock([], [
                            assign(`exprMin`),
                            assign(`exprMax`),
                            assign(`interpMin`),
                            assign(`interpMax`),
                        ], `TemplateScope`)
                    ]);
                    verifyHtml(html, [], expected);
                });
            });
        });
    });
});