import React, { useMemo, useState } from 'react';
import { Gavel } from 'lucide-react';
import type { JudicialDecision, OrderEnforcementTracking } from '@/app/types/criminal';
import { formatJudicialLedgerDate } from '../judicialDecisionsEngine';
import {
    formatOrderAttendanceLabel,
    formatOrderNotificationLabel,
} from '../orderEnforcementEngine';
import { ModalIsoDateInput } from './ModalIsoDateInput';
import { resolveConcernedPartyText } from '../decisionsLedgerVisuals';
import { DecisionCardTrashButton } from './DecisionCardTrashButton';

const LedgerDate = ({ value }: { value: string }) => (
    <span dir="ltr" className="inline-block unicode-bidi-plaintext tabular-nums">
        {formatJudicialLedgerDate(value)}
    </span>
);

export type LiveArrestSummonCardProps = {
    decision: JudicialDecision;
    readOnly?: boolean;
    partyLabel: (id: string) => string;
    onUpdateEnforcement: (patch: Partial<OrderEnforcementTracking>) => string | null;
    onMoveToTrash?: () => void;
};

/**
 * طبقة الإطار البَصري لِبطاقة الاستقدام/القبض:
 *   • أمر قَبض (arrest) → أَحمر/Rose      : إجراء ماسّ بالحرية.
 *   • أمر استقدام (summons) → كَهرماني/Amber : إنذار/تَكليف بالحضور.
 */
function shellClassByKind(kind: 'arrest' | 'summons'): {
    container: string;
    spine: string;
    chip: string;
} {
    if (kind === 'arrest') {
        return {
            container: 'border-red-500/30 bg-red-950/15 shadow-[0_0_18px_rgba(244,63,94,0.14)]',
            spine: 'bg-red-500/45',
            chip: 'border-red-500/45 bg-red-500/15 text-red-100',
        };
    }
    return {
        container: 'border-amber-500/30 bg-amber-950/12 shadow-[0_0_18px_rgba(245,158,11,0.10)]',
        spine: 'bg-amber-500/50',
        chip: 'border-amber-500/45 bg-amber-500/15 text-amber-100',
    };
}

export const LiveArrestSummonCard = ({
    decision,
    readOnly,
    partyLabel,
    onUpdateEnforcement,
    onMoveToTrash,
}: LiveArrestSummonCardProps) => {
    const [panelOpen, setPanelOpen] = useState(false);
    const [notifyDate, setNotifyDate] = useState('');
    const tracking = decision.orderEnforcement;
    const kind: 'arrest' | 'summons' = tracking?.kind ?? 'summons';
    const partyText = resolveConcernedPartyText(decision, partyLabel, { nameOnly: true });
    const article = String(tracking?.legalArticleBasis ?? decision.legalArticleBasis ?? '').trim();

    const isNotified = tracking?.notificationStatus === 'notified';
    const attendanceResolved =
        tracking?.attendanceStatus === 'attended' || tracking?.attendanceStatus === 'absent';
    const arrestExecuted = tracking?.arrestExecuted === 'executed';

    const showNotifyBlock = kind === 'summons' && !isNotified;
    const showAttendanceBlock = kind === 'summons' && isNotified && !attendanceResolved;
    const summonsPanelHasWork = showNotifyBlock || showAttendanceBlock;

    const summonsStatusLine = useMemo(() => {
        const parts = [formatOrderNotificationLabel(tracking)];
        parts.push(formatOrderAttendanceLabel(tracking));
        return parts.join(' • ');
    }, [tracking]);

    const saveNotify = () => {
        const d = notifyDate.trim();
        if (!d) return;
        onUpdateEnforcement({
            notificationStatus: 'notified',
            notifiedAt: d,
        });
    };

    const shell = shellClassByKind(kind);

    return (
        <div className={`relative mr-8 rounded-xl border p-4 ${shell.container}`}>
            {!readOnly && onMoveToTrash ? <DecisionCardTrashButton onClick={onMoveToTrash} /> : null}
            <span
                className={`absolute -right-1 top-3 h-[calc(100%-1.5rem)] w-1 rounded-full ${shell.spine}`}
                aria-hidden
            />

            {/* Header */}
            <div className={`space-y-2 min-w-0${!readOnly && onMoveToTrash ? ' pl-11' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black ${shell.chip}`}>
                        {kind === 'arrest' ? 'أمر قبض' : 'أمر استقدام'}
                    </span>
                    <span className="inline-block rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-black text-white/85">
                        قرار نافذ
                    </span>
                    {kind === 'arrest' && arrestExecuted ? (
                        <span className="inline-block rounded-full border border-emerald-500/40 bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-black text-emerald-100">
                            تم القبض عليه
                        </span>
                    ) : null}
                    <LedgerDate value={decision.issuedAt} />
                </div>
                <div className="text-white font-black text-sm whitespace-normal break-words">{decision.title}</div>
            </div>

            {/* Body — الاسم + المادة */}
            <div className="mt-3 space-y-2">
                {partyText || article ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
                        {partyText ? (
                            <div className="min-w-0 text-white/95 text-[12px] font-black whitespace-normal break-words">
                                {partyText}
                            </div>
                        ) : null}
                        {article ? (
                            <div className="min-w-0 text-white/85 text-[12px] font-black whitespace-normal break-words">
                                <span className="text-white/45 me-1">المادة:</span>
                                <span>{article}</span>
                            </div>
                        ) : null}
                    </div>
                ) : null}
                {kind === 'summons' ? (
                    <div className="text-white/70 text-[11px] font-bold whitespace-normal break-words">
                        {summonsStatusLine}
                    </div>
                ) : null}
            </div>

            {/* أمر قبض — زر واحد فقط */}
            {!readOnly && kind === 'arrest' && !arrestExecuted ? (
                <div className="mt-3 pt-3 border-t border-white/10">
                    <button
                        type="button"
                        onClick={() => onUpdateEnforcement({ arrestExecuted: 'executed' })}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/25 transition"
                    >
                        تم القبض عليه
                    </button>
                </div>
            ) : null}

            {/* أمر استقدام — متابعة التبليغ والحضور */}
            {!readOnly && kind === 'summons' && summonsPanelHasWork ? (
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => setPanelOpen((v) => !v)}
                        className="self-start inline-flex items-center gap-1.5 rounded-lg border border-amber-500/45 bg-amber-500/12 px-3 py-1.5 text-[11px] font-black text-amber-100 hover:bg-amber-500/20 transition"
                    >
                        <Gavel className="w-4 h-4" aria-hidden />
                        <span>{panelOpen ? 'إغلاق متابعة التنفيذ' : 'متابعة التنفيذ'}</span>
                    </button>
                    {panelOpen ? (
                        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 space-y-3">
                            {showNotifyBlock ? (
                                <div>
                                    <label className="block text-white/65 text-[11px] font-bold mb-1">
                                        تاريخ التبليغ
                                    </label>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <ModalIsoDateInput value={notifyDate} onChange={setNotifyDate} />
                                        <button
                                            type="button"
                                            onClick={saveNotify}
                                            disabled={!notifyDate.trim()}
                                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-[11px] font-black text-emerald-100 disabled:opacity-40"
                                        >
                                            تم التبليغ
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                            {showAttendanceBlock ? (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onUpdateEnforcement({ attendanceStatus: 'attended' })}
                                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-3 py-2 text-[11px] font-black text-emerald-100"
                                    >
                                        حضر
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onUpdateEnforcement({ attendanceStatus: 'absent' })}
                                        className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-[11px] font-black text-red-100"
                                    >
                                        تخلف
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
