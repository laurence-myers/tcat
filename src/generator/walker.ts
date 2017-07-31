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

    protected walkAssignmentNode(node : AssignmentNode) : void {
        this.output += `${ node.variableType } expr_${ ++this.counters.expressions }${ node.typeAnnotation ? ' : ' + node.typeAnnotation : '' } = ${ node.expression };\n`;
    }

    protected walkScopedBlockNode(node : ScopedBlockNode) : void {
        this.output += `function block_${ ++this.counters.blocks }() {\n`;
        super.walkScopedBlockNode(node);
        this.output += `}\n`;
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