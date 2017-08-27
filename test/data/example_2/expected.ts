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

declare const _scope_1 : TemplateScope;
function _block_1() {
    const _expr_1 = (_scope_1.prop1);
    const _expr_2 = (_scope_1.prop2);
    const _expr_3 = (_scope_1.directiveFunction());
    function _block_2(
        someLocal : FunkyType,
    ) {
        const _expr_4 = (_scope_1.prop1 + _scope_1.prop2 + someLocal.funkyName);
    }
}
