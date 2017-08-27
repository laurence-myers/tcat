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
compiler will fail.