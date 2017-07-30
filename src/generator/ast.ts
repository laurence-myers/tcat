export interface ExpressionNode {
    type : 'ExpressionNode';
    expression : string;
}

export type GeneratorAstNode = ExpressionNode;