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

interface fooController {

}

interface fooControllerScope {
    bar : string;
}

interface IFooForm {

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
    const _expr_7 = (true ? "foo" : "bar");
    const _block_3 = function (
        _scope_2 : { ctrl : fooController } & fooControllerScope,
    ) {
        const _block_4 = function (
            fooForm : IFooForm,
        ) {
            const _expr_8 = (_scope_2.bar);
        };
    };
};

export = {};
