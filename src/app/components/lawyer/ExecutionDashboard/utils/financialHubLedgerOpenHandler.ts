import type React from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, TimelineEvent } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import {
    creditMovableProceedsForExecution,
    creditMovableSaleProceedsToTrustLedger,
    resolveMovableSaleProceedsIqd,
} from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureFinancialUtils';
import {
    creditPropertyProceedsForExecution,
    creditPropertySaleProceedsToTrustLedger,
    resolvePropertySaleProceedsIqd,
} from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureFinancialUtils';

export const HAMI_OPEN_FINANCIAL_HUB_LEDGER_EVENT = 'hami-open-financial-hub-ledger';

export type FinancialHubLedgerOpenDetail = {
    executionId?: string;
    mode?: string;
    seizedMovableId?: string;
    seizedPropertyId?: string;
};

export type FinancialHubLedgerOpenContext = {
    executionDataId?: string;
    executionId?: string;
    executionDataRef: React.MutableRefObject<ExecutionFile | null>;
    seizureMatrixLedgerParamsRef: React.MutableRefObject<UnifiedLedgerTotalParams | null>;
    pushTimelineEventRef: React.MutableRefObject<
        ((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null
    >;
    nextTimelineId: () => string;
    setUnifiedLedgerRevision: React.Dispatch<React.SetStateAction<number>>;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    setFinancialHubAutoOpenMode: React.Dispatch<React.SetStateAction<'disburse' | null>>;
    setFinancialHubSeizedMovableId: React.Dispatch<React.SetStateAction<string | null>>;
    setFinancialHubSeizedPropertyId: React.Dispatch<React.SetStateAction<string | null>>;
    openFinancialHubLedger: () => void;
};

function creditMovableDisburseProceeds(
    myId: string,
    hit: SeizedMovable,
    ledgerParams: UnifiedLedgerTotalParams | null
) {
    return ledgerParams
        ? creditMovableProceedsForExecution(myId, hit, ledgerParams)
        : creditMovableSaleProceedsToTrustLedger({
              executionId: myId,
              movable: hit,
          });
}

function creditPropertyDisburseProceeds(
    myId: string,
    hit: SeizedProperty,
    ledgerParams: UnifiedLedgerTotalParams | null
) {
    return ledgerParams
        ? creditPropertyProceedsForExecution(myId, hit, ledgerParams)
        : creditPropertySaleProceedsToTrustLedger({
              executionId: myId,
              property: hit,
          });
}

export function handleFinancialHubLedgerOpenEvent(
    e: Event,
    ctx: FinancialHubLedgerOpenContext
): void {
    const ce = e as CustomEvent<FinancialHubLedgerOpenDetail>;
    const myId = String(ctx.executionDataId ?? ctx.executionId ?? '');
    if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;

    const mode = String(ce.detail?.mode ?? '').trim();
    const seizedMovableId = String(ce.detail?.seizedMovableId ?? '').trim();
    const seizedPropertyId = String(ce.detail?.seizedPropertyId ?? '').trim();

    if (mode === 'disburse' && seizedMovableId) {
        const movables = (ctx.executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const hit = movables.find((row) => String(row.id || '').trim() === seizedMovableId);
        if (!hit) {
            ctx.showToast('تعذر العثور على المال المنقول.', 'warning');
            return;
        }
        const amount = resolveMovableSaleProceedsIqd(hit);
        if (amount <= 0) {
            ctx.showToast(
                'تعذر الصرف: لم يُسجَّل مبلغ الإحالة/البيع في بيانات المنقول.',
                'warning'
            );
            return;
        }
        const trustCredit = creditMovableDisburseProceeds(
            myId,
            hit,
            ctx.seizureMatrixLedgerParamsRef.current
        );
        if (trustCredit.created || trustCredit.updated) {
            const nowIso = new Date().toISOString();
            ctx.pushTimelineEventRef.current?.({
                id: ctx.nextTimelineId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: '💰 إيداع حصيلة البيع في الأمانات — مال منقول',
                description: `وصف المال: ${String(hit.movableDescription || '').trim() || '—'}\nالمبلغ: ${amount.toLocaleString('ar-IQ')} د.ع`,
                type: 'payment',
                source: 'محضر المتابعة — الأموال المحجوزة',
                metadata: {
                    seizedMovableId,
                    trustPaymentId: trustCredit.paymentId,
                },
            });
            ctx.setUnifiedLedgerRevision((v) => v + 1);
            ctx.showToast(
                `تم إيداع ${amount.toLocaleString('ar-IQ')} د.ع في رصيد الأمانات — يمكنك الصرف الآن.`,
                'success'
            );
        }
    }

    if (mode === 'disburse' && seizedPropertyId) {
        const properties = (ctx.executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
        const hit = properties.find((row) => String(row.id || '').trim() === seizedPropertyId);
        if (!hit) {
            ctx.showToast('تعذر العثور على العقار.', 'warning');
            return;
        }
        const amount = resolvePropertySaleProceedsIqd(hit);
        if (amount <= 0) {
            ctx.showToast(
                'تعذر الصرف: لم يُسجَّل مبلغ الإحالة/البيع في بيانات العقار.',
                'warning'
            );
            return;
        }
        const trustCredit = creditPropertyDisburseProceeds(
            myId,
            hit,
            ctx.seizureMatrixLedgerParamsRef.current
        );
        if (trustCredit.created || trustCredit.updated) {
            const nowIso = new Date().toISOString();
            ctx.pushTimelineEventRef.current?.({
                id: ctx.nextTimelineId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: '💰 إيداع حصيلة البيع في الأمانات — عقار',
                description: `رقم العقار: ${String(hit.propertyNumber || '').trim() || '—'}\nالمبلغ: ${amount.toLocaleString('ar-IQ')} د.ع`,
                type: 'payment',
                source: 'محضر المتابعة — الأموال المحجوزة',
                metadata: {
                    seizedPropertyId,
                    trustPaymentId: trustCredit.paymentId,
                },
            });
            ctx.setUnifiedLedgerRevision((v) => v + 1);
            ctx.showToast(
                `تم إيداع ${amount.toLocaleString('ar-IQ')} د.ع في رصيد الأمانات — يمكنك الصرف الآن.`,
                'success'
            );
        }
    }

    if (mode === 'disburse') {
        ctx.setFinancialHubAutoOpenMode('disburse');
        ctx.setFinancialHubSeizedMovableId(seizedMovableId || null);
        ctx.setFinancialHubSeizedPropertyId(seizedPropertyId || null);
    } else {
        ctx.setFinancialHubAutoOpenMode(null);
        ctx.setFinancialHubSeizedMovableId(null);
        ctx.setFinancialHubSeizedPropertyId(null);
    }

    queueMicrotask(() => ctx.openFinancialHubLedger());
}
