/* tslint:disable */
import {translate} from "./translate";

interface TemplateScope {
}

type FirstSecondThirdPartHtmlScope = any;

declare let __scope_1 : TemplateScope;
function block_1() {
    const expr_1 = (translate("SOME.KEY"));
}
declare let __scope_2 : FirstSecondThirdPartHtmlScope;
function block_2() {
    const expr_2 = (__scope_2.someValue);
}