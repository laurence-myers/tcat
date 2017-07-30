export interface ExpressionNode {
    type : 'ExpressionNode';
    expression : string;
}

export interface RootNode {
    type : 'RootNode';
    expressions : ExpressionNode[];
}

export type GeneratorNonRootAstNode = ExpressionNode;
export type GeneratorAstNode = GeneratorNonRootAstNode | RootNode;