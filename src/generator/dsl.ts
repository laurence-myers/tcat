import {
    ArrayIterationNode,
    AssignmentNode, DeclarationNode,
    GeneratorAstNode,
    ObjectIterationNode,
    ScopedBlockNode
} from "./ast";

export function declare(name : string, typeAnnotation : string) : DeclarationNode {
    return {
        type: "DeclarationNode",
        name,
        typeAnnotation
    };
}

interface AssignOptions {
    name? : string;
    variableType? : 'let' | 'const';
    typeAnnotation? : string;
}
export function assign(expression : string, options : AssignOptions = { variableType: 'const' }) : AssignmentNode {
    return {
        type: "AssignmentNode",
        expression,
        variableType: options.variableType || 'const',
        typeAnnotation: options.typeAnnotation,
        name : options.name
    };
}

export function arrayIteration(valueName : string, iterable : string, children : GeneratorAstNode[] = []) : ArrayIterationNode {
    return {
        type: "ArrayIterationNode",
        valueName,
        iterable,
        children
    };
}

export function objectIteration(keyName : string, valueName : string, iterable : string, children : GeneratorAstNode[] = []) : ObjectIterationNode {
    return {
        type: "ObjectIterationNode",
        keyName,
        valueName,
        iterable,
        children
    };
}

export function scopedBlock(children : GeneratorAstNode[] = []) : ScopedBlockNode {
    return {
        type : 'ScopedBlockNode',
        children
    };
}
