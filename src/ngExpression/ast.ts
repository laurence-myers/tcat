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

export type SelfReferentialNode = ThisExpressionNode | LocalsExpressionNode;

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

export type MemberExpressionNode = MemberExpressionExpressionNode | MemberExpressionIdentifierNode;

export type BasePrimaryType =
    // FilterChainPrecedence
    ArrayExpressionNode
    | ObjectExpressionNode
    | SelfReferentialNode
    | LiteralNode
    | IdentifierNode
    | ConstantNode;

export type PrimaryNode =
    BasePrimaryType
    | CallExpressionNode
    | MemberExpressionNode;

export type FilterNode = CallExpressionNode;

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
export type StartPrecedence<TNode> = TNode | FilterChainPrecedence;

export type FilterChainPrecedence = FilterNode | ExpressionPrecedence;
export type ExpressionPrecedence = AssignmentPrecedence;
export type AssignmentPrecedence = AssignmentExpressionNode | TernaryPrecedence;
export type TernaryPrecedence = ConditionalExpressionNode | LogicalOrPrecedence;
export type LogicalOrPrecedence = LogicalExpressionOrNode | LogicalAndPrecedence;
export type LogicalAndPrecedence = LogicalExpressionAndNode | EqualityPrecedence;
export type EqualityPrecedence = BinaryExpressionEqualityNode | RelationalPrecedence;
export type RelationalPrecedence = BinaryExpressionRelationalNode | AdditivePrecedence;
export type AdditivePrecedence = BinaryExpressionAdditiveNode | MultiplicativePrecedence;
export type MultiplicativePrecedence = BinaryExpressionMultiplicativeNode | UnaryPrecedence;
export type UnaryPrecedence = UnaryExpressionNode | PrimaryNode;

export type AngularJsAstNode =
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
