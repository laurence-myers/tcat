/* tslint:disable */
interface TemplateScope {
    prop1 : string;
    prop2 : string;
    prop3 : number;
    directiveFunction : () => any;
}

declare const __scope_1 : TemplateScope;
function block_1() {
    const expr_1 = (__scope_1.prop1);
    const expr_2 = (__scope_1.prop2);
    const expr_3 = (__scope_1.directiveFunction());
    const expr_4 = (__scope_1.prop1 + __scope_1.prop2);
}
