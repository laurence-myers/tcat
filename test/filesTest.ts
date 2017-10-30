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
            assert.ok(result.isLeft(), "Directive data validation should fail");
        }

        it(`Parses valid directives data`, function () {
            verifySuccess([
                {
                    "name": "myElementDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg"
                        },
                        {
                            "name": "anotherArg"
                        }
                    ]
                },
                {
                    "name": "myAttributeDirective",
                    "canBeElement": false,
                    "canBeAttribute": true,
                    "attributes": [
                        {
                            "name": "someAttribExpression",
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
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                },
            ]);
        });

        it(`Errors when missing "canBeElement"`, function () {
            verifyFailure([
                {
                    "name": "myDirective",
                    "canBeAttribute": false,
                },
            ]);
        });

        it(`Errors when missing "canBeAttribute"`, function () {
            verifyFailure([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                },
            ]);
        });

        it(`Errors when attributes are missing "name"`, function () {
            verifyFailure([
                {
                    "name": "myDirective",
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
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
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
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
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
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
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
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
                            "mode": "expression",
                        }
                    ]
                },
            ]);
            verifySuccess([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
                            "mode": "interpolated",
                        }
                    ]
                },
            ]);
            verifyFailure([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
                            "mode": "someOtherValue",
                        }
                    ]
                },
            ]);
            verifyFailure([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
                            "type": "interpolated", // "mode" used to be called "type"
                        }
                    ]
                },
            ]);
        });

        it(`Passes when attribute specifies "optional" as a boolean`, function () {
            verifySuccess([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
                            "optional": true,
                        }
                    ]
                },
            ]);
            verifySuccess([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
                            "optional": false,
                        }
                    ]
                },
            ]);
            verifyFailure([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            "name": "someArg",
                            "optional": "true",
                        }
                    ]
                },
            ]);
        });

        it(`Parses priority`, function () {
            verifySuccess([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "priority": 0
                },
            ]);
            verifySuccess([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "priority": 100
                },
            ]);
            verifyFailure([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "priority": "0"
                },
            ]);
        });

        it(`Errors when element names are not camelCase`, function () {
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": []
                },
            ]);
            verifySuccess([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": []
                },
            ]);
        });

        it(`Passes on single-character element names`, function () {
            verifySuccess([
                {
                    "name": "a",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": []
                },
            ]);
        });

        it(`Errors when attribute names are not camelCase`, function () {
            verifyFailure([
                {
                    "name": "my-directive",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            name: 'first-arg'
                        }
                    ]
                },
            ]);
            verifySuccess([
                {
                    "name": "myDirective",
                    "canBeElement": true,
                    "canBeAttribute": false,
                    "attributes": [
                        {
                            name: 'firstArg'
                        }
                    ]
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

        it(`returns the whole directory if passed one FileNames`, function () {
            let result = findLongestCommonPath([
                asFileName(path.join('d:', 'code', 'myProject', 'subDir1', 'someFile.ts'))
            ]);
            assert.strictEqual(result, result, path.join('d:', 'code', 'myProject', 'subDir1'));
        });

        it(`returns an empty string if passed zero FileNames`, function () {
            let result = findLongestCommonPath([]);
            assert.strictEqual(result, "");
        });
    });
});