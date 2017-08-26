/* tslint:disable */
import {translate} from "./translate";

interface TemplateScope {
    items : any[];
}

type FirstSecondThirdPartHtmlScope = any;

declare const __scope_1 : TemplateScope;
function block_1() {
    const expr_1 = (translate("SOME.KEY"));
    function block_2(
        $index : number,
        $first : boolean,
        $last : boolean,
        $middle : boolean,
        $even : boolean,
        $odd : boolean,
        $id : (value : any) => "",
    ) {
        for (const item of (__scope_1.items)) {
            const expr_2 = ($id(item));
        }
    }
}
declare const __scope_2 : FirstSecondThirdPartHtmlScope;
function block_3() {
    const expr_3 = (__scope_2.someValue);
}
