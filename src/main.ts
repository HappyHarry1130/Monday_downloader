import { ConfigHelper } from "./helpers/ConfigHelper";
import { MondayDownloader } from "./MondayDownloader";

async function main() {
    try {
        const configHelper = new ConfigHelper();
        const config = await configHelper.getConfig();

        if (config) {
            const mondayDownloader = new MondayDownloader();
            const result = await mondayDownloader.execute(config);
        }
    }
    catch (err) {
        process.stderr.write(err + '\n');
    }
    finally {
        process.stderr.write('Done.\n');
    }
}

main();