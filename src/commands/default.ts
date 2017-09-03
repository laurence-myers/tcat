import {CastingContext, Command, command, option, Options, param, params} from "clime";
import {
    asDirectoryName,
    asFileName,
    asHtmlFileName,
    asPugFileName,
    DirectoryName,
    FileName,
    flatten,
    TcatError,
    UnsupportedTemplateFileError
} from "../core";
import {convertHtmlFileToTypeScriptFile, convertPugFileToTypeScriptFile} from "../converter";
import {Directory, File} from "clime/bld/castable";
import * as fs from "fs";
import * as path from "path";
import {Either} from "monet";
import {FileFilter, readDirectiveDataFile, walk} from "../files";
import {DirectiveData} from "../directives";

class FileOrDirectory {
    static cast(name : string, context : CastingContext<File | Directory>) : File | Directory {
        const stats = fs.statSync(name);
        if (stats.isDirectory()) {
            return Directory.cast(name, context);
        } else {
            return File.cast(name, context);
        }
    }
}

const DEFAULT_FILTER_VALUE = '.html,.pug,.jade';
export class CliOptions extends Options {
    @option({
        flag: 'f',
        description: `Filter for file extensions. Specify multiple extensions using commas, e.g. .jade,.html. Defaults to ${ DEFAULT_FILTER_VALUE }`,
        default: DEFAULT_FILTER_VALUE
    })
    filter : string;

    @option({
        description: 'Verbose logging',
        default: false,
        toggle: true
    })
    verbose : boolean;
}

@command({
    description: 'Type Checker for AngularJS Templates',
})
export default class extends Command {
    protected verbose : boolean = false;

    protected debug(...args : any[]) : void {
        if (this.verbose) {
            console.log(...args);
        }
    }

    protected processFile(templateName : FileName, directives : DirectiveData[]) : Either<TcatError[], void> {
        this.debug(templateName);
        const extension = path.extname(templateName).toLowerCase();
        if (['.jade', '.pug'].indexOf(extension) > -1) {
            return convertPugFileToTypeScriptFile(asPugFileName(templateName), directives);
        } else if (['.html'].indexOf(extension) > -1) {
            return convertHtmlFileToTypeScriptFile(asHtmlFileName(templateName), directives);
        } else {
            return Either.Left([new UnsupportedTemplateFileError(`Unsupported template file: ${ templateName }`)]);
        }
    }

    protected walkDirectory(directory : DirectoryName, filter : FileFilter) : FileName[] {
        return walk(directory, filter);
    }

    protected createFileFilter(options : CliOptions) : FileFilter {
        const extensions = options.filter
            .split(',')
            .map((extension) => extension.toLowerCase());
        return (fileName) => {
            const isValidFileName = extensions.indexOf(path.extname(fileName.toLowerCase())) > -1;
            if (isValidFileName) {
                const tsInterfaceExists = fs.existsSync(fileName + '.ts');
                if (tsInterfaceExists) {
                    return true;
                } else {
                    this.debug(`Skipping template file ${ fileName } due to missing .ts file.`);
                }
            }
            return false;
        };
    }

    async execute(
        @param({
            description: 'A JSON file containing directive config data. Refer to the documentation.',
            required: true,
            type: File,
        })
        directivesFileName : File,
        @params({
            description: 'The directories or file names of the templates you wish to type check.',
            required: true,
            type: FileOrDirectory,
        })
        filesOrDirectories : Array<File | Directory>,

        options : CliOptions
    ) {
        this.verbose = options.verbose;
        await directivesFileName.assert();
        await Promise.all(filesOrDirectories.map(async (templateName) => templateName.assert()));
        console.log("Starting...");
        const fileFilter = this.createFileFilter(options);
        const fileNames : FileName[] = flatten(
            filesOrDirectories.map((fileOrDirectory) => {
                if (fileOrDirectory instanceof File) {
                    return [asFileName(fileOrDirectory.fullName)];
                } else {
                    return this.walkDirectory(asDirectoryName(fileOrDirectory.fullName), fileFilter);
                }
            })
        );
        readDirectiveDataFile(asFileName(directivesFileName.fullName))
            .map((directives) => fileNames.map((fileName : FileName) => {
                return this.processFile(fileName, directives)
                    .leftMap(
                        (errors) => {
                            console.error(`Errors were encountered processing template "${ fileName }".`);
                            errors.forEach((err) => console.error(this.verbose ? err : err.message));
                            return errors;
                        }
                    );
            }).reduce(
                (result : Either<TcatError[], void>, current) => result.takeLeft(current),
                Either.Right<TcatError[], void>(undefined)
            )
        ).cata(() => {
            console.log("Done, with errors.");
        }, () => {
            console.log("Done!");
        });
    }
}