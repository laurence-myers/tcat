import {
    ArrayExpressionNode,
    AssignmentExpressionNode,
    AstNode,
    BinaryExpressionNode,
    CallExpressionNode,
    ConditionalExpressionNode,
    ConstantNode,
    ExpressionStatementNode,
    IdentifierNode,
    LiteralNode,
    LocalsExpressionNode,
    LogcalExpressionNode,
    MemberExpressionNode,
    ObjectExpressionNode,
    ProgramNode,
    PropertyNode,
    ThisExpressionNode,
    UnaryExpressionNode,
} from "./ast";
import {assertNever} from "../core";

abstract class BaseWalker {
    protected abstract walkArrayExpressionNode(node : ArrayExpressionNode) : void;
    protected abstract walkAssignmentExpressionNode(node : AssignmentExpressionNode) : void;
    protected abstract walkBinaryExpressionNode(node : BinaryExpressionNode) : void;
    protected abstract walkCallExpressionNode(node : CallExpressionNode) : void;
    protected abstract walkConditionalExpressionNode(node : ConditionalExpressionNode) : void;
    protected abstract walkExpressionStatementNode(node : ExpressionStatementNode) : void;
    protected abstract walkIdentifierNode(node : IdentifierNode) : void;
    protected abstract walkLiteralNode(node : LiteralNode | ConstantNode) : void;
    protected abstract walkLocalsExpressionNode(node : LocalsExpressionNode) : void;
    protected abstract walkLogicalExpressionNode(node : LogcalExpressionNode) : void;
    protected abstract walkMemberExpressionNode(node : MemberExpressionNode) : void;
    protected abstract walkObjectExpressionNode(node : ObjectExpressionNode) : void;
    protected abstract walkProgramNode(node : ProgramNode) : void;
    protected abstract walkPropertyNode(node : PropertyNode) : void
    protected abstract walkThisExpressionNode(node : ThisExpressionNode) : void;
    protected abstract walkUnaryExpressionNode(node : UnaryExpressionNode) : void;

    protected dispatchAll(nodes : AstNode[]) : void {
        return nodes.forEach((node) => this.dispatch(node));
    }

    protected dispatch(node : AstNode) : void {
        switch (node.type) {
            case "ArrayExpression":
                return this.walkArrayExpressionNode(node);
            case "AssignmentExpression":
                return this.walkAssignmentExpressionNode(node);
            case "BinaryExpression":
                return this.walkBinaryExpressionNode(node);
            case "CallExpression":
                return this.walkCallExpressionNode(node);
            case "ConditionalExpression":
                return this.walkConditionalExpressionNode(node);
            case "ExpressionStatement":
                return this.walkExpressionStatementNode(node);
            case "Identifier":
                return this.walkIdentifierNode(node);
            case "Literal":
                return this.walkLiteralNode(node);
            case "LocalsExpression":
                return this.walkLocalsExpressionNode(node);
            case "LogicalExpression":
                return this.walkLogicalExpressionNode(node);
            case "MemberExpression":
                return this.walkMemberExpressionNode(node);
            case "ObjectExpression":
                return this.walkObjectExpressionNode(node);
            case "Program":
                return this.walkProgramNode(node);
            case "Property":
                return this.walkPropertyNode(node);
            case "ThisExpression":
                return this.walkThisExpressionNode(node);
            case "UnaryExpression":
                return this.walkUnaryExpressionNode(node);
            default:
                assertNever(node);
                break;
        }
    }

    public walk(node : ProgramNode) : void {
        this.dispatch(node);
    }
}

export class SkippingWalker extends BaseWalker {
    protected walkArrayExpressionNode(node : ArrayExpressionNode) : void {
        this.dispatchAll(node.elements);
    }

    protected walkAssignmentExpressionNode(node : AssignmentExpressionNode) : void {
        this.dispatch(node.left);
        this.dispatch(node.right);
    }

    protected walkBinaryExpressionNode(node : BinaryExpressionNode) : void {
        this.dispatch(node.left);
        this.dispatch(node.right);
    }

    protected walkCallExpressionNode(node : CallExpressionNode) : void {
        this.dispatch(node.callee);
        this.dispatchAll(node.arguments);
    }

    protected walkConditionalExpressionNode(node : ConditionalExpressionNode) : void {
        this.dispatch(node.test);
        this.dispatch(node.alternate);
        this.dispatch(node.consequent);
    }

    protected walkExpressionStatementNode(node : ExpressionStatementNode) : void {
        this.dispatch(node.expression);
    }

    protected walkIdentifierNode(_ : IdentifierNode) : void {
    }

    protected walkLiteralNode(_ : LiteralNode | ConstantNode) : void {
    }

    protected walkLocalsExpressionNode(_ : LocalsExpressionNode) : void {
    }

    protected walkLogicalExpressionNode(node : LogcalExpressionNode) : void {
        this.dispatch(node.left);
        this.dispatch(node.right);
    }

    protected walkMemberExpressionNode(node : MemberExpressionNode) : void {
        this.dispatch(node.object);
        this.dispatch(node.property);
    }

    protected walkObjectExpressionNode(node : ObjectExpressionNode) : void {
        this.dispatchAll(node.properties);
    }

    protected walkProgramNode(node : ProgramNode) : void {
        this.dispatchAll(node.body);
    }

    protected walkPropertyNode(node : PropertyNode) : void {
        this.dispatch(node.key);
        this.dispatch(node.value);
    }

    protected walkThisExpressionNode(_ : ThisExpressionNode) : void {
    }

    protected walkUnaryExpressionNode(node : UnaryExpressionNode) : void {
        this.dispatch(node.argument);
    }
}

export class ExpressionToStringWalker extends SkippingWalker {
    sb = '';

    protected dispatchAll(nodes : AstNode[], seperator? : string) : void {
        return nodes.forEach((node, index) => {
            this.dispatch(node);
            if (seperator && index != nodes.length - 1) {
                this.sb += seperator;
            }
        });
    }

    protected walkArrayExpressionNode(node : ArrayExpressionNode) : void {
        this.sb += '[';
        this.dispatchAll(node.elements, ', ');
        this.sb += ']';
    }

    protected walkAssignmentExpressionNode(node : AssignmentExpressionNode) : void {
        this.dispatch(node.left);
        this.sb += ` ${ node.operator } `;
        this.dispatch(node.right);
    }

    protected walkBinaryExpressionNode(node : BinaryExpressionNode) : void {
        this.dispatch(node.left);
        this.sb += ` ${ node.operator } `;
        this.dispatch(node.right);
    }

    protected walkCallExpressionNode(node : CallExpressionNode) : void {
        if (node.filter) {
            this.dispatch(node.arguments[0]);
            this.sb += ' | ';
            this.dispatch(node.callee);
            this.sb += ' : ';
            this.dispatchAll(node.arguments.slice(1), ' : ');
        } else {
            this.dispatch(node.callee);
            this.sb += '(';
            this.dispatchAll(node.arguments, ', ');
            this.sb += ')';
        }
    }

    protected walkConditionalExpressionNode(node : ConditionalExpressionNode) : void {
        this.dispatch(node.test);
        this.sb += ' ? ';
        this.dispatch(node.consequent);
        this.sb += ' : ';
        this.dispatch(node.alternate);
    }

    protected walkExpressionStatementNode(node : ExpressionStatementNode) : void {
        this.dispatch(node.expression);
    }

    protected walkIdentifierNode(node : IdentifierNode) : void {
        this.sb += node.name;
    }

    protected walkLiteralNode(node : LiteralNode | ConstantNode) : void {
        if (node.isString) {
            this.sb += `"${ (<string> node.value).replace(/"/g, `\\"`) }"`;
        } else {
            this.sb += node.value;
        }
    }

    protected walkLocalsExpressionNode(_ : LocalsExpressionNode) : void {
        this.sb += '$locals';
    }

    protected walkLogicalExpressionNode(node : LogcalExpressionNode) : void {
        this.dispatch(node.left);
        this.sb += ` ${ node.operator } `;
        this.dispatch(node.right);
    }

    protected walkMemberExpressionNode(node : MemberExpressionNode) : void {
        this.dispatch(node.object);
        if (node.computed) {
            this.sb += '[';
            this.dispatch(node.property);
            this.sb += ']';
        } else {
            this.sb += '.';
            this.dispatch(node.property);
        }
    }

    protected walkObjectExpressionNode(node : ObjectExpressionNode) : void {
        this.sb += '{ ';
        this.dispatchAll(node.properties, ', ');
        this.sb += ' }';
    }

    protected walkProgramNode(node : ProgramNode) : void {
        this.dispatchAll(node.body, ';\n');
    }

    protected walkPropertyNode(node : PropertyNode) : void {
        this.dispatch(node.key);
        this.sb += ': ';
        this.dispatch(node.value);
    }

    protected walkThisExpressionNode(_ : ThisExpressionNode) : void {
        this.sb += 'this';
    }

    protected walkUnaryExpressionNode(node : UnaryExpressionNode) : void {
        this.sb += node.operator;
        this.dispatch(node.argument);
    }

    public walk(node : ProgramNode) : string {
        super.walk(node);
        return this.sb;
    }
}

export class ExpressionFilterRectifier extends ExpressionToStringWalker {
    protected walkCallExpressionNode(node : CallExpressionNode) : void {
        this.dispatch(node.callee);
        this.sb += '(';
        this.dispatchAll(node.arguments, ', ');
        this.sb += ')';
    }
}