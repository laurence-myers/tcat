import {
    ArrayIterationNode,
    AssignmentNode,
    GeneratorAstNode,
    ObjectIterationNode,
    TemplateRootNode,
    ScopedBlockNode, ParameterNode, IfStatementNode
} from "./ast";
import {assertNever} from "../core";
import {ExpressionScopeRectifier} from "../ngExpression/expressionWalker";
import {ProgramNode} from "../ngExpression/ast";

export abstract class BaseWalker {
    protected abstract walkArrayIterationNode(node : ArrayIterationNode) : void;
    protected abstract walkAssignmentNode(node : AssignmentNode) : void;
    protected abstract walkIfStatementNode(node : IfStatementNode) : void;
    protected abstract walkObjectIterationNode(node : ObjectIterationNode) : void;
    protected abstract walkParameterNode(node : ParameterNode) : void;
    protected abstract walkScopedBlockNode(node : ScopedBlockNode) : void;
    protected abstract walkTemplateRootNode(node : TemplateRootNode) : void;

    protected dispatchAll(nodes : GeneratorAstNode[]) : void {
        return nodes.forEach((node) => this.dispatch(node));
    }

    protected dispatch(node : GeneratorAstNode) : void {
        switch (node.type) {
            case 'ArrayIterationNode':
                return this.walkArrayIterationNode(node);
            case 'AssignmentNode':
                return this.walkAssignmentNode(node);
            case 'IfStatementNode':
                return this.walkIfStatementNode(node);
            case 'ObjectIterationNode':
                return this.walkObjectIterationNode(node);
            case 'ParameterNode':
                return this.walkParameterNode(node);
            case 'ScopedBlockNode':
                return this.walkScopedBlockNode(node);
            case 'TemplateRootNode':
                return this.walkTemplateRootNode(node);
            default:
                assertNever(node);
                break;
        }
    }
}

export class SkippingWalker extends BaseWalker {
    protected walkArrayIterationNode(node : ArrayIterationNode) : void {
        this.dispatchAll(node.children);
    }

    protected walkAssignmentNode(_node : AssignmentNode) {

    }

    protected walkIfStatementNode(node : IfStatementNode) : void {
        this.dispatchAll(node.children);
    }

    protected walkObjectIterationNode(node : ObjectIterationNode) : void {
        this.dispatchAll(node.children);
    }

    protected walkParameterNode(_node : ParameterNode) : void {
    }

    protected walkScopedBlockNode(node : ScopedBlockNode) {
        this.dispatchAll(node.children);
    }

    protected walkTemplateRootNode(node : TemplateRootNode) : void {
        this.dispatchAll(node.children);
    }
}

export class TypeScriptGenerator extends SkippingWalker {
    protected counters = {
        scopes: 0,
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
        if (this.localsStack.length === 0) {
            this.pushLocalsScope();

        }
        const locals = this.localsStack[this.localsStack.length - 1];
        locals.add(name);
    }

    protected formatExpression(expression : ProgramNode) : string {
        const expressionWalker = new ExpressionScopeRectifier(this.counters.scopes, this.localsStack);
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
        const name = node.name || '_expr_' + ++this.counters.expressions;
        this.addLocal(name);
        const typeAnnotation =
            node.typeAnnotation
                ? ' : ' + node.typeAnnotation
                : '';
        const expression =
            node.expressionType === 'AngularJS'
                ? this.formatExpression(node.expression)
                : node.expression;
        this.writeLine(`${ node.variableType } ${ name }${ typeAnnotation } = ${ expression };`);
    }

    protected walkIfStatementNode(node : IfStatementNode) : void {
        this.writeLine(`if (${ this.formatExpression(node.expression) }) {`);
        this.indentLevel++;
        super.walkIfStatementNode(node);
        this.indentLevel--;
        this.writeLine(`}`);
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

    protected walkParameterNode(node : ParameterNode) : void {
        this.writeLine(`${ node.name } : ${ node.typeAnnotation },`);
        this.addLocal(node.name);
    }

    protected walkScopedBlockNode(node : ScopedBlockNode) : void {
        if (node.scopeInterface) {
            // TODO: just make the scope object a parameter of the function/scoped block.
            this.writeLine(`declare const _scope_${ ++this.counters.scopes } : ${ node.scopeInterface };`);
        }
        this.pushLocalsScope();
        const blockStart = `const _block_${ ++this.counters.blocks } = function (`;
        const blockStartSuffix = `) {`;
        if (node.parameters.length > 0) {
            this.writeLine(blockStart);
            this.indentLevel++;
            this.dispatchAll(node.parameters);
            this.indentLevel--;
            this.writeLine(blockStartSuffix);
        } else {
            this.writeLine(blockStart + blockStartSuffix);
        }
        this.indentLevel++;
        super.walkScopedBlockNode(node);
        this.popLocalsScope();
        this.indentLevel--;
        this.writeLine(`};`);
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