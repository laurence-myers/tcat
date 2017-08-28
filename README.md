# tcat - Type Checker for AngularJS Templates

## Description

This tool will inspect your template files, and generate a TypeScript file, based on the AngularJS expressions found in
the template.

You can compile the generated files, using your own tsconfig, to detect type errors such as references to properties
that are missing from your page controllers.

## Usage


First, install tcat.
```bash
npm install tcat
```

Create a template file. Let's call it "template.jade".

```html
<div ng-repeat="item in items">
	<p>{{ item.name }}</p>
	<my-custom-directive the-item="item"/>	
</div>
```

Write a placeholder TypeScript file for your template. It must have the same name as the template, with an additional
extension of ".ts".

This file must contain an interface called "TemplateScope". This is where you declare the scope properties available to
the template. If you have an existing interface, you can import that interface and alias it to "TemplateScope".

```typescript

interface TemplateScope {
    items : Array<{ name : string }>
}

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
			}
		]
	}
]
```

Run tcat. Pass it the name of the directives files, and the template file. You can also specify multiple files or 
directories.

```bash
./node_modules/.bin/tcat directives.json template.html 
```

You'll find a new file has been generated, caled "template.html.typeview.ts".

Create a new tsconfig-tcat.json, extending your existing config, that is set to only compile files ending in
".typeview.ts", and does not emit any JS.

Run TSC, specifying "tsconfig-tcat.json" for your project file.

If "template.html" refers to anything you haven't explicitly specified in the file "template.html.ts", the TypeScript
compiler will fail to compile "template.html.typeview.ts".

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