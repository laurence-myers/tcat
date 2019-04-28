import {
    ArrayIterationNode,
    AssignmentNode,
    GeneratorAstNode,
    IfStatementNode,
    ObjectIterationNode,
    ParameterNode,
    ScopedBlockNode,
    TemplateRootNode
} from "./ast";
import {ProgramNode} from "../ngExpression/ast";

export interface AssignOptions {
    name? : string;
    variableType? : 'let' | 'const';
    typeAnnotation? : string;
}
export function assign(expression : ProgramNode, options : AssignOptions = { variableType: 'const' }) : AssignmentNode {
    return {
        type: "AssignmentNode",
        expression,
        variableType: options.variableType || 'const',
        typeAnnotation: options.typeAnnotation,
        name: options.name,
        expressionType: 'AngularJS'
    };
}

export function assignTs(expression : string, options : AssignOptions = { variableType: 'const' }) : AssignmentNode {
    return {
        type: "AssignmentNode",
        expression: expression,
        variableType: options.variableType || 'const',
        typeAnnotation: options.typeAnnotation,
        name: options.name,
        expressionType: 'TypeScript'
    };
}

export function arrayIteration(valueName : string, iterable : ProgramNode, children : GeneratorAstNode[] = []) : ArrayIterationNode {
    return {
        type: "ArrayIterationNode",
        valueName,
        iterable,
        children
    };
}

export function ifStatement(expression : ProgramNode, children : GeneratorAstNode[] = []) : IfStatementNode {
    return {
        type: "IfStatementNode",
        expression,
        children
    };
}

export function objectIteration(keyName : string, valueName : string, iterable : ProgramNode, children : GeneratorAstNode[] = []) : ObjectIterationNode {
    return {
        type: "ObjectIterationNode",
        keyName,
        valueName,
        iterable,
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
