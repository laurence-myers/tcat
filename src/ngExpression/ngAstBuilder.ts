//
// The MIT License
//
// Copyright (c) 2010-2017 Google, Inc. http://angularjs.org
// Copyright (c) 2017 Laurence Dougal Myers
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

// This code was derived from the AngularJS expression AST builder.
// It's been modified to record the string positions of expressions, filters, and filter args.

import {ProgramNode} from "./ast";
import {Either} from "monet";
import {NgExpressionParserError} from "../core";

const hasOwnProperty = Object.prototype.hasOwnProperty;
function isDefined(value : any) { return typeof value !== 'undefined'; }
function isString(value : any) { return typeof value === 'string'; }
let lowercase = function(str : any) { return isString(str) ? str.toLowerCase() : str; };
// let uppercase = function(string : any) {return isString(string) ? string.toUpperCase() : string;};
const getPrototypeOf = Object.getPrototypeOf;
const isArray = Array.isArray;
function isObject(value : any) {
    // http://jsperf.com/isobject4
    return value !== null && typeof value === 'object';
}
function isBlankObject(value : any) {
    return value !== null && typeof value === 'object' && !getPrototypeOf(value);
}
function isFunction(value : any) { return typeof value === 'function'; }
function setHashKey(obj : any, h? : any) {
    if (h) {
        obj.$$hashKey = h;
    } else {
        delete obj.$$hashKey;
    }
}

function copy(source : any) {
    let stackSource : any[] = [];
    let stackDest : any[] = [];

    return copyElement(source);

    function copyRecurse(source : any, destination : any) {
        let h = destination.$$hashKey;
        let key;
        if (isArray(source)) {
            for (let i = 0, ii = source.length; i < ii; i++) {
                destination.push(copyElement(source[i]));
            }
        } else if (isBlankObject(source)) {
            // createMap() fast path --- Safe to avoid hasOwnProperty check because prototype chain is empty
            for (key in source) {
                destination[key] = copyElement(source[key]);
            }
        } else if (source && typeof source.hasOwnProperty === 'function') {
            // Slow path, which must rely on hasOwnProperty
            for (key in source) {
                if (source.hasOwnProperty(key)) {
                    destination[key] = copyElement(source[key]);
                }
            }
        } else {
            // Slowest path --- hasOwnProperty can't be called as a method
            for (key in source) {
                if (hasOwnProperty.call(source, key)) {
                    destination[key] = copyElement(source[key]);
                }
            }
        }
        setHashKey(destination, h);
        return destination;
    }

    function copyElement(source : any) {
        // Simple values
        if (!isObject(source)) {
            return source;
        }

        // Already copied values
        let index = stackSource.indexOf(source);
        if (index !== -1) {
            return stackDest[index];
        }

        let needsRecurse = false;
        let destination : any = copyType(source);

        if (destination === undefined) {
            destination = isArray(source) ? [] : Object.create(getPrototypeOf(source));
            needsRecurse = true;
        }

        stackSource.push(source);
        stackDest.push(destination);

        return needsRecurse
            ? copyRecurse(source, destination)
            : destination;
    }

    function copyType(source : any) {
        switch (toString.call(source)) {
            case '[object Int8Array]':
            case '[object Int16Array]':
            case '[object Int32Array]':
            case '[object Float32Array]':
            case '[object Float64Array]':
            case '[object Uint8Array]':
            case '[object Uint8ClampedArray]':
            case '[object Uint16Array]':
            case '[object Uint32Array]':
                return new source.constructor(copyElement(source.buffer), source.byteOffset, source.length);

            case '[object ArrayBuffer]':
                // Support: IE10
                if (!source.slice) {
                    // If we're in this case we know the environment supports ArrayBuffer
                    /* eslint-disable no-undef */
                    let copied = new ArrayBuffer(source.byteLength);
                    new Uint8Array(copied).set(new Uint8Array(source));
                    /* eslint-enable */
                    return copied;
                }
                return source.slice(0);

            case '[object Boolean]':
            case '[object Number]':
            case '[object String]':
            case '[object Date]':
                return new source.constructor(source.valueOf());

            case '[object RegExp]':
                let re = new RegExp(source.source, source.toString().match(/[^\/]*$/)[0]);
                re.lastIndex = source.lastIndex;
                return re;

            case '[object Blob]':
                return new source.constructor([source], {type: source.type});
        }

        if (isFunction(source.cloneNode)) {
            return source.cloneNode(true);
        }
    }
}

function createMap() {
    return Object.create(null);
}

let OPERATORS = createMap();
'+ - * / % === !== == != < > <= >= && || ! = |'.split(' ').forEach((operator) => OPERATORS[operator] = true);
let ESCAPE : { [key : string] : string } = {'n': '\n', 'f': '\f', 'r': '\r', 't': '\t', 'v': '\v', '\'': '\'', '"': '"'};

interface Token {
    index : number;
    text : string;
    operator? : boolean;
    constant? : boolean;
    value? : number | string;
    identifier? : boolean;
    // I've added this one
    isString? : boolean;
}

class Lexer {
    text : string = '';
    index : number = 0;
    tokens : Token[] = [];

    constructor(public options : any) {}

    lex(text : string) {
        this.text = text;
        this.index = 0;
        this.tokens = [];

        while (this.index < this.text.length) {
            let ch = this.text.charAt(this.index);
            if (ch === '"' || ch === '\'') {
                this.readString(ch);
            } else if (this.isNumber(ch) || ch === '.' && this.isNumber(<string> this.peek())) {
                this.readNumber();
            } else if (this.isIdentifierStart(this.peekMultichar())) {
                this.readIdent();
            } else if (this.is(ch, '(){}[].,;:?')) {
                this.tokens.push({index: this.index, text: ch});
                this.index++;
            } else if (this.isWhitespace(ch)) {
                this.index++;
            } else {
                let ch2 = ch + this.peek();
                let ch3 = ch2 + this.peek(2);
                let op1 = OPERATORS[ch];
                let op2 = OPERATORS[ch2];
                let op3 = OPERATORS[ch3];
                if (op1 || op2 || op3) {
                    let token = op3 ? ch3 : (op2 ? ch2 : ch);
                    this.tokens.push({index: this.index, text: token, operator: true});
                    this.index += token.length;
                } else {
                    this.throwError('Unexpected next character ', this.index, this.index + 1);
                }
            }
        }
        return this.tokens;
    }

    is(ch : string, chars : string) {
        return chars.indexOf(ch) !== -1;
    }

    peek(i? : number) {
        let num = i || 1;
        return (this.index + num < this.text.length) ? this.text.charAt(this.index + num) : false;
    }

    isNumber(ch : string) {
        return ('0' <= ch && ch <= '9') && typeof ch === 'string';
    }

    isWhitespace(ch : string) {
        // IE treats non-breaking space as \u00A0
        return (ch === ' ' || ch === '\r' || ch === '\t' ||
            ch === '\n' || ch === '\v' || ch === '\u00A0');
    }

    isIdentifierStart(ch : string) {
        return this.options.isIdentifierStart ?
            this.options.isIdentifierStart(ch, this.codePointAt(ch)) :
            this.isValidIdentifierStart(ch);
    }

    isValidIdentifierStart(ch : string, _? : string) {
        return ('a' <= ch && ch <= 'z' ||
            'A' <= ch && ch <= 'Z' ||
            '_' === ch || ch === '$');
    }

    isIdentifierContinue(ch : string) {
        return this.options.isIdentifierContinue ?
            this.options.isIdentifierContinue(ch, this.codePointAt(ch)) :
            this.isValidIdentifierContinue(ch);
    }

    isValidIdentifierContinue(ch : string, cp? : string) {
        return this.isValidIdentifierStart(ch, cp) || this.isNumber(ch);
    }

    codePointAt(ch : string) {
        if (ch.length === 1) return ch.charCodeAt(0);
        // eslint-disable-next-line no-bitwise
        return (ch.charCodeAt(0) << 10) + ch.charCodeAt(1) - 0x35FDC00;
    }

    peekMultichar() {
        let ch = this.text.charAt(this.index);
        let peek = this.peek();
        if (!peek) {
            return ch;
        }
        let cp1 = ch.charCodeAt(0);
        let cp2 = peek.charCodeAt(0);
        if (cp1 >= 0xD800 && cp1 <= 0xDBFF && cp2 >= 0xDC00 && cp2 <= 0xDFFF) {
            return ch + peek;
        }
        return ch;
    }

    isExpOperator(ch : string) {
        return (ch === '-' || ch === '+' || this.isNumber(ch));
    }

    throwError(error : string, start? : number, end? : number) {
        end = end || this.index;
        let colStr = (isDefined(start)
            ? 's ' + start +  '-' + this.index + ' [' + this.text.substring(<number> start, end) + ']'
            : ' ' + end);
        throw new NgExpressionParserError(`Lexer Error: {${ error }} at column${ colStr } in expression [${ this.text }].`);
    }

    readNumber() {
        let numberString = '';
        let start = this.index;
        while (this.index < this.text.length) {
            let ch = lowercase(this.text.charAt(this.index));
            if (ch === '.' || this.isNumber(ch)) {
                numberString += ch;
            } else {
                let peekCh = this.peek();
                if (ch === 'e' && this.isExpOperator(<string> peekCh)) {
                    numberString += ch;
                } else if (this.isExpOperator(ch) &&
                    peekCh && this.isNumber(peekCh) &&
                    numberString.charAt(numberString.length - 1) === 'e') {
                    numberString += ch;
                } else if (this.isExpOperator(ch) &&
                    (!peekCh || !this.isNumber(peekCh)) &&
                    numberString.charAt(numberString.length - 1) === 'e') {
                    this.throwError('Invalid exponent');
                } else {
                    break;
                }
            }
            this.index++;
        }
        this.tokens.push({
            index: start,
            text: numberString,
            constant: true,
            value: Number(numberString)
        });
    }

    readIdent() {
        let start = this.index;
        this.index += this.peekMultichar().length;
        while (this.index < this.text.length) {
            let ch = this.peekMultichar();
            if (!this.isIdentifierContinue(ch)) {
                break;
            }
            this.index += ch.length;
        }
        this.tokens.push({
            index: start,
            text: this.text.slice(start, this.index),
            identifier: true
        });
    }

    readString(quote : string) {
        let start = this.index;
        this.index++;
        let str = '';
        let rawString = quote;
        let escape = false;
        while (this.index < this.text.length) {
            let ch = this.text.charAt(this.index);
            rawString += ch;
            if (escape) {
                if (ch === 'u') {
                    let hex = this.text.substring(this.index + 1, this.index + 5);
                    if (!hex.match(/[\da-f]{4}/i)) {
                        this.throwError('Invalid unicode escape [\\u' + hex + ']');
                    }
                    this.index += 4;
                    str += String.fromCharCode(parseInt(hex, 16));
                } else {
                    let rep = ESCAPE[ch];
                    str = str + (rep || ch);
                }
                escape = false;
            } else if (ch === '\\') {
                escape = true;
            } else if (ch === quote) {
                this.index++;
                this.tokens.push({
                    index: start,
                    text: rawString,
                    constant: true,
                    value: str,
                    isString: true
                });
                return;
            } else {
                str += ch;
            }
            this.index++;
        }
        this.throwError('Unterminated quote', start);
    }
}

function isAssignable(ast : any) {
    return ast.type === AstBuilder.Identifier || ast.type === AstBuilder.MemberExpression;
}

class AstBuilder {
    static Program : 'Program' = 'Program';
    static ExpressionStatement : 'ExpressionStatement' = 'ExpressionStatement';
    static AssignmentExpression : 'AssignmentExpression' = 'AssignmentExpression';
    static ConditionalExpression : 'ConditionalExpression' = 'ConditionalExpression';
    static LogicalExpression : 'LogicalExpression' = 'LogicalExpression';
    static BinaryExpression : 'BinaryExpression' = 'BinaryExpression';
    static UnaryExpression : 'UnaryExpression' = 'UnaryExpression';
    static CallExpression : 'CallExpression' = 'CallExpression';
    static MemberExpression : 'MemberExpression' = 'MemberExpression';
    static Identifier : 'Identifier' = 'Identifier';
    static Literal : 'Literal' = 'Literal';
    static ArrayExpression : 'ArrayExpression' = 'ArrayExpression';
    static Property : 'Property' = 'Property';
    static ObjectExpression : 'ObjectExpression' = 'ObjectExpression';
    static ThisExpression : 'ThisExpression' = 'ThisExpression';
    static LocalsExpression : 'LocalsExpression' = 'LocalsExpression';
    // Internal use only
    static NGValueParameter : 'NGValueParameter' = 'NGValueParameter';

    text : string = '';
    tokens : Token[] = [];

    constructor(public lexer : Lexer, public options : any) {

    }

    ast(text : string) : ProgramNode {
        this.text = text;
        this.tokens = this.lexer.lex(text);

        let value = this.program();

        if (this.tokens.length !== 0) {
            this.throwError('is an unexpected token', this.tokens[0]);
        }

        return value;
    }

    program() {
        let body = [];
        while (true) {
            if (this.tokens.length > 0 && !this.peek('}', ')', ';', ']'))
                body.push(this.expressionStatement());
            if (!this.expect(';')) {
                return { type: AstBuilder.Program, body: body };
            }
        }
    }

    expressionStatement() {
        return { type: AstBuilder.ExpressionStatement, expression: this.filterChain() };
    }

    filterChain() {
        let left : any = this.expression();
        while (this.expect('|')) {
            left = this.filter(left);
        }
        return left;
    }

    expression() {
        return this.assignment();
    }

    assignment() {
        let result : any = this.ternary();
        if (this.expect('=')) {
            if (!isAssignable(result)) {
                throw new NgExpressionParserError('Trying to assign a value to a non l-value');
            }

            result = { type: AstBuilder.AssignmentExpression, left: result, right: this.assignment(), operator: '='};
        }
        return result;
    }

    ternary() {
        let test = this.logicalOR();
        let alternate;
        let consequent;
        if (this.expect('?')) {
            consequent = this.expression();
            if (this.consume(':')) {
                alternate = this.expression();
                return { type: AstBuilder.ConditionalExpression, test: test, alternate: alternate, consequent: consequent};
            }
        }
        return test;
    }

    logicalOR() {
        let left = this.logicalAND();
        while (this.expect('||')) {
            left = { type: AstBuilder.LogicalExpression, operator: '||', left: left, right: this.logicalAND() };
        }
        return left;
    }

    logicalAND() {
        let left = this.equality();
        while (this.expect('&&')) {
            left = { type: AstBuilder.LogicalExpression, operator: '&&', left: left, right: this.equality()};
        }
        return left;
    }

    equality() {
        let left = this.relational();
        let token;
        while ((token = <Token> this.expect('==', '!=', '===', '!=='))) {
            left = { type: AstBuilder.BinaryExpression, operator: token.text, left: left, right: this.relational() };
        }
        return left;
    }

    relational() {
        let left = this.additive();
        let token;
        while ((token = <Token> this.expect('<', '>', '<=', '>='))) {
            left = { type: AstBuilder.BinaryExpression, operator: token.text, left: left, right: this.additive() };
        }
        return left;
    }

    additive() {
        let left = this.multiplicative();
        let token;
        while ((token = <Token> this.expect('+', '-'))) {
            left = { type: AstBuilder.BinaryExpression, operator: token.text, left: left, right: this.multiplicative() };
        }
        return left;
    }

    multiplicative() {
        let left = this.unary();
        let token;
        while ((token = <Token> this.expect('*', '/', '%'))) {
            left = { type: AstBuilder.BinaryExpression, operator: token.text, left: left, right: this.unary() };
        }
        return left;
    }

    unary() : any {
        let token;
        if ((token = <Token> this.expect('+', '-', '!'))) {
            return { type: AstBuilder.UnaryExpression, operator: token.text, prefix: true, argument: this.unary() };
        } else {
            return this.primary();
        }
    }

    primary() {
        let primary;
        if (this.expect('(')) {
            primary = this.filterChain();
            this.consume(')');
        } else if (this.expect('[')) {
            primary = this.arrayDeclaration();
        } else if (this.expect('{')) {
            primary = this.object();
        } else if (this.selfReferential.hasOwnProperty((<Token> this.peek()).text)) {
            primary = copy(this.selfReferential[(<Token> this.consume()).text]);
        } else if (this.options.literals.hasOwnProperty((<Token> this.peek()).text)) {
            primary = { type: AstBuilder.Literal, value: this.options.literals[(<Token> this.consume()).text]};
        } else if ((<Token> this.peek()).identifier) {
            primary = this.identifier();
        } else if ((<Token> this.peek()).constant) {
            primary = this.constant();
        } else {
            this.throwError('not a primary expression', this.peek());
        }

        let next;
        while ((next = <Token> this.expect('(', '[', '.'))) {
            if (next.text === '(') {
                primary = {type: AstBuilder.CallExpression, callee: primary, arguments: this.parseArguments() };
                this.consume(')');
            } else if (next.text === '[') {
                primary = { type: AstBuilder.MemberExpression, object: primary, property: this.expression(), computed: true };
                this.consume(']');
            } else if (next.text === '.') {
                primary = { type: AstBuilder.MemberExpression, object: primary, property: this.identifier(), computed: false };
            } else {
                this.throwError('IMPOSSIBLE');
            }
        }
        return primary;
    }

    filter(baseExpression : any) {
        let args = [baseExpression];
        let result = {type: AstBuilder.CallExpression, callee: this.identifier(), arguments: args, filter: true};

        while (this.expect(':')) {
            args.push(this.expression());
        }

        return result;
    }

    parseArguments() : any {
        let args = [];
        if (this.peekToken().text !== ')') {
            do {
                args.push(this.filterChain());
            } while (this.expect(','));
        }
        return args;
    }

    identifier() {
        let token = <Token> this.consume();
        if (!token.identifier) {
            this.throwError('is not a valid identifier', token);
        }
        return { type: AstBuilder.Identifier, name: token.text };
    }

    constant() {
        const token = (<Token> this.consume());
        // TODO check that it is a constant
        return { type: AstBuilder.Literal, value: token.value, isString: token.isString };
    }

    arrayDeclaration() : any {
        let elements = [];
        if (this.peekToken().text !== ']') {
            do {
                if (this.peek(']')) {
                    // Support trailing commas per ES5.1.
                    break;
                }
                elements.push(this.expression());
            } while (this.expect(','));
        }
        this.consume(']');

        return { type: AstBuilder.ArrayExpression, elements: elements };
    }

    object() {
        let properties = [];
        let property : {
            type : string;
            kind : 'init';
            key? : any;
            computed? : boolean;
            value? : string;
        };
        if (this.peekToken().text !== '}') {
            do {
                if (this.peek('}')) {
                    // Support trailing commas per ES5.1.
                    break;
                }
                property = {type: AstBuilder.Property, kind: 'init'};
                if ((<Token> this.peek()).constant) {
                    property.key = this.constant();
                    property.computed = false;
                    this.consume(':');
                    property.value = this.expression();
                } else if ((<Token> this.peek()).identifier) {
                    property.key = this.identifier();
                    property.computed = false;
                    if (this.peek(':')) {
                        this.consume(':');
                        property.value = this.expression();
                    } else {
                        property.value = property.key;
                    }
                } else if (this.peek('[')) {
                    this.consume('[');
                    property.key = this.expression();
                    this.consume(']');
                    property.computed = true;
                    this.consume(':');
                    property.value = this.expression();
                } else {
                    this.throwError('invalid key', <Token> this.peek());
                }
                properties.push(property);
            } while (this.expect(','));
        }
        this.consume('}');

        return {type: AstBuilder.ObjectExpression, properties: properties };
    }

    throwError(msg : string, token? : Token | false) {
        throw new NgExpressionParserError(`Syntax Error: Token \'${ (<Token> token).text }\' ${ msg } at column ${ (<Token> token).index + 1 } of the expression [${ this.text }] starting at [${ this.text.substring((<Token> token).index) }].`);
    }

    consume(e1? : string) {
        if (this.tokens.length === 0) {
            throw new NgExpressionParserError(`Unexpected end of expression: {${ this.text }}`);
        }

        let token = this.expect(e1);
        if (!token) {
            this.throwError('is unexpected, expecting [' + e1 + ']', <Token> this.peek());
        }
        return token;
    }

    peekToken() {
        if (this.tokens.length === 0) {
            throw new NgExpressionParserError(`Unexpected end of expression: {${ this.text }}`);
        }
        return this.tokens[0];
    }

    peek(e1? : string, e2? : string, e3? : string, e4? : string) {
        return this.peekAhead(0, e1, e2, e3, e4);
    }

    peekAhead(i : number, e1? : string, e2? : string, e3? : string, e4? : string) {
        if (this.tokens.length > i) {
            let token = this.tokens[i];
            let t = token.text;
            if (t === e1 || t === e2 || t === e3 || t === e4 ||
                (!e1 && !e2 && !e3 && !e4)) {
                return token;
            }
        }
        return false;
    }

    expect(e1? : string, e2? : string, e3? : string, e4? : string) {
        let token = this.peek(e1, e2, e3, e4);
        if (token) {
            this.tokens.shift();
            return token;
        }
        return false;
    }

    selfReferential : { [key : string] : any } = {
        'this': {type: AstBuilder.ThisExpression },
        '$locals': {type: AstBuilder.LocalsExpression }
    };
}

let identStart = undefined;
let identContinue = undefined;
export const $parseOptions = {
    literals: copy({
        'true': true,
        'false': false,
        'null': null,
        'undefined': undefined
    }),
    isIdentifierStart: isFunction(identStart) && identStart,
    isIdentifierContinue: isFunction(identContinue) && identContinue
};

export function parseExpression(expression : string) : Either<NgExpressionParserError, ProgramNode> {
    if (!expression) {
        return Either.Right({
            type: 'Program' as 'Program',
            body: []
        });
    }
    if (expression.startsWith('::')) { // strip one-time binding syntax
        expression = expression.substring(2);
    }
    const options = $parseOptions;
    const astBuilder = new AstBuilder(new Lexer(options), options);
    try {
        const root = astBuilder.ast(expression);
        return Either.Right(root);
    } catch (err) {
        if (!(err instanceof NgExpressionParserError)) {
            err = new NgExpressionParserError(err);
        }
        return Either.Left(err);
    }
}
