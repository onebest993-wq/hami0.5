/** جسر بلا مخزن — السحابة والمستودع يبلّغان الطبقة الحية دون دورة استيراد. */
export type ThreadingLiveDump = {
    transactions: unknown[];
    tasks: unknown[];
    documents: unknown[];
};

type Listener = (userId: string, dump: ThreadingLiveDump) => void;

let listener: Listener | null = null;

export function registerTransactionsThreadingDumpListener(fn: Listener | null): void {
    listener = fn;
}

export function emitTransactionsThreadingDump(userId: string, dump: ThreadingLiveDump): void {
    const uid = userId?.trim();
    if (!uid) return;
    listener?.(uid, dump);
}
