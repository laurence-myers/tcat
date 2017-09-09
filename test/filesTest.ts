import {findLongestCommonPath, validateDirectiveDataJson} from "../src/files";
import * as assert from "assert";
import {asFileName} from "../src/core";
import * as path from "path";

describe(`Files`, function () {
    describe(`validateDirectiveDataJson()`, function () {
        function verifySuccess(input : object[]) {
            const result = validateDirectiveDataJson(input);
            if (result.isLeft()) {
                console.log(result.left());
            }
            assert.ok(result.isRight());
        }

        function verifyFailure(input : object[]) {
            const result = validateDirectiveDataJson(input);
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

        it(`Passes when attribute specifies mode`, function () {
            verifySuccess([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "mode": "expression",
                        }
                    ]
                },
            ]);
            verifySuccess([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "mode": "interpolated",
                        }
                    ]
                },
            ]);
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "mode": "someOtherValue",
                        }
                    ]
                },
            ]);
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "type": "interpolated", // "mode" used to be called "type"
                        }
                    ]
                },
            ]);
        });

        it(`Passes when attribute specifies "optional" as a boolean`, function () {
            verifySuccess([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "optional": true,
                        }
                    ]
                },
            ]);
            verifySuccess([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "optional": false,
                        }
                    ]
                },
            ]);
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "some-arg",
                            "optional": "true",
                        }
                    ]
                },
            ]);
        });

        it(`Parses priority`, function () {
            verifySuccess([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "priority": 0
                },
            ]);
            verifySuccess([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "priority": 100
                },
            ]);
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "priority": "0"
                },
            ]);
        });
    });

    describe(`findLongestCommonPath`, function () {
        it(`finds the longest common path between two FileNames`, function () {
            let result = findLongestCommonPath([
                asFileName(path.join('d:', 'code', 'myProject', 'subDir1', 'someFile.ts')),
                asFileName(path.join('d:', 'code', 'myProject', 'subDir1', 'someOtherFile.ts'))
            ]);
            assert.strictEqual(result, path.join('d:', 'code', 'myProject', 'subDir1'));
        });

        it(`finds the longest common path for more than two FileNames`, function () {
            let result = findLongestCommonPath([
                asFileName(path.join('d:', 'code', 'myProject', 'subDir1', 'someFile.ts')),
                asFileName(path.join('d:', 'code', 'myProject', 'subDir1', 'someOtherFile.ts')),
                asFileName(path.join('d:', 'code', 'myProject', 'subDir2', 'aThirdFile.ts'))
            ]);
            assert.strictEqual(result, path.join('d:', 'code', 'myProject'));
        });

        it(`returns an empty string if passed less than two FileNames`, function () {
            let result = findLongestCommonPath([]);
            assert.strictEqual(result, "");
            result = findLongestCommonPath([
                asFileName('D:\\Code\\someFile.ts')
            ]);
            assert.strictEqual(result, "");
        });
    });
});