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

## Supported templates

tcat can read templates in the following formats:

- HTML
- Jade
- Pug

Jade templates are parsed using the legacy "jade" module, to support older projects still using "jade" files.

Note that templates with locals are not supported! tcat expects AngularJS to handle templating.  

## TODO

- Support for multiple directives per tag/attribute.
- Support for CSS class and comment directives. 
- Generate interface for forms with named inputs, so the HTML matches any TS interface. 
- Automatically allow built-in AngularJS filters, like `date`.
- It would be nice to somehow detect issues caused by prototype inheritence. e.g. Scope A has property "myText", the
  the template has an "ng-if" which creates Scope B, and there's a form input with "ng-model" bound to "myText". In
  this scenario, the input would read the value of "myText" from Scope A, but would write the value back to Scope B.
- Unit or integration tests for the CLI command.
