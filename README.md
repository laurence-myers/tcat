# tcat - Type Checker for AngularJS Templates

[![CircleCI](https://circleci.com/gh/laurence-myers/tcat.svg?style=shield)](https://circleci.com/gh/laurence-myers/tcat)

### IN ALPHA!

**Before version 1.0.0, the API could change dramatically and without warning.**

## Description

This tool will inspect your template files, and generate a TypeScript file, based on the AngularJS expressions found in
the template.

You can compile the generated files, using your own tsconfig, to detect type errors such as references to properties
that are missing from your page controllers.

It's intended for integrating into existing projects that are using AngularJS (1.x) and TypeScript.

## Usage

### Preparation

First, install tcat.
```bash
npm install tcat
```

Write a directives.json file. This defines your custom directives used in your application.

```json
[
  {
    "name": "myCustomDirective",
    "canBeElement": true,
    "canBeAttribute": false,
    "attributes": [
      {
        "name": "theItem"
      },
      {
        "name": "optionalStringProperty",
        "type": "interpolated",
        "optional": true
      },
      {
        "name": "someUpdate",
        "locals": [
          {
            "name": "updatedValue",
            "type": "string"
          }
        ]
      }
    ]
  }
]
```

Assuming you have a single "tsconfig.json" for your AngularJS project:

- Move all settings everything to a new "tsconfig_base.json", except properties that specify the files to compile, such
  as "includes", "files", or "excludes".
- Modify "tsconfig.json" to extend from "tsconfig.json".
- Create a new "tsconfig-tcat.json", extending from "tsconfig_base.json". Make sure it has the following settings:
  - Only compile files ending in ".tcat.ts".
  - Do not emit any JS.


### Adding types to your templates

Create a template file. Let's call it "template.jade".

```html
<div ng-repeat="item in items">
    <p>{{ item.name }}</p>
    <p>{{ item.date | date }}</p>
    <my-custom-directive the-item="item" some-update="receiveUpdate(updatedValue)" />	
</div>
```

Write a placeholder TypeScript file for your template. It must have the same name as the template, with an additional
extension of ".ts".

This file must contain an interface called "TemplateScope". This is where you declare the scope properties available to
the template.

```typescript
import {date} from "./filters";

interface TemplateScope {
    items : Array<{ name : string }>;
    receiveUpdate : (value : string) => void;
}
```

If you have an existing interface, you can import that interface and alias it to "TemplateScope".

```typescript
import {MyControllerScope} from "./controller";

type TemplateScope = MyControllerScope;
```

#### Nested ng-templates

If your template contains "ng-template" directives, you must specify the interface of those templates. The interface
will take the "id" attribute, and convert it to an UpperCamelCase identifier, ending in "Scope". For example:

```html
<script type="text/ng-template" id="my/fancy/nested/template.html">
    <p>Hello, {{ name }}!</p>
</script>
```

```typescript
interface TemplateScope {
}

interface MyFancyNestedTemplateHtmlScope {
    name : string;
}
```

### Generating tcat files 

Run tcat. Pass it the name of the directives files, and the template file.

```bash
./node_modules/.bin/tcat directives.json template.html 
```

You can also specify multiple files or directories.
```bash
./node_modules/.bin/tcat directives.json template_1.html template_2.jade ./views/ 
```

You'll find a new file has been generated, caled "template.html.tcat.ts". It will look something like this:

```typescript
import {date} from "./filters";

interface TemplateScope {
    items : Array<{ name : string, date : Date }>;
    receiveUpdate : (value : string) => void;
}

const _block_1 = function (
    _scope_1 : TemplateScope,
) {
    const _block_2 = function (
            $index : number,
            $first : boolean,
            $last : boolean,
            $middle : boolean,
            $even : boolean,
            $odd : boolean,
            $id : (value : any) => string,
        ) {
        for (const item of (_scope_1.items)) {
            const _expr_1 = (item.name);
            const _expr_2 = (date(item.date));
            const _expr_3 = (item);
            const _block_3 = function (
                    updatedValue : string,
                ) {
                const _expr_4 = (_scope_1.receiveUpdate(updatedValue));
            };
        }
    };
};
```

Run TSC, specifying "tsconfig-tcat.json" for your project file. This will compile the generated file.

If "template.html" refers to anything you haven't explicitly specified in the file "template.html.ts", the TypeScript
compiler will fail to compile "template.html.tcat.ts".

## Incorporating into your build

This is up to you!

You could make this a precommit action, where you run tcat for all changed template files, then run TSC on the generated
tcat files.

Or, you could compile all files in one go, by running tcat across your entire directory, then compiling the generated
tcat files. This could happen as a "postinstall" npm script.

tcat has some options to watch for changes, and/or to invoke the TypeScript Compiler to compile the generated files.

## Command line options

- -c / --compile ./path/to/tsconfig.json: spawn tsc in a sub-process, with the given tsconfig.json file.
- -f / --filter: filter for the given file extensions. Specify multiple extensions using commas, e.g. .jade,.html. Defaults to ".html,.pug,.jade"
- --verbose: turns on verbose logging.
- -w / --watch: watch for changes to .html.ts/.pug.ts/jade.ts, or .html/.pug/.jade files with an equivalent .ts file.  

## Supported templates

tcat can read templates in the following formats:

- HTML
- Jade
- Pug

Jade templates are parsed using the legacy "jade" module, to support older projects still using "jade" files.

Note that templates with locals are not supported! tcat expects AngularJS to handle templating.  

## Directive data

The main interfaces for directive data are as follows.

```typescript
interface DirectiveData {
    name : string; // e.g. "ngRepeat"
    
    canBeElement : boolean; // Equivalent to "restrict: 'E'"
    
    canBeAttribute : boolean;  // Equivalent to "restrict: 'A'"
     
    attributes : DirectiveAttribute[]; // All of the HTML attributes used by this directive
     
    parser? : ElementDirectiveParser; // For advanced usage
    
    priority? : number; // The directive configuration 
}

interface DirectiveAttribute {
    name : string; // e.g. "ngRepeat"
    
    optional? : boolean; // Is this attribute optional? Defaults to false
    
    // "expression" will be treated as an AngularJS expression.
    // "interpolated" will extract one or more AngularJS expressions from the value.
    mode? : 'expression' | 'interpolated';
    
    // When using "@" bindings, you can pass locals to the expression. This information is not normally available via
    // the standard AngularJS directive configuration, so you must manually specify each available local here.
    locals? : AttributeLocal[];
    
    
    // For advanced usage
    parser? : AttributeParser;
}

interface AttributeLocal {
    name : string;
    type : string; // This is a raw string that will be used when generating TypeScript type annotations. 
}
```

For advanced usage, e.g. any directives containing a micro-syntax like "ngRepeat", you may need to implement an element
parser or attribute parser. Please look at the code for `tcat` to see how parsers can be implemented.

### JSON file

Write a .json file, containing an array of objects conforming to the DirectiveData interface.

When using a .json file, you will be unable to specify any parsers. If you require this, you must us a JS file.

### JS file

Write a .js file - or, recommended, a TypeScript file that gets compiled to JS as part of your build process - which 
exports an array of objects conforming to the DirectiveData interface.

tcat exposes a function 
`convertDirectiveConfigToDirectiveData(directiveName : string, directiveConfig : IDirective, extras? : TcatDirectiveExtras)`. 
It can be used to read in an existing AngularJS directive configuration object, and convert it to conform to the 
DirectiveData interface. You can make use of this to generate your directives JS file.

The `extras` parameter lets you provide extra information unavailable in the standard AngularJS directive configuration,
such as defining the local variables available within expressions bound using `@`, or custom parsers. The interface is 
as follows.

```typescript
export interface TcatDirectiveExtras {
    parser? : ElementDirectiveParser;
    attributes? : {
        [attributeName : string] : {
            parser? : AttributeParser;
            locals? : AttributeLocal[];
        };
    };
}
``` 

This approach has many benefits:

- Reduced boilerplate, since you can re-use your existing directive config code.
- Your directive data stays in sync with your codebase.
- You can specify element parsers or attribute parsers for advanced requirements.

## TODO

- Support for optional modules:
  - ngAnimate (ngAnimateChildren, ngAnimateSwap)
  - ngComponentRouter (ngOutlet)
  - ngMessages (ngMessage, ngMessageExp, ngMessages, ngMessagesInclude)
  - ngMessageFormat (extended syntax for interpolated text)
  - ngRoute (ngView)
  - ngTouch (ngSwipeLeft, ngSwipeRight)
- Replace lodash functions, consolidate string transformation libs.
- Support for multiple directives per tag/attribute.
- Support for CSS class and comment directives. 
- Generate interface for forms with named inputs, so the HTML matches any TS interface. 
- Automatically allow built-in AngularJS filters, like `date`.
- It would be nice to somehow detect issues caused by prototype inheritence. e.g. Scope A has property "myText", the
  the template has an "ng-if" which creates Scope B, and there's a form input with "ng-model" bound to "myText". In
  this scenario, the input would read the value of "myText" from Scope A, but would write the value back to Scope B.
- Unit or integration tests for the CLI command.
