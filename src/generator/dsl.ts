import {
    ArrayIterationNode,
    AssignmentNode,
    GeneratorAstNode,
    ObjectIterationNode, TemplateRootNode,
    ScopedBlockNode
} from "./ast";
import {parseExpression} from "../parsers";

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

export function templateRoot(children : GeneratorAstNode[] = []) : TemplateRootNode {
    return {
        type: "TemplateRootNode",
        children
    };
}

export function scopedBlock(children : GeneratorAstNode[] = [], scopeInterface? : string) : ScopedBlockNode {
    return {
        type : 'ScopedBlockNode',
        children,
        scopeInterface
    };
}
