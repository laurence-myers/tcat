// This module provides stubs for AngularJS's built-in filters.
// Import them from "tcat" and use them in your template interface stubs.

function printArgs(...args : any[]) : string {
    return args.join(', ');
}

export function currency(amount : number, symbol : string, fractionSize? : number) : string {
    return printArgs(amount, symbol, fractionSize);
}

export function date(date : Date | number | string, format : string = 'mediumDate', timezone? : string) : string {
    return printArgs(date, format, timezone);
}

export function filter<T>(
    array : T[],
    expression : string | object | ((value : T, index : number, array : T[]) => boolean),
    comparator : ((actual : T, expected : T) => boolean) | boolean = false,
    anyPropertyKey : string = '$'
) : T[] {
    printArgs(array, expression, comparator, anyPropertyKey);
    return array;
}

export function json<T>(object : T, spacing : number = 2) : string {
    return printArgs(object, spacing);
}

export function limitTo(
    input : string | number,
    limit : string | number | undefined,
    begin? : string | number) : string;
export function limitTo<T>(
    input : Array<T> | ArrayLike<T>,
    limit : string | number | undefined,
    begin? : string | number) : Array<T>;
export function limitTo<T>(
    input : Array<T> | ArrayLike<T> | string | number,
    limit : string | number | undefined,
    begin : string | number = 0) : Array<T> | string {
    printArgs(input, limit, begin);
    return <any> input;
}

export function lowercase(str : string) : string {
    return printArgs(str);
}

export function number(num : number | string, fractionSize? : number | string) : string {
    return printArgs(num, fractionSize);
}

export function orderBy<T>(
    collection : Array<T> | ArrayLike<T>,
    expression : ((obj : T) => any) | string | Array<string | Function>,
    reverse? : boolean,
    comparator? : Function
) : T[] {
    printArgs(collection, expression, reverse, comparator);
    return <any> collection;
}

export function uppercase(str : string) : string {
    return printArgs(str);
}