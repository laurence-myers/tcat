import {ExpressionNode, GeneratorAstNode, RootNode} from "./ast";
import {assertNever} from "../core";

export abstract class BaseWalker {
    protected abstract walkExpressionNode(node : ExpressionNode) : void;
    protected abstract walkRootNode(node : RootNode) : void;

    protected dispatchAll(nodes : GeneratorAstNode[]) : void {
        return nodes.forEach((node) => this.dispatch(node));
    }

    protected dispatch(node : GeneratorAstNode) : void {
        switch (node.type) {
            case 'ExpressionNode':
                return this.walkExpressionNode(node);
            case 'RootNode':
                return this.walkRootNode(node);
            default:
                assertNever(node);
                break;
        }
    }
}

export class SkippingWalker extends BaseWalker {
    protected walkExpressionNode(_ : ExpressionNode) {

    }

    protected walkRootNode(node : RootNode) {
        this.dispatchAll(node.expressions);
    }
}

export class TypeScriptGenerator extends SkippingWalker {
    protected counters = {
        expressions: 0
    };
    protected output = '';

    protected walkExpressionNode(node : ExpressionNode) : void {
        // language=TypeScript
        this.output += `const expr_${ ++this.counters.expressions } = ${ node.expression };\n`;
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