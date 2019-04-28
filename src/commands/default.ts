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
import * as childProcess from "child_process";
import {Either} from "monet";
import {FileFilter, findLongestCommonPath, readDirectiveDataFile, walk} from "../files";
import {DirectiveData} from "../directives";
import * as chokidar from "chokidar";

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
    filter! : string;

    @option({
        description: 'Verbose logging',
        default: false,
        toggle: true
    })
    verbose! : boolean;

    @option({
        flag: 'w',
        description: 'Watch for changes',
        default: false,
        toggle: true
    })
    watch! : boolean;

    @option({
        flag: 'c',
        description: `Compile using tsc with the given tsconfig.json file. If --watch is also specified, tsc will spawn as a background process in watch mode.`
    })
    compile! : string;
}

@command({
    description: 'Type Checker for AngularJS Templates',
})
export default class extends Command {
    protected verbose : boolean = false;
    protected watch : boolean = false;
    protected tscConfig : string | undefined = undefined;

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

    protected parseExtensions(filterString : string) : string[] {
        return filterString
            .split(',')
            .map((extension) => extension.toLowerCase());
    }

    protected createFileFilter(options : CliOptions) : FileFilter {
        const extensions = this.parseExtensions(options.filter);
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

    protected startWatching(fileNames : FileName[], _directories : DirectoryName[], directives : DirectiveData[], commonPath : string) {
        const allFilesToWatch = fileNames.concat(
            fileNames.map(
                (fileName) => asFileName(fileName + '.ts')
            )
        );
        const extensionToStrip = `.ts`;
        const fileWatcher = chokidar.watch(allFilesToWatch, {
            usePolling: true
        });
        fileWatcher
            .on('change', (fileName : string) => {
                console.log(`Running tcat on changed file: ${ fileName.replace(commonPath, '') }`);
                if (fileName.endsWith(extensionToStrip)) {
                    fileName = fileName.substr(0, fileName.length - extensionToStrip.length);
                }
                this.runAnExecution(directives, commonPath, [asFileName(fileName)]);
            })
            .on('error', (err : any) => {
                console.error(`Error encountered while watching for changes: ${ err }`);
            });
    }

    protected runAnExecution(directives : DirectiveData[], commonPath : string, fileNames : FileName[]) : void {
        return this.processFiles(directives, commonPath, fileNames)
            .cata((errors) => {
                const message = `tcat finished, with ${ errors.length } error${ errors.length > 1 ? 's' : '' }.${ this.watch ? ' Watching for changes.' : '' }`;
                console.log(message);
                process.exitCode = 1;
            }, () => {
                const message = `tcat finished${ this.watch ? ', watching for changes' : '' }.`;
                console.log(message);
                process.exitCode = 0;
            });
    }

    protected async spawnTypeScriptCompiler() {
        return new Promise<string>((resolve, reject) => {
            // Work out the path to TSC.
            const sprog = childProcess.exec(`npm bin`);
            sprog.stdout.on('data', (data : string) => resolve(data.replace('\n', '')));
            sprog.on('error', (err) => {
                console.error(err);
                return reject(err);
            });
        }).then((binDir) => {
            return new Promise((resolve, reject) => {
                // Spawn TSC in a separate child process. This makes "watch" much faster.
                const args = ['-p', this.tscConfig!];
                if (this.watch) {
                    args.push('-w');
                }
                const command = 'tsc' + (process.platform === 'win32' ? '.cmd' : '' );
                const sprog = childProcess.spawn(path.join(binDir, command), args, {
                    stdio: 'inherit'
                });
                sprog.on('exit', (code : number, _signal : string) => {
                    if (code === 0) {
                        return resolve();
                    } else {
                        return reject();
                    }
                });
                sprog.on('error', (err) => {
                    console.error(err);
                    return reject(err);
                });
            });
        });
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
        this.watch = options.watch;
        this.tscConfig = options.compile || undefined;
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
        try {
            await readDirectiveDataFile(asFileName(directivesFileName.fullName))
                .leftMap((errors : TcatError[]) => {
                    errors.forEach((err) => {
                        console.error(
                            directivesFileName.fullName + ':',
                            this.verbose ? err : err.message
                        );
                    });
                    return errors;
                }).map(async (directives) => {
                    this.runAnExecution(directives, commonPath, fileNames);
                    if (this.watch) {
                        const directories = filesOrDirectories
                            .filter((fileOrDirectory) => fileOrDirectory instanceof Directory)
                            .map((directory) => asDirectoryName(directory.fullName));
                        this.startWatching(fileNames, directories, directives, commonPath);
                    }
                    if (this.tscConfig) {
                        console.log(`Spawning tsc...`);
                        await this.spawnTypeScriptCompiler();
                    }
                }).cata(
                    async (err) => Promise.reject(err),
                    async (promise) => promise
                );
        } catch (err) {
            process.exitCode = 1;
        }
    }
}
