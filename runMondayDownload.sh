#!/bin/bash

DL_MAIN_FILE=./dist/main.js
DL_DIR_NAME=monday_downloader
DL_BQ_DATASET_NAME=123inkjets
DL_BQ_TABLE_NAME=monday
DL_CSV_DIR_NAME=output
DL_GS_BUCKET_NAME=gs://statbid-argos-datacollection-prod1/123inkjets/monday

gcloud auth activate-service-account --key-file=../feed-storage-94d94e70e271.json

mkdir -p ./reports

DATETIME=$(date -Iseconds)
LOG_FILE_NAME=$(echo $DL_DIR_NAME | sed 's/-/_/g')-$DATETIME.log

# Run the main script and log output
node $DL_MAIN_FILE > ./reports/Majestic-downloader-$DATETIME.log 2>&1

# Check if there are CSV files to upload
if ls $DL_CSV_DIR_NAME/*.csv 1> /dev/null 2>&1; then
    gsutil cp "$DL_CSV_DIR_NAME"/*.csv "$DL_GS_BUCKET_NAME"/ >> ./reports/$LOG_FILE_NAME 2>&1
else
    echo "No CSV files found in $DL_CSV_DIR_NAME" >> ./reports/$LOG_FILE_NAME
fi

ERROR_COUNT=$(grep -ic error ./reports/$LOG_FILE_NAME)

if [ $ERROR_COUNT -eq 0 ]; then

    bq load --source_format=CSV --autodetect \
        "$DL_BQ_DATASET_NAME"."$DL_BQ_TABLE_NAME" \
        "$DL_GS_BUCKET_NAME"/*.csv >> ./reports/$LOG_FILE_NAME 2>&1
fi

ERROR_COUNT=$(grep -ic error ./reports/$LOG_FILE_NAME)
if [ $ERROR_COUNT -ne 0 ]; then
    echo "One or more errors occurred during $DL_DIR_NAME processing - check the log for details"
fi

gsutil cp ./reports/$LOG_FILE_NAME "$DL_GS_BUCKET_NAME"/reports/$LOG_FILE_NAME

rm -rf "$DL_CSV_DIR_NAME"
rm -rf ./reports/
