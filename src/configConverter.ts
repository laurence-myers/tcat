import {AttributeLocal, DirectiveAttribute, DirectiveData} from "./directives";
import {assertNever, DirectiveDefinitionError} from "./core";
import {Either} from "monet";
import {ElementDirectiveParser} from "./parser/elements";
import {AttributeParser} from "./parser/attributes";

export interface IDirective {
    bindToController? : boolean | { [ boundProperty : string ] : string };
    multiElement? : boolean;
    priority? : number;
    restrict? : string;
    scope? : boolean | { [ boundProperty : string ] : string };
}

type BindingModeInterpolated = '@';
type BindingModeTwoWay = '=';
type BindingModeOneWay = '<';
type BindingModeExpression = '&';
type BindingMode =
    BindingModeInterpolated
    | BindingModeTwoWay
    | BindingModeOneWay
    | BindingModeExpression;

interface DirectiveBinding {
    mode : BindingMode;
    collection : boolean;
    optional : boolean;
    attrName : string;
}
type BindingsMap = { [key : string] : DirectiveBinding };

// Derived from AngularJS:
// https://github.com/angular/angular.js/blob/233a93f6e01f7f06d17cdea8a7b2a7098803639d/src/ng/compile.js#L1013
function parseIsolateBindings(bindingInput : { [ boundProperty : string ] : string }, directiveName : string, isController : boolean) : Either<DirectiveDefinitionError, BindingsMap> {
    const BINDING_REGEXP = /^\s*([@&<]|=(\*?))(\??)\s*([\w$]*)\s*$/;

    const bindings : BindingsMap = {};

    for (const scopeName of Object.keys(bindingInput)) {
        const definition = bindingInput[scopeName];
        const match = definition.match(BINDING_REGEXP);

        if (!match) {
            return Either.Left(new DirectiveDefinitionError(
                `Invalid ${
                    isController
                        ? 'controller bindings definition'
                        : 'isolate scope definition' } for directive '${ directiveName }'. Definition: {... ${ scopeName }: \'${ definition }\' ...}`
            ));
        }
        bindings[scopeName] = {
            mode: <BindingMode> match[1][0],
            collection: match[2] === '*',
            optional: match[3] === '?',
            attrName: match[4] || scopeName
        };
    }

    return Either.Right(bindings);
}

interface DirectiveRestrict {
    canBeElement : boolean;
    canBeAttribute : boolean;
    // TODO: support others
}

function getDirectiveRestrict(restrict : string | undefined, directiveName : string) : Either<DirectiveDefinitionError, DirectiveRestrict> {
    if (restrict && !/[EACM]/.test(restrict)) {
        return Either.Left(
            new DirectiveDefinitionError(`Restrict property '${ restrict }' of directive '${ directiveName }' is invalid`)
        );
    }
    if (!restrict) {
        restrict = 'EA';
    }
    return Either.Right({
        canBeElement: /[E]/.test(restrict),
        canBeAttribute: /[A]/.test(restrict)
    });
}

function convertBindingModeToAttributeType(bindingMode : BindingMode) : 'expression' | 'interpolated' {
    switch (bindingMode) {
        case "@":
            return "interpolated";
        case "=":
        case "<":
        case "&":
            return "expression";
        default:
            return assertNever(bindingMode);
    }
}

function convertBindingsToAttributes(bindings : BindingsMap) : DirectiveAttribute[] {
    const attributes = [];
    for (const attributeName of Object.keys(bindings)) {
        const directiveBinding = bindings[attributeName];
        attributes.push(<DirectiveAttribute> {
            name: attributeName,
            optional: directiveBinding.optional,
            mode: convertBindingModeToAttributeType(directiveBinding.mode)
        });
    }
    return attributes;
}

export interface TcatDirectiveExtras {
    parser? : ElementDirectiveParser;
    attributes? : {
        [attributeName : string] : {
            parser? : AttributeParser;
            locals? : AttributeLocal[];
        };
    };
}

function combineWithExtras(directiveData : DirectiveData, extras? : TcatDirectiveExtras) : Either<DirectiveDefinitionError, DirectiveData> {
    if (extras !== undefined) {
        if (extras.parser) {
            directiveData.parser = extras.parser;
        }
        if (extras.attributes) {
            for (const attributeName of Object.keys(extras.attributes)) {
                const existingAttributes = directiveData.attributes.filter((attr) => attr.name === attributeName);
                if (existingAttributes.length !== 1) {
                    return Either.Left(new DirectiveDefinitionError(`Directive ${ directiveData.name } has extras for attribute ${ attributeName }, but found ${ existingAttributes.length } definitions. Is the directive config correct?`));
                }
                const existingAttribute = existingAttributes[0];
                const attributeExtras = extras.attributes[attributeName];
                if (attributeExtras.parser) {
                    existingAttribute.parser = attributeExtras.parser;
                }
                if (attributeExtras.locals) {
                    existingAttribute.locals = attributeExtras.locals;
                }
            }
        }
        return Either.Right(directiveData);
    } else {
        return Either.Right(directiveData);
    }
}

export function convertDirectiveConfigToDirectiveData(directiveName : string, directiveConfig : IDirective, extras? : TcatDirectiveExtras) : Either<DirectiveDefinitionError, DirectiveData> {
    const isController = !!directiveConfig.bindToController;
    const priority = directiveConfig.priority || 0;
    // const multiElement = !!directiveConfig.multiElement;
    let combinedBindings = {};

    return getDirectiveRestrict(directiveConfig.restrict, directiveName)
        .flatMap((restrictions) => {
            let either = Either.Right<DirectiveDefinitionError, void>(undefined);
            return either.map(() => {
                if (directiveConfig.bindToController && directiveConfig.bindToController !== true) {
                    return parseIsolateBindings(directiveConfig.bindToController, directiveName, isController)
                        .map((controllerBindings) => {
                            combinedBindings = {
                                ...combinedBindings,
                                ...controllerBindings
                            };
                        });
                } else {
                    return;
                }
            }).map(() => {
                if (directiveConfig.scope && directiveConfig.scope !== true) {
                    return parseIsolateBindings(directiveConfig.scope, directiveName, isController)
                        .map((scopeBindings) => {
                            combinedBindings = {
                                ...combinedBindings,
                                ...scopeBindings
                            };
                        });
                } else {
                    return;
                }
            }).flatMap(() => {
                return combineWithExtras(<DirectiveData> {
                    name: directiveName,
                    ...restrictions,
                    priority,
                    attributes: convertBindingsToAttributes(combinedBindings)
                }, extras);
            });
        });
}
