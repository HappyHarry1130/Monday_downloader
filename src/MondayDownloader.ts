/**
 * This class handles downloading data from AWR.
 */

import fs from 'fs';
import axios from 'axios';
import { stringify } from 'csv-stringify';

import { DownloaderConfig } from "./dto/DownloaderConfig";
import { StatbidMessageLogger } from "./helpers/StatbidMessageLogger";
import { JsonData, ColumnValue, Item } from './interfaces/MondayInterface';


export class MondayDownloader {
    
    private static SERVICE_NAME = 'awr-downloader';
    private logger = new StatbidMessageLogger();
    private config = new DownloaderConfig();
    private csvFilePath ="output/monday.csv"

    async execute(config: DownloaderConfig) {
        try {
            this.config = config;
            process.env.GOOGLE_APPLICATION_CREDENTIALS = config.credentialsPath;
            let dateTime = new Date();
            let filename = `${dateTime}.csv`;
            console.log("start")
            const datas = await this.fetchData();
            this.convertToCsv(datas, "convert");
        } catch (error: any) {
            this.logger.logFatal(
                MondayDownloader.SERVICE_NAME,
                'AWR downloader',
                error.message
            );
        } finally {
            this.logger.logInfo(
                MondayDownloader.SERVICE_NAME,
                'AWR downloader',
                `AWR download complete.`
            )
        }
    }


    private getColumnRelationValue(columnValues: ColumnValue[], title: string): string | null {
        const column = columnValues.find(cv => cv.column.title === title);
        return column ? column.display_value : null;
    }
    private getColumnValue(columnValues: ColumnValue[], title: string): string | null {
        const column = columnValues.find(cv => cv.column.title === title);
        return column ? column.text : null;
    }
    private async fetchData(): Promise<any | null> {
        const apiKey: string = this.config.apikey;
        const boards_id: string[] = this.config.boards_id;
        let datas: any[] = [], success: boolean = false;
        console.log(boards_id.length);
        while (!success) {
            try {
                for (let i = 0; i < boards_id.length; i++) {
                    console.log(`${boards_id[i]}:${i}`);
                    const result = await this.getMondayBoards(apiKey, boards_id[i]);
                    if (result) {
                        const { board_name, allItems } = result;
                        const data = allItems.map((item: Item) => ({
                            "Board": board_name,
                            "Group": item.group.title,
                            "Name": item.name,
                            "Monday Link": `https://statbid.monday.com/boards/${boards_id[i]}/pulses/${item.id}`,
                            "Sites": this.getColumnRelationValue(item.column_values, "Sites"),
                            "Assignee": this.getColumnValue(item.column_values, "Assignee"),
                            "Business Group": this.getColumnValue(item.column_values, "Business Group"),
                            "Task Type": this.getColumnValue(item.column_values, "Task Type"),
                            "Status": this.getColumnValue(item.column_values, "Status"),
                            "Timeline - Start": this.getColumnValue(item.column_values, "Timeline")?.split(" - ")[0],
                            "Timeline - End": this.getColumnValue(item.column_values, "Timeline")?.split(" - ")[1],
                            "Scheduled": this.getColumnRelationValue(item.column_values, "Scheduled"),
                            "Tags": this.getColumnValue(item.column_values, "Tags"),
                            "Est Hours": this.getColumnValue(item.column_values, "Est. Hours"),
                            "Start Date": this.getColumnValue(item.column_values, "Start Date"),
                            "Due Date": this.getColumnValue(item.column_values, "Due Date"),
                            "Link": this.getColumnValue(item.column_values, "Link"),
                            "Date Added": this.getColumnValue(item.column_values, "Date Added"),
                            "DO NOT USE": this.getColumnValue(item.column_values, "DO NOT USE"),
                            "Last Updated": this.getColumnValue(item.column_values, "Last Updated"),
                            "Date Completed": this.getColumnValue(item.column_values, "Date Completed"),
                            "New Task Name": this.getColumnValue(item.column_values, "New Task Name")
                        }))
                        datas.push(...data);
                    }
                    if (i === boards_id.length - 1) {
                        success = true;
                    }
                }
            } catch (err) {
                datas = [];
            }
        }

        datas.sort((a, b) => {
            const strA = a.Board.split('');
            const strB = b.Board.split('');
            const length = Math.min(strA.length, strB.length);

            for (let i = 0; i < length; i++) {
                const charA = strA[i];
                const charB = strB[i];

                if (charA === charB) continue;

                if (charA.toLowerCase() === charB.toLowerCase()) {
                    return charA > charB ? -1 : 1;
                } else {
                    return charA.toLowerCase() > charB.toLowerCase() ? 1 : -1;
                }
            }
            return strA.length - strB.length;
        });
        return datas;
    }


    private async getMondayBoards(apiKey: string, board_id: string): Promise<{ board_name: string; allItems: Item[] } | null> {
        let board_name: string, allItems: Item[] = [], cursor: string | null = null;
        const url: string = "https://api.monday.com/v2";
        const headers = {
            "Authorization": apiKey,
            "Content-Type": "application/json"
        };

        try {
            let query = `
          {
              boards(ids: ${board_id}) {
                name
                id
                items_page (limit: 500) {
                  cursor
                  items {
                    id
                    name
                    column_values {
                      ... on BoardRelationValue {
                        linked_item_ids
                        display_value
                      }
                      ... on BoardRelationValue {
                        linked_item_ids
                        display_value
                      }
                      column {
                        title
                      }
                      text
                    }
                    group {
                      title
                      id
                    }
                  }
                }
              }
            }
          `
            let res = await axios.post(url, { query: query }, { headers: headers });
            let board = res.data.data.boards[0];
            board_name = board.name;
            let itemsPage = board.items_page;
            allItems = itemsPage.items;
            cursor = board.items_page.cursor;
            while (cursor) {
                query = `{
                next_items_page (cursor: "${cursor}") {
                    cursor
                    items {
                      id
                      name
                      column_values {
                          ... on BoardRelationValue {
                              linked_item_ids
                              display_value
                          }
                          ... on BoardRelationValue {
                              linked_item_ids
                              display_value
                          }
                          column {
                              title
                          }
                          text
                      }
                      group {
                          title
                          id
                      }
                    }
                }
            }`
                res = await axios.post(url, { query }, { headers });
                let nextItemsPage = res.data.data.next_items_page;
                if (nextItemsPage.items && nextItemsPage.items.length > 0) {
                    allItems.push(...nextItemsPage.items);
                    cursor = nextItemsPage.cursor;
                } else {
                    break;
                }
            }
            let data: any;
            data = { board_name, allItems }
            return data;
        } catch (error) {
            console.error("Failed to retrieve data:", error);
            return null;
        }
    }


    private async convertToCsv(jsonData: JsonData[], cs: string): Promise<void> {
        if (!Array.isArray(jsonData)) {
            console.error('Invalid JSON data');
            return;
        }

        if (jsonData.length === 0) {
            console.error('No data to convert');
            return;
        }

        const fields: string[] = [...Object.keys(jsonData[0])];
        const dataWithProjectID: JsonData[] = jsonData.map((obj: JsonData) => {
            return { ...obj };
        });
        const directoryPath = 'output';
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath);
        }
        try {
            const csv = await new Promise<string>((resolve, reject) => {
                stringify(dataWithProjectID, { header: true }, (err, output) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(output);
                    }
                });
            });

            fs.writeFile(`${directoryPath}/monday.csv`, csv, function (err) {
                if (err) {
                    console.error('Error writing CSV file:', err);
                } else {
                    console.log('CSV file saved!');
                }
            });
        } catch (error) {
            console.error('Error converting to CSV:', error);
        }
    }

}
