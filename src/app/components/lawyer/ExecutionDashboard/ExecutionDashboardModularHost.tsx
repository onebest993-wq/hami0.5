/**
 * يربط مكوّنات ExecutionDashboard/ بنفس بيانات الشاشة الرئيسية.
 * يُعرض داخل غلاف مخفي حتى لا يتغيّر التخطيط الظاهر؛ يبقى الـ DOM متزامناً للاختبار والـ hooks.
 */
import * as React from 'react';
import type { ExecutionFile, TimelineEvent as AppTimelineEvent } from '@/app/types/execution';
import { ExecutionHeader } from './ExecutionHeader';
import { ExecutionPartiesSection } from './ExecutionPartiesSection';
import { ExecutionPaymentsSection } from './ExecutionPaymentsSection';
import { ExecutionTimelineSection } from './ExecutionTimelineSection';
import { ExecutionActionsBar } from './ExecutionActionsBar';
import type { Party, Payment, TimelineEvent as ModularTimelineEvent } from './types';

function mapRowsToParties(rows: unknown[]): Party[] {
    return rows.map((raw, i) => {
        const c = raw as Record<string, unknown>;
        return {
            id: String(c.id ?? i),
            name: String(c.name ?? ''),
            phone: c.phone as string | undefined,
            address: c.address as string | undefined,
            occupation: c.occupation as string | undefined,
            isClient: Boolean(c.isClient),
            kinship: c.kinship as string | undefined,
            relation: c.relation as string | undefined,
            linkedDebtorId: c.linkedDebtorId as string | number | undefined,
        };
    });
}

function adaptTimeline(events: AppTimelineEvent[]): ModularTimelineEvent[] {
    const allowed: ModularTimelineEvent['type'][] = [
        'payment',
        'notification',
        'procedure',
        'court',
        'note',
    ];
    return events.map((e) => {
        const t = String(e.type);
        const type = (allowed.includes(t as ModularTimelineEvent['type'])
            ? t
            : 'note') as ModularTimelineEvent['type'];
        return {
            id: e.id,
            date: e.timestamp || e.date || '',
            type,
            title: e.title || '',
            description: e.description || e.details,
        };
    });
}

function ledgerToPayments(
    ledger: Array<{
        id: string;
        date: string;
        type: string;
        amount: number;
        description: string;
    }>
): Payment[] {
    return ledger
        .filter((x) => x.type === 'payment')
        .map((x) => ({
            id: x.id,
            date: x.date,
            amount: x.amount,
            method: 'cash' as const,
            notes: x.description,
            createdAt: x.date,
        }));
}

export interface ExecutionDashboardModularHostProps {
    executionData: ExecutionFile;
    onClose: () => void;
    creditorsRows: unknown[];
    debtorsRows: unknown[];
    timelineEvents: AppTimelineEvent[];
    financialLedger: Array<{
        id: string;
        date: string;
        type: 'payment' | 'fee' | 'settlement';
        amount: number;
        description: string;
        balance: number;
    }>;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    isHeaderExpanded: boolean;
    onToggleHeaderExpand: () => void;
    setShowPaymentModal: (v: boolean) => void;
    setShowNotificationModal: (v: boolean) => void;
    setShowDocumentsModal: (v: boolean) => void;
    setShowAppointmentModal: (v: boolean) => void;
    setShowPaymentCalculator: (v: boolean) => void;
}

export const ExecutionDashboardModularHost = React.memo(function ExecutionDashboardModularHost(
    props: ExecutionDashboardModularHostProps
) {
    const {
        executionData,
        onClose,
        creditorsRows,
        debtorsRows,
        timelineEvents,
        financialLedger,
        totalAmount,
        paidAmount,
        remainingAmount,
        isHeaderExpanded,
        onToggleHeaderExpand,
        setShowPaymentModal,
        setShowNotificationModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowPaymentCalculator,
    } = props;

    const creditors = React.useMemo(() => mapRowsToParties(creditorsRows), [creditorsRows]);
    const debtors = React.useMemo(() => mapRowsToParties(debtorsRows), [debtorsRows]);
    const modularTimeline = React.useMemo(() => adaptTimeline(timelineEvents), [timelineEvents]);
    const payments = React.useMemo(() => ledgerToPayments(financialLedger), [financialLedger]);

    return (
        <div className="hidden" aria-hidden="true" data-testid="execution-dashboard-modular-host">
            <ExecutionHeader
                executionData={executionData}
                isExpanded={isHeaderExpanded}
                onClose={onClose}
                onToggleExpand={onToggleHeaderExpand}
            />
            <ExecutionPartiesSection
                creditors={creditors}
                debtors={debtors}
                expandedParties={{}}
                onToggleParty={() => {}}
            />
            <ExecutionPaymentsSection
                payments={payments}
                totalAmount={totalAmount}
                paidAmount={paidAmount}
                remainingAmount={remainingAmount}
                onAddPayment={() => setShowPaymentModal(true)}
            />
            <ExecutionTimelineSection events={modularTimeline} />
            <ExecutionActionsBar
                activeTab=""
                onAddPayment={() => setShowPaymentModal(true)}
                onSendNotification={() => setShowNotificationModal(true)}
                onAddDocument={() => setShowDocumentsModal(true)}
                onViewDocuments={() => setShowDocumentsModal(true)}
                onScheduleAppointment={() => setShowAppointmentModal(true)}
                onShowCalculator={() => setShowPaymentCalculator(true)}
            />
        </div>
    );
});
