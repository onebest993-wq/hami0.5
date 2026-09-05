import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TimelineEventType } from '@/app/types/execution';
import {
    buildGhuramaaContext,
    computeGhuramaaManualDistribution,
    type GhuramaaContext,
    type GhuramaaManualResult,
} from './focGhuramaaDistribution';
import type { UnifiedLedgerStore } from './types';
import { computeTrustBalanceFromPayments, formatNumberInput } from './utils';

type NotifyFn = (
    message: string,
    variant?: 'success' | 'error' | 'warning' | 'info',
    options?: { decisionsLink?: boolean },
) => void;

type RecordFinancialTimelineNoteFn = (
    title: string,
    description: string,
    type?: TimelineEventType | string,
) => void;

export type UseFocGhuramaaActionsParams = {
    persist: (next: UnifiedLedgerStore) => void;
    getLatestLedgerStore: () => UnifiedLedgerStore;
    notify: NotifyFn;
    recordFinancialTimelineNote: RecordFinancialTimelineNoteFn;
    remainingUnified: number;
    trustBalanceUnified: number;
    onApplyGhuramaaDistribution?: (args: {
        transactionId: string;
        dateIso: string;
        totalAmountDistributed: number;
        distributionDetails: Array<{
            creditorId: string;
            creditorName: string;
            debtBeforeDistribution: number;
            amountDistributed: number;
        }>;
    }) => void;
    canShowGhuramaaDivision: boolean;
    ghuramaaCreditors?: Array<{
        creditorId: string;
        creditorName: string;
        debtBeforeDistribution: number;
        remainingDebt: number;
    }>;
    ghuramaaModalOpen: boolean;
    setGhuramaaModalOpen: (value: boolean) => void;
    setDisburseAmountInput: (value: string) => void;
};

export function useFocGhuramaaActions(params: UseFocGhuramaaActionsParams): {
    ghuramaaContext: GhuramaaContext;
    ghuramaaManual: GhuramaaManualResult;
    ghuramaaShareInputs: Record<string, string>;
    setGhuramaaShareInput: (creditorId: string, raw: string) => void;
    applyGhuramaaEqualSplit: () => void;
    openGhuramaaModal: () => void;
    applyGhuramaaDistribution: () => void;
} {
    const {
        persist,
        getLatestLedgerStore,
        notify,
        recordFinancialTimelineNote,
        remainingUnified,
        trustBalanceUnified,
        onApplyGhuramaaDistribution,
        canShowGhuramaaDivision,
        ghuramaaCreditors,
        ghuramaaModalOpen,
        setGhuramaaModalOpen,
        setDisburseAmountInput,
    } = params;

    const [ghuramaaShareInputs, setGhuramaaShareInputs] = useState<Record<string, string>>({});
    const [ghuramaaSplitMode, setGhuramaaSplitMode] = useState<'manual' | 'equal' | null>(null);

    const ghuramaaContext = useMemo(
        () => buildGhuramaaContext(ghuramaaCreditors, trustBalanceUnified),
        [ghuramaaCreditors, trustBalanceUnified],
    );

    useEffect(() => {
        if (!ghuramaaModalOpen) return;
        const next: Record<string, string> = {};
        ghuramaaContext.eligible.forEach((c) => {
            next[c.creditorId] = '';
        });
        setGhuramaaShareInputs(next);
        setGhuramaaSplitMode(null);
    }, [ghuramaaModalOpen, ghuramaaContext.eligible]);

    const ghuramaaManual = useMemo(
        () =>
            computeGhuramaaManualDistribution({
                context: ghuramaaContext,
                shareInputs: ghuramaaShareInputs,
                splitMode: ghuramaaSplitMode,
            }),
        [ghuramaaContext, ghuramaaShareInputs, ghuramaaSplitMode],
    );

    const setGhuramaaShareInput = useCallback((creditorId: string, raw: string) => {
        setGhuramaaSplitMode('manual');
        setGhuramaaShareInputs((prev) => ({
            ...prev,
            [creditorId]: formatNumberInput(raw),
        }));
    }, []);

    const applyGhuramaaEqualSplit = useCallback(() => {
        const { available, eligible } = ghuramaaContext;
        if (available <= 0 || eligible.length === 0) return;
        void import('./focGhuramaaEqualSplit').then(({ buildGhuramaaEqualSplitInputs }) => {
            setGhuramaaShareInputs(buildGhuramaaEqualSplitInputs(eligible, available));
            setGhuramaaSplitMode('equal');
        });
    }, [ghuramaaContext]);

    const openGhuramaaModal = useCallback(() => {
        if (!canShowGhuramaaDivision) {
            notify('قسمة الغرماء متاحة فقط عند وجود أكثر من دائن واحد.', 'warning');
            return;
        }
        if (trustBalanceUnified <= 0) {
            notify('لا يوجد رصيد أمانات للتوزيع.', 'warning');
            return;
        }
        if (!ghuramaaContext.canOpen) {
            notify(
                ghuramaaContext.note ||
                    'لا توجد حصص دين مسجّلة للدائنين — تأكد من إجمالي المطالبة أو حصص الدائنين في الإضبارة.',
                'warning',
            );
            return;
        }
        void import('./focGhuramaaEqualSplit');
        setGhuramaaModalOpen(true);
    }, [canShowGhuramaaDivision, ghuramaaContext, notify, setGhuramaaModalOpen, trustBalanceUnified]);

    const applyGhuramaaDistribution = useCallback(() => {
        if (!canShowGhuramaaDivision) {
            notify('لا يمكن إجراء قسمة الغرماء: لا يوجد تعدد دائنين.', 'warning');
            return;
        }
        if (!ghuramaaManual.ok) {
            notify(
                ghuramaaManual.validationNote || 'أدخل حصص الدائنين يدوياً ضمن حدود الأمانات والديون.',
                'warning',
            );
            return;
        }
        const total = Math.max(0, Math.trunc(ghuramaaManual.sum));
        const distributionRows = ghuramaaManual.rows.filter((r) => r.amountDistributed > 0);
        if (!Number.isFinite(total) || total <= 0 || distributionRows.length === 0) {
            notify('لا يوجد مبلغ قابل للتوزيع.', 'warning');
            return;
        }
        const current = getLatestLedgerStore();
        const trustBefore = computeTrustBalanceFromPayments(current.payments);
        if (total > trustBefore) {
            notify(
                `مجموع الحصص يتجاوز رصيد الأمانات (${trustBefore.toLocaleString('ar-IQ')} د.ع).`,
                'warning',
            );
            return;
        }
        const ts = new Date().toISOString();
        const transactionId = `ghr-${Date.now()}`;
        try {
            onApplyGhuramaaDistribution?.({
                transactionId,
                dateIso: ts,
                totalAmountDistributed: total,
                distributionDetails: distributionRows,
            });
        } catch {
            notify('تعذر حفظ القسمة داخل الإضبارة.', 'error');
            return;
        }
        const trustAfter = Math.max(0, trustBefore - total);
        persist({
            ...current,
            payments: [
                {
                    id: `pay-ghr-${Date.now()}`,
                    amount: total,
                    at: ts,
                    kind: 'partial',
                    entryType: 'disburse',
                    balanceAfter: trustAfter,
                    debtBalanceAfter: remainingUnified,
                    trustBalanceAfter: trustAfter,
                },
                ...current.payments,
            ],
            completed: current.completed,
            collectionRequestActive: current.collectionRequestActive,
        });
        recordFinancialTimelineNote(
            '⚖️ قسمة الغرماء — توزيع الأمانات',
            `تم توزيع ${total.toLocaleString('ar-IQ')} د.ع على ${distributionRows.length} دائن/دائنين — المتبقي في الأمانات ${trustAfter.toLocaleString('ar-IQ')} د.ع.`,
        );
        setGhuramaaModalOpen(false);
        setGhuramaaShareInputs({});
        setGhuramaaSplitMode(null);
        setDisburseAmountInput('');
        notify(
            `تم اعتماد القسمة. المتبقي في الأمانات: ${trustAfter.toLocaleString('ar-IQ')} د.ع`,
            'success',
        );
    }, [
        canShowGhuramaaDivision,
        getLatestLedgerStore,
        ghuramaaManual,
        notify,
        onApplyGhuramaaDistribution,
        persist,
        recordFinancialTimelineNote,
        remainingUnified,
        setDisburseAmountInput,
        setGhuramaaModalOpen,
    ]);

    return {
        ghuramaaContext,
        ghuramaaManual,
        ghuramaaShareInputs,
        setGhuramaaShareInput,
        applyGhuramaaEqualSplit,
        openGhuramaaModal,
        applyGhuramaaDistribution,
    };
}
