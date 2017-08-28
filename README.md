# tcat - Type Checker for AngularJS Templates

## Description

This tool will inspect your template files, and generate a TypeScript file, based on the AngularJS expressions found in
the template.

You can compile the generated files, using your own tsconfig, to detect type errors such as references to properties
that are missing from your page controllers.

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
		"name": "my-custom-directive",
		"canBeElement": true,
		"canBeAttribute": false,
		"attributes": [
			{
				"name": "the-item"
			},
			{
			    "name": "some-update",
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
  - Only compile files ending in ".typeview.ts".
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

### Generating typeviews 

Run tcat. Pass it the name of the directives files, and the template file.

```bash
./node_modules/.bin/tcat directives.json template.html 
```

You can also specify multiple files or directories.
```bash
./node_modules/.bin/tcat directives.json template_1.html template_2.jade ./views/ 
```

You'll find a new file has been generated, caled "template.html.typeview.ts". It will look something like this:

```typescript
import {date} from "./filters";

interface TemplateScope {
    items : Array<{ name : string, date : Date }>;
    receiveUpdate : (value : string) => void;
}

declare const _scope_1 : TemplateScope;
const _block_1 = function () {
    const _block_2 = function (
            $index : number,
            $first : boolean,
            $last : boolean,
            $middle : boolean,
            $even : boolean,
            $odd : boolean,
            $id : (value : any) => "",
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
compiler will fail to compile "template.html.typeview.ts".

## Incorporating into your build

This is up to you!

You could make this a precommit action, where you run tcat for all changed template files, then run TSC on the generated
typeview files.

Or, you could compile all files in one go, by running tcat across your entire directory, then compiling the generated
typeview files. This could happen as a "postinstall" npm script.

## Supported templates

tcat can read templates in the following formats:
- HTML
- Jade
- Pug

Jade templates are parsed using the legacy "jade" module, to support older projects still using "jade" files.

Note that templates with locals are not supported! tcat expects AngularJS to handle templating.  

## TODO

- Warn on unrecognised HTML elements or attributes, since this could indicate a directive that should be type checked.
- Support for multiple directives per tag/attribute.
- Support normalised element/attribute names, e.g. `ng-bind`, `ng:bind`, `ng_bind`, `data-ng-bind`, and `x-ng-bind` 
should all normalise to `ngBind`.
- Verify required/optional attributes in directives.
- Support for translcuded content in directives, referencing values in the directive's scope.
- CLI: don't parse directives.json for every processed template file.
- Support for the following directives:
  - All `input` variants, and their attributes
  - ng-controller
  - ng-include
  - ng-non-bindable
  - ng-pluralize
  - select
  - textarea
- Generate interface for forms with named inputs, so the HTML matches any TS interface. 
- Support for micro-syntax in custom directives, like `ng-repeat`. (Plugins?)
- Automatically allow built-in AngularJS filters, like `date`.
- Expose the `$event` local for event-handling directives.
- Process directives in order of priority.