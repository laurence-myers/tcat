import {ProgramNode} from "../ngExpression/ast";

export interface BaseAssignmentNode {
    type : 'AssignmentNode';
    name? : string;
    variableType : 'let' | 'const';
    typeAnnotation? : string;
}

export interface AngularJsAssignmentNode extends BaseAssignmentNode {
    expression : ProgramNode;
    expressionType : 'AngularJS';
}

export interface TypeScriptAssignmentNode extends BaseAssignmentNode {
    expression : string;
    expressionType : 'TypeScript';
}

export type AssignmentNode = AngularJsAssignmentNode | TypeScriptAssignmentNode;

export interface ArrayIterationNode {
    type : 'ArrayIterationNode';
    valueName : string;
    iterable : ProgramNode;
    children : GeneratorAstNode[];
}

export interface ObjectIterationNode {
    type : 'ObjectIterationNode';
    keyName : string;
    valueName : string;
    iterable : ProgramNode;
    children : GeneratorAstNode[];
}

export interface ParameterNode {
    type : 'ParameterNode';
    name : string;
    typeAnnotation : string;
}

export interface ScopedBlockNode {
    type : 'ScopedBlockNode';
    parameters : ParameterNode[];
    children : GeneratorAstNode[];
    scopeInterface? : string;
}

export interface TemplateRootNode {
    type : 'TemplateRootNode';
    children : GeneratorAstNode[];
}

export type HasChildrenAstNode = TemplateRootNode | ScopedBlockNode | ObjectIterationNode | ArrayIterationNode;
export type GeneratorAstNode = AssignmentNode | HasChildrenAstNode | ParameterNode;