import {
    ArrayIterationNode,
    AssignmentNode,
    GeneratorAstNode,
    ObjectIterationNode,
    ParameterNode,
    ScopedBlockNode,
    TemplateRootNode
} from "./ast";
import {parseExpression} from "../ngExpression/ngAstBuilder";

interface AssignOptions {
    name? : string;
    variableType? : 'let' | 'const';
    typeAnnotation? : string;
}
export function assign(expression : string, options : AssignOptions = { variableType: 'const' }) : AssignmentNode {
    return {
        type: "AssignmentNode",
        expression: parseExpression(expression),
        variableType: options.variableType || 'const',
        typeAnnotation: options.typeAnnotation,
        name: options.name,
        expressionType: 'AngularJS'
    };
}

export function assignTypeScript(expression : string, options : AssignOptions = { variableType: 'const' }) : AssignmentNode {
    return {
        type: "AssignmentNode",
        expression: expression,
        variableType: options.variableType || 'const',
        typeAnnotation: options.typeAnnotation,
        name: options.name,
        expressionType: 'TypeScript'
    };
}

export function arrayIteration(valueName : string, iterable : string, children : GeneratorAstNode[] = []) : ArrayIterationNode {
    return {
        type: "ArrayIterationNode",
        valueName,
        iterable: parseExpression(iterable),
        children
    };
}

export function objectIteration(keyName : string, valueName : string, iterable : string, children : GeneratorAstNode[] = []) : ObjectIterationNode {
    return {
        type: "ObjectIterationNode",
        keyName,
        valueName,
        iterable: parseExpression(iterable),
        children
    };
}

export function parameter(name : string, typeAnnotation : string) : ParameterNode {
    return {
        type: "ParameterNode",
        name,
        typeAnnotation
    };
}

export function templateRoot(children : GeneratorAstNode[] = []) : TemplateRootNode {
    return {
        type: "TemplateRootNode",
        children
    };
}

export function scopedBlock(parameters : ParameterNode[], children : GeneratorAstNode[] = [], scopeInterface? : string) : ScopedBlockNode {
    return {
        type: "ScopedBlockNode",
        parameters,
        children,
        scopeInterface
    };
}
