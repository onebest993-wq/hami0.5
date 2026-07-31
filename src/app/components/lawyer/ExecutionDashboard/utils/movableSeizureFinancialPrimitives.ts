import type { SeizedMovable } from '@/app/types/execution';

export function resolveMovableSaleProceedsIqd(m: SeizedMovable): number {
    const pick = (...vals: unknown[]): number => {
        for (const v of vals) {
            const n = Number(v);
            if (Number.isFinite(n) && n > 0) return Math.trunc(n);
        }
        return 0;
    };
    return pick(m.finalAwardAmountIqd, m.award?.awardAmountIqd, m.initialAwardAmountIqd);
}

export function movableProceedsTrustPaymentId(movableId: string): string {
    return `pay-movable-proceeds-${String(movableId || '').trim()}`;
}
