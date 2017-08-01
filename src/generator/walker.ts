import {ArrayIterationNode, AssignmentNode, GeneratorAstNode, ObjectIterationNode, ScopedBlockNode} from "./ast";
import {assertNever} from "../core";

export abstract class BaseWalker {
    protected abstract walkArrayIterationNode(node : ArrayIterationNode) : void;
    protected abstract walkAssignmentNode(node : AssignmentNode) : void;
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

    protected walkObjectIterationNode(node : ObjectIterationNode) : void {
        return this.dispatchAll(node.children);
    }

    protected walkScopedBlockNode(node : ScopedBlockNode) {
        this.dispatchAll(node.children);
    }
}

export class TypeScriptGenerator extends SkippingWalker {
    protected counters = {
        expressions: 0,
        blocks: 0
    };
    protected output = '';
    protected indentLevel = 0;
    protected indentString = '    ';

    protected writeLine(value : string) : void {
        for (let i = 0; i < this.indentLevel; i++) {
            this.output += this.indentString;
        }
        this.output += value;
        this.output += '\n';
    }

    protected walkArrayIterationNode(node : ArrayIterationNode) : void {
        this.writeLine(`for (const ${ node.valueName } of ${ node.iterable }) {`);
        this.indentLevel++;
        super.walkArrayIterationNode(node);
        this.indentLevel--;
        this.writeLine(`}`);
    }

    protected walkAssignmentNode(node : AssignmentNode) : void {
        const name = node.name || 'expr_' + ++this.counters.expressions;
        const typeAnnotation = node.typeAnnotation ? ' : ' + node.typeAnnotation : '';
        this.writeLine(`${ node.variableType } ${ name }${ typeAnnotation } = ${ node.expression };`);
    }

    protected walkObjectIterationNode(node : ObjectIterationNode) : void {
        this.writeLine(`for (const ${ node.keyName } in ${ node.iterable }) {`);
        this.indentLevel++;
        this.writeLine(`const ${ node.valueName } = ${ node.iterable }[${ node.keyName }];`);
        this.indentLevel--;
        super.walkObjectIterationNode(node);
        this.writeLine(`}`);
    }

    protected walkScopedBlockNode(node : ScopedBlockNode) : void {
        this.writeLine(`function block_${ ++this.counters.blocks }() {`);
        this.indentLevel++;
        super.walkScopedBlockNode(node);
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