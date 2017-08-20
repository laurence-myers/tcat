import {parseHtml} from "../../src/parser/templateParser";
import * as assert from "assert";
import {assign, templateRoot, scopedBlock} from "../../src/generator/dsl";

describe(`Template parsers`, function () {
    describe(`parseHtml`, function () {
        it(`parses ng-template with nested elements`, function () {
            const html = `<script type="text/ng-template" id="some/nested/template.html">
    <div ng-click="someFunc()"></div>
</script>`;
            const either = parseHtml(html, 'TemplateScope');
            assert.ok(either.isRight(), "Expected to parse HTML successfully");
            const result = either.right();
            const expected = templateRoot([
                scopedBlock([
                ], `TemplateScope`),
                scopedBlock([
                    assign(`someFunc()`)
                ], `SomeNestedTemplateHtmlScope`)
            ]);
            assert.deepEqual(result, expected);
        });

        it(`parses ng-template with nested ng-template`, function () {
            const html = `<script type="text/ng-template" id="some/nested/template.html">
    <script type="text/ng-template" id="another/nested/template.html">
        <div ng-click="someFunc()"></div>
    </script>
</script>`;
            const either = parseHtml(html, 'TemplateScope');
            assert.ok(either.isRight(), "Expected to parse HTML successfully");
            const result = either.right();
            const expected = templateRoot([
                scopedBlock([
                ], `TemplateScope`),
                scopedBlock([
                ], `SomeNestedTemplateHtmlScope`),
                scopedBlock([
                    assign(`someFunc()`)
                ], `AnotherNestedTemplateHtmlScope`)
            ]);
            assert.deepEqual(result, expected);
        });
    });
});