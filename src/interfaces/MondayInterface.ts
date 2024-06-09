export interface JsonData {
    [key: string]: any;
}
export interface ColumnValue {
    column: {
        title: string;
    };
    text: string | null;
    display_value: string | null;
}

export interface Item {
    id: string;
    name: string;
    group: {
        title: string;
        id: string;
    };
    column_values: ColumnValue[];
}

