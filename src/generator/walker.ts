import {ExpressionNode, GeneratorAstNode} from "./ast";
import {assertNever} from "../core";

export abstract class BaseWalker {
    protected abstract walkExpressionNode(node : ExpressionNode) : void;

    protected dispatchAll(nodes : GeneratorAstNode[]) : void {
        return nodes.forEach((node) => this.dispatch(node));
    }

    protected dispatch(node : GeneratorAstNode) : void {
        switch (node.type) {
            case 'ExpressionNode':
                return this.walkExpressionNode(node);
            default:
                assertNever(node.type);
                break;
        }
    }
}

export class SkippingWalker extends BaseWalker {
    protected walkExpressionNode(_ : ExpressionNode) {

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