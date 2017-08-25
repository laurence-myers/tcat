import {Command, command, param} from "clime";
import {asFileName} from "../core";
import {convertPugFileToTypeScriptFile} from "../converter";
import {File} from "clime/bld/castable";

@command({
    description: 'Type Checker for AngularJS Templates',
})
export default class extends Command {
    async execute(
        @param({
            description: 'A JSON file containing directive config data. Refer to the documentation.',
            required: true,
            type: File,
        })
        directives : File,
        @param({
            description: 'The file name of the template wish to type check.',
            required: true,
            type: File,
        })
        templateName : File,
    ) {
        await directives.assert();
        await templateName.assert();
        console.log("Starting...");
        convertPugFileToTypeScriptFile(asFileName(templateName.fullName), asFileName(directives.fullName))
            .bimap(
                (errors) => {
                    console.error("Errors were encountered processing templates.");
                    errors.forEach((err) => console.error(err));
                },
                () => {
                    console.log("Done!");
                }
            );
    }
}