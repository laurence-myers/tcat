// export interface PrimitiveNode {
//     type : 'PrimitiveNode';
//     name : string;
//     primitiveType : 'boolean' | 'string' | 'number';
//     value? : string;
// }

export interface AssignmentNode {
    type : 'AssignmentNode';
    name? : string;
    variableType : 'let' | 'const';
    typeAnnotation? : string;
    expression : string;
}

export interface ArrayIterationNode {
    type : 'ArrayIterationNode';
    valueName : string;
    iterable : string;
    children : GeneratorAstNode[];
}

export interface ObjectIterationNode {
    type : 'ObjectIterationNode';
    keyName : string;
    valueName : string;
    iterable : string;
    children : GeneratorAstNode[];
}

export interface ScopedBlockNode {
    type : 'ScopedBlockNode';
    children : GeneratorAstNode[];
}

export type GeneratorAstNode = AssignmentNode | ArrayIterationNode | ObjectIterationNode | ScopedBlockNode;