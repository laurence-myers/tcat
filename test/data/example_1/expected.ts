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
const _block_1 = function () {
    const _expr_1 = (translate("SOME.KEY"));
    const _block_2 = function (
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
    };
    const _block_3 = function (
        $index : number,
        $first : boolean,
        $last : boolean,
        $middle : boolean,
        $even : boolean,
        $odd : boolean,
        $id : (value : any) => "",
    ) {
        for (const item of (_scope_1.items)) {
            const _block_4 = function (
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
            };
            const _expr_4 = (item.name);
        }
    };
};
declare const _scope_2 : FirstSecondThirdPartHtmlScope;
const _block_5 = function () {
    const _expr_5 = (_scope_2.someValue);
};
