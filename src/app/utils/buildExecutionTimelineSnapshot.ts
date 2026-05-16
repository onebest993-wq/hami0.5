import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';

export type ExecutionTimelineSnapshotInput = {
    executionData: ExecutionFile | null;
    /** دفتر الأموال الحالي (قد يختلف عن الحقل داخل الملف قبل الدمج) */
    financialLedger?: unknown[];
    /** المحجوزات الحالية */
    seizedAssets?: SeizedAsset[];
};

/**
 * يبني لقطة JSON للإضبارة (بدون تكرار السجل الزمني بالكامل داخل اللقطة لتقليل الحجم).
 */
export function buildExecutionTimelineSnapshot(
    params: ExecutionTimelineSnapshotInput
): Record<string, unknown> {
    const ex = params.executionData;
    if (!ex) {
        return { capturedAt: new Date().toISOString(), executionData: null };
    }
    const { timelineEvents: _tl, ...executionWithoutTimeline } = ex;
    const ledger =
        params.financialLedger !== undefined ? params.financialLedger : ex.financialLedger;
    const assets =
        params.seizedAssets !== undefined ? params.seizedAssets : ex.seizedAssets;

    return {
        capturedAt: new Date().toISOString(),
        executionData: executionWithoutTimeline,
        debtData: {
            paidDebt: ex.paidDebt,
            financialLedger: ledger,
            totalAmount: ex.totalAmount,
            paidCourtFees: ex.paidCourtFees,
            paidDirectorateFees: ex.paidDirectorateFees,
            paidClientFees: ex.paidClientFees,
        },
        parties: {
            creditors: ex.creditors,
            debtors: ex.debtors,
        },
        seizedAssets: assets,
    };
}
