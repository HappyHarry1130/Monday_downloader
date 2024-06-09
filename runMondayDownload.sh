
#!/bin/bash

DL_MAIN_FILE=./dist/main.js
DL_DIR_NAME=monday_downloader
DL_BQ_DATASET_NAME=Monday
DL_BQ_TABLE_NAME=Monday
DL_CSV_DIR_NAME=output
DL_GS_BUCKET_NAME=gs://statbid1/statbid-argos-datacollection-prod/knifecenter/monday

gcloud auth activate-service-account --key-file=../feed-storage-94d94e70e271.json

mkdir -p ./reports

DATETIME=$(date -Iseconds)
LOG_FILE_NAME=$(echo $DL_DIR_NAME | sed 's/-/_/g')-$DATETIME.log

node $DL_MAIN_FILE 1> ./reports/Majestic-downloader-$DATETIME.log 2>&1

find ./reports -type f -exec gsutil cp "$DL_CSV_DIR_NAME"/*.csv "$DL_GS_BUCKET_NAME"/"$DATETIME"/ \; >> ./reports/$LOG_FILE_NAME 2>&1
#find ./reports -type f -exec gsutil cp {} gs://statbid/$DL_DIR_NAME/{}-$DATETIME \; >> ./reports/$LOG_FILE_NAME 2>&1

ERROR_COUNT=$(cat ./reports/$LOG_FILE_NAME | grep -ic error)

if [ $ERROR_COUNT -eq 0 ]; then
    if ! bq show --dataset $DL_BQ_DATASET_NAME &>/dev/null; then
        bq mk --dataset $DL_BQ_DATASET_NAME >> ./reports/$LOG_FILE_NAME 2>&1
    else
        echo "Dataset $DL_BQ_DATASET_NAME already exists." >> ./reports/$LOG_FILE_NAME
    fi

    bq load --source_format=CSV --autodetect \
        "$DL_BQ_DATASET_NAME"."$DL_BQ_TABLE_NAME" \
        "$DL_GS_BUCKET_NAME"/*.csv >> ./reports/$LOG_FILE_NAME 2>&1
fi

ERROR_COUNT=$(grep -ic error ./reports/$LOG_FILE_NAME)
if [ $ERROR_COUNT -ne 0 ]; then
    echo "One or more errors occurred during $DL_DIR_NAME processing - check the log for details"
fi

gsutil cp ./reports/$LOG_FILE_NAME "$DL_GS_BUCKET_NAME"/reports/$LOG_FILE_NAME

rm -r "$DL_CSV_DIR_NAME"
rm -r ./reports/
