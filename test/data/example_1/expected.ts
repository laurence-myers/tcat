/* tslint:disable */
import {translate} from "./translate";

interface TemplateScope {
    items : any[];
}

type FirstSecondThirdPartHtmlScope = any;

declare const _scope_1 : TemplateScope;
function _block_1() {
    const _expr_1 = (translate("SOME.KEY"));
    function _block_2(
        $index : number,
        $first : boolean,
        $last : boolean,
        $middle : boolean,
        $even : boolean,
        $odd : boolean,
        $id : (value : any) => "",
    ) {
        for (const item of (_scope_1.items)) {
            const _expr_2 = ($id(item));
        }
    }
}
declare const _scope_2 : FirstSecondThirdPartHtmlScope;
function _block_3() {
    const _expr_3 = (_scope_2.someValue);
}
