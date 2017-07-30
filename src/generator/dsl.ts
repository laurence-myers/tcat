import {ExpressionNode, RootNode} from "./ast";

export function expr(expression : string) : ExpressionNode {
    return {
        type: "ExpressionNode",
        expression
    };
}

export function root(...expressions : ExpressionNode[]) : RootNode {
    return {
        type: "RootNode",
        expressions
    };
}