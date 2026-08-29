import React from 'react';
import type { InlineActionGateKey } from '@/app/components/lawyer/ExecutionDashboard/types';
import type { EvictionFieldProceduresPanelProps } from '../types';

export function useEvictionFieldPanelState(_props: EvictionFieldProceduresPanelProps) {
    const policeBtnRef = React.useRef<HTMLButtonElement | null>(null);
    const [scheduleDraftByDecisionId, setScheduleDraftByDecisionId] = React.useState<
        Record<string, { dateOnly: string; timeOptional: string; notes: string }>
    >({});
    const [scheduleSavingByDecisionId, setScheduleSavingByDecisionId] = React.useState<Record<string, boolean>>({});
    const [linkFieldVisitToAppointments, setLinkFieldVisitToAppointments] = React.useState(true);
    const [inlineExpandedByBranch, setInlineExpandedByBranch] = React.useState<Record<string, boolean>>({});
    const [inlineActionGateKey, setInlineActionGateKey] = React.useState<InlineActionGateKey | null>(null);
    const [confirmGate, setConfirmGate] = React.useState<
        null | 'early_end' | 'custodian'
    >(null);
    const [confirmBusy, setConfirmBusy] = React.useState(false);

    return {
        policeBtnRef,
        scheduleDraftByDecisionId,
        setScheduleDraftByDecisionId,
        scheduleSavingByDecisionId,
        setScheduleSavingByDecisionId,
        linkFieldVisitToAppointments,
        setLinkFieldVisitToAppointments,
        inlineExpandedByBranch,
        setInlineExpandedByBranch,
        inlineActionGateKey,
        setInlineActionGateKey,
        confirmGate,
        setConfirmGate,
        confirmBusy,
        setConfirmBusy,
    };
}
