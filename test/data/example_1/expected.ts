/* tslint:disable */
import {translate} from "./translate";

interface TemplateScope {
    items : Array<{
        name : string;
        values : string[];
    }>;
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
    function _block_3(
        $index : number,
        $first : boolean,
        $last : boolean,
        $middle : boolean,
        $even : boolean,
        $odd : boolean,
        $id : (value : any) => "",
    ) {
        for (const item of (_scope_1.items)) {
            function _block_4(
                $index : number,
                $first : boolean,
                $last : boolean,
                $middle : boolean,
                $even : boolean,
                $odd : boolean,
                $id : (value : any) => "",
            ) {
                for (const value of (item.values)) {
                    const _expr_3 = (value);
                }
            }
            const _expr_4 = (item.name);
        }
    }
}
declare const _scope_2 : FirstSecondThirdPartHtmlScope;
function _block_5() {
    const _expr_5 = (_scope_2.someValue);
}
