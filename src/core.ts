export class TcatError extends Error {}
export class TemplateParserError extends TcatError {}
export class AttributeParserError extends TcatError {}

export function assertNever(value : never) : never {
    throw new Error(`Unexpected value ${ value }`);
}