import {CastingContext, Command, command, option, Options, param, params} from "clime";
import {asFileName, asHtmlFileName, asPugFileName, FileName, TcatError, UnsupportedTemplateFileError} from "../core";
import {convertHtmlFileToTypeScriptFile, convertPugFileToTypeScriptFile} from "../converter";
import {Directory, File} from "clime/bld/castable";
import * as fs from "fs";
import * as path from "path";
import {Either} from "monet";

class FileOrDirectory {
    static cast(name: string, context: CastingContext<File | Directory>): File | Directory {
        const stats = fs.statSync(name);
        if (stats.isDirectory()) {
            return Directory.cast(name, context);
        } else {
            return File.cast(name, context);
        }
    }
}

class CliOptions extends Options {
    @option({
        flag: 'f',
        description: 'Filter for file extensions. Defaults to .jade. Specify multiple extensions using commas, e.g. .jade,.html',
    })
    filter: string;
}

@command({
    description: 'Type Checker for AngularJS Templates',
})
export default class extends Command {
    processFile(templateName : FileName, directivesName : FileName) : Either<TcatError[], void> {
        const extension = path.extname(templateName).toLowerCase();
        if (['.jade', '.pug'].indexOf(extension) > -1) {
            return convertPugFileToTypeScriptFile(asPugFileName(templateName), directivesName);
        } else if (['.html'].indexOf(extension) > -1) {
            return convertHtmlFileToTypeScriptFile(asHtmlFileName(templateName), directivesName);
        } else {
            return Either.Left([new UnsupportedTemplateFileError(`Unsupported template file: ${ templateName }`)]);
        }
    }

    async execute(
        @param({
            description: 'A JSON file containing directive config data. Refer to the documentation.',
            required: true,
            type: File,
        })
        directives : File,
        @params({
            description: 'The directories or file names of the templates you wish to type check.',
            required: true,
            type: FileOrDirectory,
        })
        filesOrDirectories : Array<File | Directory>,

        _options : CliOptions
    ) {
        await directives.assert();
        await Promise.all(filesOrDirectories.map(async (templateName) => templateName.assert()));
        console.log("Starting...");
        filesOrDirectories.map((fileOrDirectory) => {
            if (fileOrDirectory instanceof File) {
                return this.processFile(asFileName(fileOrDirectory.fullName), asFileName(directives.fullName))
                    .leftMap(
                        (errors) => {
                            console.error(`Errors were encountered processing template "${ fileOrDirectory.fullName }".`);
                            errors.forEach((err) => console.error(err));
                            return errors;
                        }
                    );
            } else {
                console.log("TODO: directory support");
                return Either.Right<TcatError[], void>(undefined);
            }
        }).reduce((result : Either<TcatError[], void>, current) => result.takeLeft(current), Either.Right<TcatError[], void>(undefined))
            .cata(() => {
                console.log("Done, with errors.");
            }, () => {
                console.log("Done!");
            });
    }
}