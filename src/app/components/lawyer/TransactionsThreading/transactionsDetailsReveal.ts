import { prefetchTransactionsDetailsScreen } from './transactionsFeatureLoader';

/** يُبقي القائمة حتى يجهز مقطع التفاصيل؛ الجيل يُلغي فتحاً قديماً بعد رجوع أو إغلاق */
export function createTransactionsDetailsReveal(apply: {
    go: (transactionId: string) => void;
    onChunkFailed: () => void;
}): { reveal: (transactionId: string) => void; invalidate: () => void } {
    let generation = 0;

    return {
        invalidate() {
            generation += 1;
        },
        reveal(transactionId: string) {
            const token = ++generation;
            void prefetchTransactionsDetailsScreen().then(
                () => {
                    if (token !== generation) return;
                    apply.go(transactionId);
                },
                () => {
                    if (token !== generation) return;
                    apply.onChunkFailed();
                },
            );
        },
    };
}
