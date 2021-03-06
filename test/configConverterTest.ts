import {convertDirectiveConfigToDirectiveData, IDirective, TcatDirectiveExtras} from "../src/configConverter";
import {DirectiveData} from "../src/directives";
import * as assert from "assert";
import {ElementDirectiveParser} from "../src/parser/elements";
import {AttributeParser} from "../src/parser/attributes";

describe(`configConverter`, function () {
    describe(`convertDirectiveConfigToDirectiveData`, function () {
        const DEFAULT_DIRECTIVE_NAME = 'testDirective';
        const EXPECTED_DEFAULT_DIRECTIVE_NAME = DEFAULT_DIRECTIVE_NAME;
        function verifySuccess(config : IDirective, expected : DirectiveData) {
            const result = convertDirectiveConfigToDirectiveData(DEFAULT_DIRECTIVE_NAME, config);
            if (result.isLeft()) {
                console.log(result.left());
            }
            assert.ok(result.isRight());
            assert.deepStrictEqual(result.right(), expected);
        }

        it(`converts a directive with just scope`, function () {
            verifySuccess(
                {
                    scope: {
                        someTwoWayBinding: '=',
                        someInterpolatedBinding: '@?',
                        someExpressionBinding: '&',
                        someOneWayBinding: '<?'
                    }
                },
                {
                    name: EXPECTED_DEFAULT_DIRECTIVE_NAME,
                    canBeElement: true,
                    canBeAttribute: true,
                    priority: 0,
                    attributes: [
                        {
                            name: 'someTwoWayBinding',
                            mode: 'expression',
                            optional: false
                        },
                        {
                            name: 'someInterpolatedBinding',
                            mode: 'interpolated',
                            optional: true
                        },
                        {
                            name: 'someExpressionBinding',
                            mode: 'expression',
                            optional: false
                        },
                        {
                            name: 'someOneWayBinding',
                            mode: 'expression',
                            optional: true
                        }
                    ]
                }
            );
        });

        it(`converts a directive with just bindToController`, function () {
            verifySuccess(
                {
                    bindToController: {
                        someTwoWayBinding: '=?',
                        someInterpolatedBinding: '@',
                        someExpressionBinding: '&?',
                        someOneWayBinding: '<'
                    }
                },
                {
                    name: EXPECTED_DEFAULT_DIRECTIVE_NAME,
                    canBeElement: true,
                    canBeAttribute: true,
                    priority: 0,
                    attributes: [
                        {
                            name: 'someTwoWayBinding',
                            mode: 'expression',
                            optional: true
                        },
                        {
                            name: 'someInterpolatedBinding',
                            mode: 'interpolated',
                            optional: false
                        },
                        {
                            name: 'someExpressionBinding',
                            mode: 'expression',
                            optional: true
                        },
                        {
                            name: 'someOneWayBinding',
                            mode: 'expression',
                            optional: false
                        }
                    ]
                }
            );
        });

        it(`converts a directive with both scope and bindToController`, function () {
            verifySuccess(
                {
                    bindToController: {
                        someTwoWayBinding: '=',
                        someInterpolatedBinding: '@?',
                    },
                    scope: {
                        someExpressionBinding: '&',
                        someOneWayBinding: '<?'
                    },
                },
                {
                    name: EXPECTED_DEFAULT_DIRECTIVE_NAME,
                    canBeElement: true,
                    canBeAttribute: true,
                    priority: 0,
                    attributes: [
                        {
                            name: 'someTwoWayBinding',
                            mode: 'expression',
                            optional: false
                        },
                        {
                            name: 'someInterpolatedBinding',
                            mode: 'interpolated',
                            optional: true
                        },
                        {
                            name: 'someExpressionBinding',
                            mode: 'expression',
                            optional: false
                        },
                        {
                            name: 'someOneWayBinding',
                            mode: 'expression',
                            optional: true
                        }
                    ]
                }
            );
        });

        it(`converts a directive with a priority`, function () {
            verifySuccess(
                {
                    priority: 20
                },
                {
                    name: EXPECTED_DEFAULT_DIRECTIVE_NAME,
                    canBeElement: true,
                    canBeAttribute: true,
                    priority: 20,
                    attributes: []
                }
            );
        });

        it(`converts a directive restricted to an attribute`, function () {
            verifySuccess(
                {
                    restrict : 'A',
                },
                {
                    name: EXPECTED_DEFAULT_DIRECTIVE_NAME,
                    canBeElement: false,
                    canBeAttribute: true,
                    priority: 0,
                    attributes: []
                }
            );
        });

        it(`converts a directive restricted to an element`, function () {
            verifySuccess(
                {
                    restrict : 'E',
                },
                {
                    name: EXPECTED_DEFAULT_DIRECTIVE_NAME,
                    canBeElement: true,
                    canBeAttribute: false,
                    priority: 0,
                    attributes: []
                }
            );
        });

        describe(`with tcat extras`, function () {
            function verifySuccess(config : IDirective, extras : TcatDirectiveExtras, expected : DirectiveData) {
                const result = convertDirectiveConfigToDirectiveData(DEFAULT_DIRECTIVE_NAME, config, extras);
                if (result.isLeft()) {
                    console.log(result.left());
                }
                assert.ok(result.isRight());
                assert.deepStrictEqual(result.right(), expected);
            }

            it(`merges an element parser`, function () {
                const elementParser : ElementDirectiveParser = () : any => { };
                const extras : TcatDirectiveExtras = {
                    parser: elementParser
                };
                verifySuccess(
                    {
                        restrict : 'E',
                    },
                    extras,
                    {
                        name: EXPECTED_DEFAULT_DIRECTIVE_NAME,
                        canBeElement: true,
                        canBeAttribute: false,
                        priority: 0,
                        attributes: [],
                        parser: elementParser
                    }
                );
            });

            it(`merges an attribute parser`, function () {
                const attributeParser : AttributeParser = () : any => { };
                const extrasMap : TcatDirectiveExtras = {
                    attributes: {
                        'firstProperty': {
                            parser: attributeParser
                        }
                    }
                };
                verifySuccess(
                    {
                        restrict : 'E',
                        scope: {
                            firstProperty: '='
                        }
                    },
                    extrasMap,
                    {
                        name: EXPECTED_DEFAULT_DIRECTIVE_NAME,
                        canBeElement: true,
                        canBeAttribute: false,
                        priority: 0,
                        attributes: [
                            {
                                name: 'firstProperty',
                                mode: 'expression',
                                optional: false,
                                parser: attributeParser
                            }
                        ],
                    }
                );
            });

            it(`merges attribute locals`, function () {
                const attributeLocals = [
                    {
                        name: 'firstLocal',
                        type: 'string'
                    }
                ];
                const extras : TcatDirectiveExtras = {
                    attributes: {
                        'firstProperty': {
                            locals: attributeLocals
                        }
                    }
                };
                verifySuccess(
                    {
                        restrict : 'E',
                        scope: {
                            firstProperty: '='
                        }
                    },
                    extras,
                    {
                        name: EXPECTED_DEFAULT_DIRECTIVE_NAME,
                        canBeElement: true,
                        canBeAttribute: false,
                        priority: 0,
                        attributes: [
                            {
                                name: 'firstProperty',
                                mode: 'expression',
                                optional: false,
                                locals: attributeLocals
                            }
                        ],
                    }
                );
            });
        });
    });
});