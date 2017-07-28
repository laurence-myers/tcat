import {
    AstNode, CallExpressionNode, ExpressionStatementNode, IdentifierNode, MemberExpressionExpressionNode,
    MemberExpressionNode,
    ProgramNode
} from "./ast";
// import {assertNever} from "../core";

abstract class BaseWalker {
    protected abstract walkCallExpressionNode(node : CallExpressionNode) : void;
    protected abstract walkExpressionStatementNode(node : ExpressionStatementNode) : void;
    protected abstract walkIdentifierNode(node : IdentifierNode) : void;
    protected abstract walkMemberExpressionNode(node : MemberExpressionNode) : void;
    protected abstract walkProgramNode(node : ProgramNode) : void;

    protected dispatchAll(nodes : AstNode[]) : void {
        return nodes.forEach((node) => this.dispatch(node));
    }

    protected dispatch(node : AstNode) : void {
        switch (node.type) {
            case "CallExpression":
                return this.walkCallExpressionNode(node);
            case "ExpressionStatement":
                return this.walkExpressionStatementNode(node);
            case "Identifier":
                return this.walkIdentifierNode(node);
            case "MemberExpression":
                return this.walkMemberExpressionNode(node);
            case "Program":
                return this.walkProgramNode(node);
            default:
                // assertNever(node);
                break;
        }
    }

    public walk(node : ProgramNode) : void {
        this.dispatch(node);
    }
}

export class SkippingWalker extends BaseWalker {
    protected walkCallExpressionNode(node : CallExpressionNode) : void {
        this.dispatch(node.callee);
        this.dispatchAll(node.arguments);
    }

    protected walkExpressionStatementNode(node : ExpressionStatementNode) : void {
        console.log(node);
        this.dispatch(node.expression);
    }

    protected walkIdentifierNode(_ : IdentifierNode) : void {
    }

    protected walkMemberExpressionNode(node : MemberExpressionExpressionNode) : void {
        this.dispatch(node.object);
        this.dispatch(node.property);
    }

    protected walkProgramNode(node : ProgramNode) : void {
        this.dispatchAll(node.body);
    }
}

export class AstWalker extends SkippingWalker {
    identifiers : string[] = [];
    currentMemberExpression : string[];

    protected walkMemberExpressionNode(node : MemberExpressionExpressionNode) : void {
        this.currentMemberExpression = [];
        this.dispatch(node.object);
        this.dispatch(node.property);
        this.identifiers.push(this.currentMemberExpression.join('.'));
    }

    protected walkIdentifierNode(node : IdentifierNode) : void {
        this.currentMemberExpression.push(node.name);
    }

    public walk(node : ProgramNode) : void {
        super.walk(node);
        console.log(this.identifiers);
    }
}