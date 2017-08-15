import {templateIdToInterfaceName} from "../../src/parser/elements";
import * as assert from "assert";

describe(`Element parsers`, function () {
    describe(`templateIdToInterfaceName`, function () {
        it(`strips URL-characters and converts to camelCase`, function () {
            const templateId = `hey/there/I/amAVeryFunky/templateName.html`;
            const expected = `HeyThereIAmAVeryFunkyTemplateNameHtmlScope`;
            const actual = templateIdToInterfaceName(templateId);
            assert.equal(actual, expected);
        });
    });
});