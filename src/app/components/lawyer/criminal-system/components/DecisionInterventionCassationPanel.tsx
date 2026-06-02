import React from 'react';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import {
    formatJudicialAppealAppellantLabel,
    getLatestJudicialAppealOfPath,
    getPendingCassationAppealForResult,
    isPendingJudicialAppealForResult,
    resolveJudicialInterventionAppealStatusLabel,
} from '../judicialDecisionsEngine';
import { ModalIsoDate } from './ModalIsoDate';

export type DecisionInterventionCassationPanelProps = {
    decision: JudicialDecision;
    partyLabel: (id: string) => string;
    readOnly?: boolean;
    onRecordResult?: (appeal: JudicialDecisionAppeal) => void;
};

/**
 * حاوية تدخل تمييزي (م 264-ب) — عرض الحالة والنتيجة على بطاقة القرار.
 */
export const DecisionInterventionCassationPanel = ({
    decision,
    partyLabel,
    readOnly,
    onRecordResult,
}: DecisionInterventionCassationPanelProps) => {
    const appeal = getLatestJudicialAppealOfPath(decision, 'intervention_264b');
    const showPanel = Boolean(appeal || decision.interventionCassationPending === true);
    if (!showPanel) return null;

    const pending =
        appeal && isPendingJudicialAppealForResult(appeal, 'intervention_264b') ? appeal : undefined;
    const pendingForResult = getPendingCassationAppealForResult(decision);
    const canRecord =
        !readOnly &&
        pending &&
        pendingForResult?.id === pending.id &&
        typeof onRecordResult === 'function';
    const appellant = appeal ? formatJudicialAppealAppellantLabel(appeal, partyLabel) : '—';
    const statusLabel = resolveJudicialInterventionAppealStatusLabel(appeal);
    const targetedDecision = String(decision.title ?? '').trim() || '—';

    return (
        <div className="rounded-xl border border-violet-500/35 bg-violet-950/20 px-3 py-2 text-[11px] text-violet-100/90 space-y-1">
            <div className="font-black text-violet-200 whitespace-normal break-words">
                تدخل تمييزي — م 264
            </div>
            <div className="whitespace-normal break-words">القرار المستهدف: {targetedDecision}</div>
            <div className="whitespace-normal break-words">من قام بالإجراء: {appellant}</div>
            {appeal?.filedAt ? (
                <div dir="ltr" className="unicode-bidi-plaintext">
                    تاريخ التقديم: <ModalIsoDate value={appeal.filedAt} />
                </div>
            ) : null}
            <div
                className={`font-bold whitespace-normal break-words ${
                    pending ? 'text-amber-100/90' : 'text-emerald-200/90'
                }`}
            >
                الحالة: {statusLabel}
            </div>
            {canRecord ? (
                <button
                    type="button"
                    onClick={() => onRecordResult!(pending)}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-violet-400/55 bg-violet-500/15 px-3 py-1.5 text-[11px] font-black text-violet-100 hover:bg-violet-500/22 transition whitespace-normal break-words"
                >
                    ⚖️ تسجيل نتيجة التدخل التمييزي
                </button>
            ) : null}
        </div>
    );
};
