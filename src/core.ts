export class TcatError extends Error {}
export class ParserError extends Error {}

export function assertNever(value : never) : never {
    throw new Error(`Unexpected value ${ value }`);
}