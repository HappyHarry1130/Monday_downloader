import {
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
    IsArray,
    IsBoolean,
} from "class-validator";
import { Expose } from "class-transformer";

const INVALID_FILE_PATH = '';
const DEFAULT_CONCURRENT_DOWNLOADS = 1;

export class DownloaderConfig {
    @Expose() @IsString() sourceFilePath: string = INVALID_FILE_PATH;
    @Expose() @IsString() credentialsPath: string = INVALID_FILE_PATH;
    @Expose() @IsString() apikey: string = "";
    @Expose() @IsArray() boards_id: string[] = [];
    @Expose() @IsInt() @Min(1) @Max(10) @IsOptional() maxConcurrentDownloads: number = DEFAULT_CONCURRENT_DOWNLOADS;
    @Expose() @IsBoolean() @IsOptional() debug: boolean = false;
}
