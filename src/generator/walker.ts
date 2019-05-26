import {
    ArrayIterationNode,
    AssignmentNode,
    GeneratorAstNode,
    ObjectIterationNode,
    TemplateRootNode,
    ScopedBlockNode, ParameterNode, IfStatementNode
} from "./ast";
import { assertNever, last } from "../core";
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

export interface SourceLocation {
    startLine : number;
    startCol : number;
    endLine : number;
    endCol : number;
}

export interface SourceMapEntry {
    generated : SourceLocation;
    original : SourceLocation;
}

export interface TypeScriptGeneratorResult {
    generatedCode : string;
    sourceMap : SourceMapEntry[]; // TODO: use a better data structure, like a tree
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
    protected lineCount = 0;
    protected localsStack : Set<string>[] = [];
    protected scopeNumberStack : number[] = [];
    protected sourceMap : SourceMapEntry[] = [];

    protected writeLine(value : string) : SourceLocation {
        const startLine = this.lineCount;
        const lineStart = this.output.length;
        for (let i = 0; i < this.indentLevel; i++) {
            this.output += this.indentString;
        }
        const startCol = this.output.length - lineStart;
        this.output += value;
        const endCol = this.output.length - lineStart;
        this.output += '\n';
        this.lineCount++;
        return {
            startLine,
            startCol,
            endLine: startLine, // should be the same line
            endCol
        };
    }

    protected addSourceMapping(
        original : SourceLocation,
        generated : SourceLocation
    ) : void {
        this.sourceMap.push({
            original,
            generated
        });
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
        const locals = last(this.localsStack);
        locals!.add(name);
    }

    protected formatExpression(expression : ProgramNode) : string {
        const expressionWalker = new ExpressionScopeRectifier(last(this.scopeNumberStack) || 0, this.localsStack);
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
        const generatedLocation = this.writeLine(
            `${ node.variableType } ${ name }${ typeAnnotation } = ${ expression };`
        );
        if (node.expressionType === 'TypeScript') { // TODO: remove this check once I've added locations everywhere
            this.addSourceMapping(
                node.htmlSourceLocation,
                generatedLocation
            );
        }
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
        this.pushLocalsScope();
        const blockStart = `const _block_${ ++this.counters.blocks } = function (`;
        const blockStartSuffix = `) {`;
        if (node.parameters.length > 0 || node.scopeInterface) {
            this.writeLine(blockStart);
            this.indentLevel++;
            if (node.scopeInterface) {
                this.writeLine(`_scope_${ ++this.counters.scopes } : ${ node.scopeInterface },`);
                this.scopeNumberStack.push(this.counters.scopes);
            }
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
        if (node.scopeInterface) {
            this.scopeNumberStack.pop();
        }
        this.writeLine(`};`);
    }

    public generate(node : GeneratorAstNode) : TypeScriptGeneratorResult {
        this.dispatch(node);
        return {
            generatedCode: this.output,
            sourceMap: this.sourceMap
        };
    }
}

export function generateTypeScript(node : GeneratorAstNode) : TypeScriptGeneratorResult {
    const generator = new TypeScriptGenerator();
    return generator.generate(node);
}
