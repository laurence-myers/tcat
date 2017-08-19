import {
    ArrayIterationNode,
    AssignmentNode,
    DeclarationNode,
    GeneratorAstNode,
    ObjectIterationNode,
    ScopedBlockNode
} from "./ast";
import {assertNever} from "../core";
import {ExpressionScopeRectifier} from "../ngExpression/expressionWalker";
import {ProgramNode} from "../ngExpression/ast";

export abstract class BaseWalker {
    protected abstract walkArrayIterationNode(node : ArrayIterationNode) : void;
    protected abstract walkAssignmentNode(node : AssignmentNode) : void;
    protected abstract walkDeclarationNode(node : DeclarationNode) : void;
    protected abstract walkObjectIterationNode(node : ObjectIterationNode) : void;
    protected abstract walkScopedBlockNode(node : ScopedBlockNode) : void;

    protected dispatchAll(nodes : GeneratorAstNode[]) : void {
        return nodes.forEach((node) => this.dispatch(node));
    }

    protected dispatch(node : GeneratorAstNode) : void {
        switch (node.type) {
            case 'ArrayIterationNode':
                return this.walkArrayIterationNode(node);
            case 'AssignmentNode':
                return this.walkAssignmentNode(node);
            case 'DeclarationNode':
                return this.walkDeclarationNode(node);
            case 'ObjectIterationNode':
                return this.walkObjectIterationNode(node);
            case 'ScopedBlockNode':
                return this.walkScopedBlockNode(node);
            default:
                assertNever(node);
                break;
        }
    }
}

export class SkippingWalker extends BaseWalker {
    protected walkArrayIterationNode(node : ArrayIterationNode) : void {
        return this.dispatchAll(node.children);
    }

    protected walkAssignmentNode(_ : AssignmentNode) {

    }

    protected walkDeclarationNode(_ : DeclarationNode) : void {
    }

    protected walkObjectIterationNode(node : ObjectIterationNode) : void {
        return this.dispatchAll(node.children);
    }

    protected walkScopedBlockNode(node : ScopedBlockNode) {
        this.dispatchAll(node.children);
    }
}

export class TypeScriptGenerator extends SkippingWalker {
    protected counters = {
        declarations: 0,
        expressions: 0,
        blocks: 0
    };
    protected output = '';
    protected indentLevel = 0;
    protected indentString = '    ';
    protected localsStack : Set<string>[] = [];

    protected writeLine(value : string) : void {
        for (let i = 0; i < this.indentLevel; i++) {
            this.output += this.indentString;
        }
        this.output += value;
        this.output += '\n';
    }

    protected pushLocalsScope() : void {
        this.localsStack.push(new Set<string>());
    }

    protected popLocalsScope() : void {
        this.localsStack.pop();
    }

    protected addLocal(name : string) : void {
        if (this.localsStack.length == 0) {
            this.pushLocalsScope();

        }
        const locals = this.localsStack[this.localsStack.length - 1];
        locals.add(name);
    }

    protected formatExpression(expression : ProgramNode) : string {
        const expressionWalker = new ExpressionScopeRectifier(this.localsStack);
        return `(${ expressionWalker.walk(expression) })`;
    }

    protected walkArrayIterationNode(node : ArrayIterationNode) : void {
        this.writeLine(`for (const ${ node.valueName } of ${ this.formatExpression(node.iterable) }) {`);
        this.pushLocalsScope();
        this.addLocal(node.valueName);
        this.indentLevel++;
        super.walkArrayIterationNode(node);
        this.popLocalsScope();
        this.indentLevel--;
        this.writeLine(`}`);
    }

    protected walkAssignmentNode(node : AssignmentNode) : void {
        const name = node.name || 'expr_' + ++this.counters.expressions;
        this.addLocal(name);
        const typeAnnotation = node.typeAnnotation ? ' : ' + node.typeAnnotation : '';
        this.writeLine(`${ node.variableType } ${ name }${ typeAnnotation } = ${ this.formatExpression(node.expression) };`);
    }

    protected walkDeclarationNode(node : DeclarationNode) : void {
        const name = node.name || 'decl_' + ++this.counters.declarations;
        this.addLocal(name);
        const typeAnnotation = node.typeAnnotation;
        this.writeLine(`declare let ${ name } : ${ typeAnnotation };`);
    }

    protected walkObjectIterationNode(node : ObjectIterationNode) : void {
        this.writeLine(`for (const ${ node.keyName } in ${ this.formatExpression(node.iterable) }) {`);
        this.pushLocalsScope();
        this.addLocal(node.keyName);
        this.indentLevel++;
        this.writeLine(`const ${ node.valueName } = ${ this.formatExpression(node.iterable) }[${ node.keyName }];`);
        this.addLocal(node.valueName);
        super.walkObjectIterationNode(node);
        this.popLocalsScope();
        this.indentLevel--;
        this.writeLine(`}`);
    }

    protected walkScopedBlockNode(node : ScopedBlockNode) : void {
        this.writeLine(`function block_${ ++this.counters.blocks }() {`);
        this.indentLevel++;
        this.pushLocalsScope();
        super.walkScopedBlockNode(node);
        this.popLocalsScope();
        this.indentLevel--;
        this.writeLine(`}`);
    }

    public generate(node : GeneratorAstNode) : string {
        this.dispatch(node);
        return this.output;
    }
}

export function generateTypeScript(node : GeneratorAstNode) : string {
    const generator = new TypeScriptGenerator();
    return generator.generate(node);
}