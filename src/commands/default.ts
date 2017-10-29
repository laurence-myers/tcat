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
import {FileFilter, findLongestCommonPath, readDirectiveDataFile, walk} from "../files";
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

    protected processFiles(directives : DirectiveData[], commonPath : string, fileNames : FileName[]) : Either<TcatError[], void> {
        return fileNames.map((fileName : FileName) =>
            this.processFile(fileName, directives)
                .leftMap(
                    (errors) => {
                        errors.forEach((err) => {
                            console.error(
                                fileName.replace(commonPath, '') + ':',
                                this.verbose ? err : err.message
                            );
                        });
                        return errors;
                    }
                )
        ).reduce((current : Either<TcatError[], void>, previous : Either<TcatError[], void>) : Either<TcatError[], void> => {
            if (current.isLeft()) {
                if (previous.isLeft()) {
                    return Either.Left(previous.left().concat(current.left()));
                } else {
                    return current;
                }
            } else {
                return previous;
            }
        }, Either.Right(undefined));
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
        console.log("Starting tcat...");
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
        const commonPath = findLongestCommonPath(fileNames) + path.sep;
        const result = readDirectiveDataFile(asFileName(directivesFileName.fullName))
            .leftMap((errors : TcatError[]) => {
                errors.forEach((err) => {
                    console.error(
                        directivesFileName.fullName + ':',
                        this.verbose ? err : err.message
                    );
                });
                return errors;
            })
            .flatMap((directives) => this.processFiles(directives, commonPath, fileNames));
        return result.cata((errors) => {
                console.log(`Done, with ${ errors.length } error${ errors.length > 1 ? 's' : '' }.`);
                process.exitCode = 1;
            }, () => {
                console.log("Done!");
            });
    }
}