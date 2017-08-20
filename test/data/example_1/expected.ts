/* tslint:disable */
import {translate} from "./translate";

interface TemplateScope {
    items : any[];
}

type FirstSecondThirdPartHtmlScope = any;

declare const __scope_1 : TemplateScope;
function block_1() {
    const expr_1 = (translate("SOME.KEY"));
    function block_2() {
        const $index : number = 0;
        const $first : boolean = false;
        const $last : boolean = false;
        const $middle : boolean = false;
        const $even : boolean = false;
        const $odd : boolean = false;
        const $id = (value : any) => "";
        for (const item of (__scope_1.items)) {
            const expr_2 = ($id(item));
        }
    }
}
declare const __scope_2 : FirstSecondThirdPartHtmlScope;
function block_3() {
    const expr_3 = (__scope_2.someValue);
}
