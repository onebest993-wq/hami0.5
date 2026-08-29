export type TransactionsThreadingSystemProps = {
    onBack: () => void;
    userId: string;
    initialTransactionId?: string;
    onInitialFocusConsumed?: () => void;
    open?: boolean;
};
