export * from "./filters";
import {
    convertDirectiveConfigToDirectiveData as _convertDirectiveConfigToDirectiveData,
    IDirective, TcatDirectiveExtras
} from "./configConverter";
import {unwrapEither} from "./core";
import {DirectiveData} from "./directives";

export function convertDirectiveConfigToDirectiveData(directiveName : string, directiveConfig : IDirective, extras? : TcatDirectiveExtras) : DirectiveData | never {
    return unwrapEither(_convertDirectiveConfigToDirectiveData(directiveName, directiveConfig, extras));
}