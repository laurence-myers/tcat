import {ProgramNode} from "../src/ngExpression/ast";
import {unwrapEither} from "../src/core";
import {parseExpression} from "../src/ngExpression/ngAstBuilder";

export function ngExpr(expression : string) : ProgramNode | never {
    return unwrapEither(parseExpression(expression));
}