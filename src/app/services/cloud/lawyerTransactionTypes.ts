export type TransactionsThreadingState = {
    schemaVersion: 1;
    userId: string;
    updatedAt: string;
    transactions: unknown[];
    tasks: unknown[];
    financeRecords: unknown[];
    documents: unknown[];
};

export type TransactionsThreadingSaveInput = {
    transactions: unknown[];
    tasks: unknown[];
    financeRecords: unknown[];
    documents: unknown[];
};
