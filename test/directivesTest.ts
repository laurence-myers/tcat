import {normalize} from "../src/directives";
import * as assert from "assert";

describe(`directives`, function () {
    describe(`normalize`, function () {
        function verifyNormalize(input : string | null | undefined, expected : string) {
            assert.deepStrictEqual(normalize(input), expected);
        }

        it(`normalises different formats of directive names`, function () {
            const expected = 'ngBind';
            verifyNormalize('ng-bind', expected);
            verifyNormalize('ng:bind', expected);
            verifyNormalize('ng_bind', expected);
            verifyNormalize('data-ng-bind', expected);
            verifyNormalize('x-ng-bind', expected);
            verifyNormalize('ngBind', expected);
        });

        it(`does not die when input is null or undefined`, function () {
            const expected = '';
            verifyNormalize(null, expected);
            verifyNormalize(undefined, expected);
            verifyNormalize('', expected);
        });
    });
});