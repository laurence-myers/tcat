export * from "./filters";
import {
    convertDirectiveConfigToDirectiveData as _convertDirectiveConfigToDirectiveData,
    IDirective, TcatDirectiveExtrasMap
} from "./configConverter";
import {unwrapEither} from "./core";
import {DirectiveData} from "./directives";

export function convertDirectiveConfigToDirectiveData(directiveName : string, directiveConfig : IDirective, extrasMap? : TcatDirectiveExtrasMap) : DirectiveData | never {
    return unwrapEither(_convertDirectiveConfigToDirectiveData(directiveName, directiveConfig, extrasMap));
}