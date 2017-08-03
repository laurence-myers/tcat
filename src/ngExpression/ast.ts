export interface ArrayExpressionNode {
    type : 'ArrayExpression';
    elements : StartPrecedence<ExpressionPrecedence>[];
}

export interface LiteralNode {
    type : 'Literal';
    value : string | number;
    isString? : boolean;
}

export interface IdentifierNode {
    type : 'Identifier';
    name : string;
}

export type ConstantNode = LiteralNode;

export interface PropertyNode {
    type : 'Property';
    kind : 'init';
    key : ConstantNode | IdentifierNode | StartPrecedence<ExpressionPrecedence>;
    computed : boolean;
    value : ConstantNode | IdentifierNode | StartPrecedence<ExpressionPrecedence>;
}

export interface ObjectExpressionNode {
    type : 'ObjectExpression';
    properties : PropertyNode[];
}

export interface ThisExpressionNode {
    type : 'ThisExpression';
}

export interface LocalsExpressionNode {
    type : 'LocalsExpression';
}

type SelfReferentialNode = ThisExpressionNode | LocalsExpressionNode;

export interface CallExpressionNode {
    type : 'CallExpression';
    callee : BasePrimaryType | FilterChainPrecedence;
    arguments : FilterChainPrecedence[];
    filter : boolean;
}

export interface MemberExpressionExpressionNode {
    type : 'MemberExpression';
    object : BasePrimaryType | FilterChainPrecedence;
    property : StartPrecedence<ExpressionPrecedence>;
    computed : true;
}

export interface MemberExpressionIdentifierNode {
    type : 'MemberExpression';
    object : BasePrimaryType | StartPrecedence<FilterChainPrecedence>;
    property : IdentifierNode;
    computed : false;
}

export type MemberExpressionNode = MemberExpressionExpressionNode | MemberExpressionIdentifierNode

type BasePrimaryType =
    // FilterChainPrecedence
    ArrayExpressionNode
    | ObjectExpressionNode
    | SelfReferentialNode
    | LiteralNode
    | IdentifierNode
    | ConstantNode;

type PrimaryNode =
    BasePrimaryType
    | CallExpressionNode
    | MemberExpressionNode;

type FilterNode = CallExpressionNode;

export interface UnaryExpressionNode {
    type : 'UnaryExpression';
    operator : '+' | '-' | '!';
    prefix : true;
    argument : StartPrecedence<UnaryPrecedence>;
}

export interface BinaryExpressionMultiplicativeNode {
    type : 'BinaryExpression';
    operator : '*' | '/' | '%';
    left : StartPrecedence<UnaryPrecedence>;
    right : StartPrecedence<UnaryPrecedence>;
}

export interface BinaryExpressionAdditiveNode {
    type : 'BinaryExpression';
    operator : '+' | '-';
    left : StartPrecedence<MultiplicativePrecedence>;
    right : StartPrecedence<MultiplicativePrecedence>;
}

export interface BinaryExpressionRelationalNode {
    type : 'BinaryExpression';
    operator : '<' | '>' | '<=' | '>=';
    left : StartPrecedence<AdditivePrecedence>;
    right : StartPrecedence<AdditivePrecedence>;
}

export interface BinaryExpressionEqualityNode {
    type : 'BinaryExpression';
    operator : '==' | '!=' | '===' | '!==';
    left : StartPrecedence<RelationalPrecedence>;
    right : StartPrecedence<RelationalPrecedence>;
}

export type BinaryExpressionNode =
    BinaryExpressionMultiplicativeNode
    | BinaryExpressionAdditiveNode
    | BinaryExpressionRelationalNode
    | BinaryExpressionEqualityNode;

export interface LogicalExpressionAndNode {
    type : 'LogicalExpression';
    operator : '&&';
    left : StartPrecedence<EqualityPrecedence>;
    right : StartPrecedence<EqualityPrecedence>;
}

export interface LogicalExpressionOrNode {
    type : 'LogicalExpression';
    operator : '||';
    left : StartPrecedence<LogicalAndPrecedence>;
    right : StartPrecedence<LogicalAndPrecedence>;
}

export type LogcalExpressionNode =
    LogicalExpressionAndNode
    | LogicalExpressionOrNode;

export interface ConditionalExpressionNode {
    type : 'ConditionalExpression';
    test : StartPrecedence<LogicalOrPrecedence>;
    alternate : StartPrecedence<ExpressionPrecedence>;
    consequent : StartPrecedence<ExpressionPrecedence>;
}

export interface AssignmentExpressionNode {
    type : 'AssignmentExpression';
    left : StartPrecedence<TernaryPrecedence>;
    right : StartPrecedence<AssignmentPrecedence>;
    operator : '=';
}

export interface ExpressionStatementNode {
    type : 'ExpressionStatement';
    expression : FilterChainPrecedence;
}

export interface ProgramNode {
    type : 'Program';
    body : ExpressionStatementNode[];
}

// Daft workaround to avoid circular type alias error in TypeScript.
type StartPrecedence<TNode> = TNode | FilterChainPrecedence

type FilterChainPrecedence = FilterNode | ExpressionPrecedence;
type ExpressionPrecedence = AssignmentPrecedence;
type AssignmentPrecedence = AssignmentExpressionNode | TernaryPrecedence;
type TernaryPrecedence = ConditionalExpressionNode | LogicalOrPrecedence;
type LogicalOrPrecedence = LogicalExpressionOrNode | LogicalAndPrecedence;
type LogicalAndPrecedence = LogicalExpressionAndNode | EqualityPrecedence;
type EqualityPrecedence = BinaryExpressionEqualityNode | RelationalPrecedence;
type RelationalPrecedence = BinaryExpressionRelationalNode | AdditivePrecedence;
type AdditivePrecedence = BinaryExpressionAdditiveNode | MultiplicativePrecedence;
type MultiplicativePrecedence = BinaryExpressionMultiplicativeNode | UnaryPrecedence;
type UnaryPrecedence = UnaryExpressionNode | PrimaryNode;

export type AstNode =
    | PropertyNode
    | SelfReferentialNode
    | PrimaryNode
    | UnaryExpressionNode
    | BinaryExpressionMultiplicativeNode
    | BinaryExpressionAdditiveNode
    | BinaryExpressionRelationalNode
    | BinaryExpressionEqualityNode
    | LogicalExpressionAndNode
    | LogicalExpressionOrNode
    | CallExpressionNode
    | ConditionalExpressionNode
    | AssignmentExpressionNode
    | ExpressionStatementNode
    | ProgramNode;
