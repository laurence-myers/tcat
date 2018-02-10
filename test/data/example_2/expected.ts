/* tslint:disable */
interface FunkyType {
    funkyName : string;
}

interface TemplateScope {
    prop1 : string;
    prop2 : string;
    prop3 : number;
    directiveFunction : () => any;
}

const _block_1 = function (
    _scope_1 : TemplateScope,
) {
    const _expr_1 = (_scope_1.prop1);
    const _expr_2 = (_scope_1.prop2);
    const _expr_3 = (_scope_1.directiveFunction());
    const _block_2 = function (
        someLocal : FunkyType,
    ) {
        const _expr_4 = (_scope_1.prop1 + _scope_1.prop2 + someLocal.funkyName);
    };
    const _expr_5 = ("hello" + "world");
    const _expr_6 = ("extra text");
};

export = {};
