import {validateDirectiveDataJson} from "../src/files";
import * as assert from "assert";

describe(`Files`, function () {
    describe(`validateDirectiveDataJson()`, function () {
        function verifySuccess(input : object) {
            const result = validateDirectiveDataJson(JSON.stringify(input));
            if (result.isLeft()) {
                console.log(result.left());
            }
            assert.ok(result.isRight());
        }

        function verifyFailure(input : object) {
            const result = validateDirectiveDataJson(JSON.stringify(input));
            assert.ok(result.isLeft());
        }

        it(`Parses valid directives data`, function () {
            verifySuccess([
                {
                    "name": "my-element-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg"
                        },
                        {
                            "name": "another-arg"
                        }
                    ]
                },
                {
                    "name": "my-attribute-directive",
                    "canBeElement": false,
                    "canBeAttribute": true,
                    "attributes": [
                        {
                            "name": "some-attrib-expression",
                            "locals": [
                                {
                                    "name": "someLocal",
                                    "type": "FunkyType"
                                }
                            ]
                        }
                    ]
                }
            ]);
        });

        it(`Success with minimal structure`, function () {
            verifySuccess([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                },
            ]);
        });

        it(`Errors when missing "canBeElement"`, function () {
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeAttribute": false,
                },
            ]);
        });

        it(`Errors when missing "canBeAttribute"`, function () {
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                },
            ]);
        });

        it(`Errors when attributes are missing "name"`, function () {
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {

                        }
                    ]
                },
            ]);
        });

        it(`Errors when attribute locals are missing "name"`, function () {
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "locals": [
                                {

                                }
                            ]
                        }
                    ]
                },
            ]);
        });

        it(`Errors when attribute locals are missing "type"`, function () {
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "locals": [
                                {
                                    "name": "someLocal"
                                }
                            ]
                        }
                    ]
                },
            ]);
        });

        it(`Passes when attribute locals have "type"`, function () {
            verifySuccess([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "locals": [
                                {
                                    "name": "someLocal",
                                    "type": "MonkeyWrench"
                                }
                            ]
                        }
                    ]
                },
            ]);
        });
    });
});