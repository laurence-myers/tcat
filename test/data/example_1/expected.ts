/* tslint:disable */
import {translate} from "./translate";

interface TemplateScope {
    items : Array<{
        name : string;
        values : string[];
    }>;
    someOptionalProperty : undefined | {
        name : string;
    };
    isActive : boolean;
}

interface FooControllerScope {
    fooValue : string;
}

interface BarControllerScope {
    barValue : string;
}

type FirstSecondThirdPartHtmlScope = any;

const _block_1 = function (
    _scope_1 : TemplateScope,
) {
    const _expr_1 = (translate("SOME.KEY"));
    const _block_2 = function (
        $index : number,
        $first : boolean,
        $last : boolean,
        $middle : boolean,
        $even : boolean,
        $odd : boolean,
        $id : (value : any) => string,
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
        $id : (value : any) => string,
    ) {
        for (const item of (_scope_1.items)) {
            const _block_4 = function (
                $index : number,
                $first : boolean,
                $last : boolean,
                $middle : boolean,
                $even : boolean,
                $odd : boolean,
                $id : (value : any) => string,
            ) {
                for (const value of (item.values)) {
                    const _expr_3 = (value);
                }
            };
            const _expr_4 = (item.name);
        }
    };
    if ((_scope_1.someOptionalProperty)) {
        const _expr_5 = (_scope_1.someOptionalProperty.name);
    }
    const _block_5 = function (
        _scope_2 : FooControllerScope,
    ) {
        const _expr_6 = (_scope_2.fooValue);
    };
    const _block_6 = function (
        _scope_3 : { ctrl : BarControllerScope },
    ) {
        const _expr_7 = (_scope_3.ctrl.barValue);
    };
    const _expr_8 = ({ active: _scope_1.isActive });
};
const _block_7 = function (
    _scope_4 : FirstSecondThirdPartHtmlScope,
) {
    const _expr_9 = (_scope_4.someValue);
};

export = {};
