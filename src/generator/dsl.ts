import {ExpressionNode} from "./ast";

export function expr(expression : string) : ExpressionNode {
    return {
        type: "ExpressionNode",
        expression
    };
}