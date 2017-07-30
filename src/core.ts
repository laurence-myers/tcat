export class TcatError extends Error {}
export class ParserError extends TcatError {}

export function assertNever(value : never) : never {
    throw new Error(`Unexpected value ${ value }`);
}