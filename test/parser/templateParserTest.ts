import {parseHtml} from "../../src/parser/templateParser";
import * as assert from "assert";
import {assign, declare, scopedBlock} from "../../src/generator/dsl";

describe(`Template parsers`, function () {
    describe(`parseHtml`, function () {
        it(`parses ng-template with nested elements`, function () {
            const html = `<script type="text/ng-template" id="some/nested/template.html">
    <div ng-click="someFunc()"></div>
</script>`;
            const either = parseHtml(html, 'TemplateScope');
            assert.ok(either.isRight(), "Expected to parse HTML successfully");
            const result = either.right();
            assert.deepEqual(result.children, [
                declare(`__scope_1`, `TemplateScope`),
                scopedBlock([
                    declare(`__scope_1`, `SomeNestedTemplateHtmlScope`),
                    assign(`someFunc()`)
                ])
            ]);
        });
    });
});