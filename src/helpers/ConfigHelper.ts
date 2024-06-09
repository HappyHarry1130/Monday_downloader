/**
 * This class handles configuration-related activities.
 */
import fs from 'fs';
import path from 'path';

import { validate, ValidationError } from 'class-validator';
import { plainToInstance, instanceToPlain } from 'class-transformer';
import { DownloaderConfig } from "../dto/DownloaderConfig";

export class ConfigHelper {
    private readonly CONFIG_FILE_NAME_PROPERTY = 'CONFIG_FILE_NAME';
    private readonly CONFIG_FILE_NAME = 'config.json';
    private readonly CONFIG_FILE_ENCODING = 'utf8'
    async getConfig() {
        const defaultConfigFilePath = path.join(process.cwd(), this.CONFIG_FILE_NAME)
        const configFileFullPath =
            process.env[this.CONFIG_FILE_NAME_PROPERTY] || defaultConfigFilePath;
        if (!fs.existsSync(configFileFullPath)) {
            throw new Error(`Configuration file ${configFileFullPath} does not exist.`);
        }

        let config;
        try {
            const configFileBuffer =
                fs.readFileSync(configFileFullPath, this.CONFIG_FILE_ENCODING);
            config = plainToInstance(DownloaderConfig, JSON.parse(configFileBuffer), { excludeExtraneousValues: false });
            config.sourceFilePath = configFileFullPath;
        }
        catch (err: any) {
            throw new Error(`Error parsing configuration file ${configFileFullPath}: ${err}`);
        }

        let errors: ValidationError[] = [];
        try {
            errors = await validate(config);
            this.logConfigFileOptions(configFileFullPath, config);
        }
        catch (err) {
            this.logConfigFileOptions(configFileFullPath, config, errors);
        }

        return config;
    }

    private logConfigFileOptions(configFilePath: string, config?: DownloaderConfig, errors?: ValidationError[]) {
        process.stderr.write(`Configuration file used for this run: ${configFilePath}\n`);
        if (config !== undefined) {
            process.stderr.write('====================\nOptions: \n');
            process.stderr.write(JSON.stringify(instanceToPlain(config)) + '\n');
            process.stderr.write('====================\n');
        }
        if ((errors !== undefined) && (errors!.length > 0)) {
            process.stderr.write('Errors were encountered while parsing this configuration file: \n');
            for (const err of errors!) {
                process.stderr.write(err + '\n');
            }
        }
    }
}
