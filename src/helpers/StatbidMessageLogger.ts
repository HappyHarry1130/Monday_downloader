import { Logging } from '@google-cloud/logging'

interface DownloaderMessage {
    message: string;
    additionalDetails?: string[];
    isFatal?: boolean;
    '@type'?: string;
}

export class StatbidMessageLogger {
    private static LOG_NAME: string = 'downloader-messages';
    private logging = new Logging();
    private log = this.logging.log(StatbidMessageLogger.LOG_NAME);


    async logInfo(service: string, reportName: string, message: string, details?: string[]): Promise<any> {
        return this.writeLog(service,
            reportName,
            this.makeLogMessage(message, false, details),
            'INFO');
    }

    async logWarning(service: string, reportName: string, message: string, details?: string[]): Promise<any> {
        return this.writeLog(service,
            reportName,
            this.makeLogMessage(message, false, details),
            'WARNING');
    }

    async logError(service: string, reportName: string, message: string, details?: string[]): Promise<any> {
        return this.writeLog(service,
            reportName,
            this.makeLogMessage(message, false, details),
            'ERROR');
    }


    async logFatal(service: string, reportName: string, message: string, details?: string[]): Promise<any> {
        return this.writeLog(service,
            reportName,
            this.makeLogMessage(message, true, details),
            'FATAL');
    }

    private makeLogMessage(message: string, isFatal: boolean = false, additionalDetails?: string[]) {
        const msg: DownloaderMessage = {
            message: message,
            isFatal: isFatal,
            additionalDetails: additionalDetails
        };
        if (isFatal) {
            msg['@type'] = 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent';
        }
        return msg;
    }

    private async writeLog(service: string, reportName: string, message: DownloaderMessage, severity: string): Promise<any> {
        const metadata = {
            severity: severity,
            labels: {
                service: service,
                reportName: reportName
            },
            resource: {
                type: 'global',
            },
        };

        const logEntry = this.log.entry(metadata, message);
        return this.log.write(logEntry);
    }
}