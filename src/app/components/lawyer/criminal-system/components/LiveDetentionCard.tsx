import React, { useState } from 'react';
import { CalendarClock, Scale, ShieldOff, Unlock } from '@/app/components/ui/lucideIcons';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import type { CriminalDefendant } from '../criminalStore';
import {
    decisionAlreadyHasCassationAppeal,
    formatJudicialLedgerDate,
    formatRectificationBadge,
    getPendingCassationAppealForResult,
    latestConcludedAppealWithBeneficiary,
} from '../judicialDecisionsEngine';
import { lawyerRequestOutcomeBadgeClass } from '../lawyerRequestStatusMachine';
import {
    cassationResultMarkClass,
    formatCassationResultShortLabel,
    normalizeCassationAppealResult,
} from '../cassationJudicialForm';
import { isDecisionCassationAppealable, isDetentionDecisionTemplate } from '../proceduralRequestTypes';
import {
    isActiveDetentionCard,
    isDetentionEndReached,
    isLatestBindingDetentionForParties,
} from '../detentionEngine';
import { resolveConcernedPartyText, resolveLedgerPartyRowLabel } from '../decisionsLedgerVisuals';
import { ModalIsoDate } from './ModalIsoDate';
import { ModalIsoDateInput } from './ModalIsoDateInput';
import { DecisionCardAppealFooter } from './DecisionCardAppealFooter';
import { DecisionCassationAppealsPanel } from './DecisionCassationAppealsPanel';
import { DecisionInterventionCassationPanel } from './DecisionInterventionCassationPanel';
import { DecisionCardTrashButton } from './DecisionCardTrashButton';
import type { CaseStage } from '@/app/types/criminal';

const LedgerDate = ({ value }: { value: string }) => (
    <span dir="ltr" className="inline-block unicode-bidi-plaintext tabular-nums">
        {formatJudicialLedgerDate(value)}
    </span>
);

function resolveDetentionPartyIds(decision: JudicialDecision, fallbackDefendantId?: string | null): string[] {
    const ids = (decision.defendantIds ?? decision.beneficiaryPartyIds ?? [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (ids.length) return ids;
    const fb = String(fallbackDefendantId ?? '').trim();
    return fb ? [fb] : [];
}

function isDetentionCardClosed(
    decision: JudicialDecision,
    defendants: CriminalDefendant[],
    fallbackDefendantId?: string | null,
): boolean {
    if (Boolean(String(decision.detentionReleasedAt ?? '').trim())) return true;
    const ids = resolveDetentionPartyIds(decision, fallbackDefendantId);
    if (!ids.length) return false;
    return ids.every((id) => {
        const row = defendants.find((d) => d.id === id);
        return row ? row.status !== 'موقوف' : false;
    });
}

/**
 * طبقة الإطار البَصري لِبطاقة التوقيف:
 *   • أَحمر/Rose             : توقيف نَشط (قَرار ماسّ بالحرية → اللون القاعدي).
 *   • كَهرماني/Amber          : انتهاء المُدّة — يَطلب إجراءً عاجلاً.
 *   • أَخضر/Emerald           : أُغلِقَت — إطلاق سراح موثَّق.
 */
function detentionShellClass(endReached: boolean, closed: boolean): string {
    if (closed) return 'border-emerald-500/35 bg-emerald-950/15 shadow-[0_0_18px_rgba(16,185,129,0.10)]';
    if (endReached) {
        return 'border-amber-500/45 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.18)] ring-1 ring-amber-400/25';
    }
    return 'border-red-500/30 bg-red-950/15 shadow-[0_0_18px_rgba(244,63,94,0.14)]';
}

function detentionSpineClass(endReached: boolean, closed: boolean): string {
    if (closed) return 'bg-emerald-500/45';
    if (endReached) return 'bg-amber-500/50';
    return 'bg-red-500/45';
}

function detentionStatusChipClass(endReached: boolean, closed: boolean): string {
    if (closed) return 'border-emerald-500/45 bg-emerald-500/15 text-emerald-100';
    if (endReached) return 'border-amber-500/45 bg-amber-500/15 text-amber-100';
    return 'border-red-500/40 bg-red-500/15 text-red-100';
}

function detentionStatusLabel(endReached: boolean, closed: boolean): string {
    if (closed) return 'مطلق سراحه — منتهية';
    if (endReached) return 'انتهت المدة — يتطلب إجراء';
    return 'توقيف نشط';
}

export type LiveDetentionCardProps = {
    decision: JudicialDecision;
    allDecisions: JudicialDecision[];
    userRole: CriminalCaseUserRole;
    defendants: CriminalDefendant[];
    fallbackDefendantId?: string | null;
    readOnly?: boolean;
    partyLabel: (id: string) => string;
    caseStage?: CaseStage;
    crimeTypeLabel?: string;
    onAppeal: () => void;
    onResult: (appeal: JudicialDecisionAppeal) => void;
    onInterventionCassation: () => void;
    onCassationCorrection: () => void;
    onDeclareJudgmentFinal: () => void;
    onMoveToTrash?: () => void;
    onExtendDetention: (decision: JudicialDecision, newEndDate: string) => string | null;
    onDocumentRelease: (decision: JudicialDecision) => string | null;
    onQuickBailRelease: (decision: JudicialDecision) => void;
};

/** بطاقة توقيف حية — توثيق مجريات المحكمة + طلب كفالة لوكيل المتهم. */
export const LiveDetentionCard = ({
    decision,
    allDecisions,
    userRole,
    defendants,
    fallbackDefendantId,
    readOnly,
    partyLabel,
    caseStage,
    crimeTypeLabel,
    onAppeal,
    onResult,
    onInterventionCassation,
    onCassationCorrection,
    onDeclareJudgmentFinal,
    onMoveToTrash,
    onExtendDetention,
    onDocumentRelease,
    onQuickBailRelease,
}: LiveDetentionCardProps) => {
    const [extendOpen, setExtendOpen] = useState(false);
    const [extendEndDraft, setExtendEndDraft] = useState('');
    const [extendError, setExtendError] = useState('');

    const startDate = String(decision.detentionStartDate ?? decision.issuedAt ?? '').trim();
    const endDate = String(decision.detentionEndDate ?? '').trim();
    const endReached = isDetentionEndReached(endDate);
    const closed = isDetentionCardClosed(decision, defendants, fallbackDefendantId);
    const isDefendantLawyer = userRole === 'defendant_lawyer';
    const isControllingCard =
        isActiveDetentionCard(decision) && isLatestBindingDetentionForParties(decision, allDecisions);
    const showActionBar = !readOnly && isControllingCard && !closed;

    const concludedAppeal = latestConcludedAppealWithBeneficiary(decision);
    const concludedAppealResult = concludedAppeal
        ? normalizeCassationAppealResult(
              typeof concludedAppeal.result === 'string' ? concludedAppeal.result : undefined,
          )
        : '';
    const concludedAppealShortLabel = formatCassationResultShortLabel(concludedAppealResult);
    const concludedAppealTooltip =
        concludedAppeal && concludedAppealShortLabel
            ? formatRectificationBadge(concludedAppeal, partyLabel, decision.title) ?? concludedAppealShortLabel
            : '';
    const pendingAppeal = getPendingCassationAppealForResult(decision);
    const showRecordResult = !readOnly && pendingAppeal;
    const showAppealButton =
        isDecisionCassationAppealable(decision) && !decisionAlreadyHasCassationAppeal(decision);

    const partyText = resolveConcernedPartyText(decision, partyLabel, { nameOnly: true });
    const partyRow = resolveLedgerPartyRowLabel(decision, partyText);
    const article = String(decision.legalArticleBasis ?? '').trim();

    const submitExtend = () => {
        const err = onExtendDetention(decision, extendEndDraft.trim());
        if (err) {
            setExtendError(err);
            return;
        }
        setExtendError('');
        setExtendOpen(false);
        setExtendEndDraft('');
    };

    const shellClass = detentionShellClass(endReached, closed);
    const spineClass = detentionSpineClass(endReached, closed);
    const statusChip = detentionStatusChipClass(endReached, closed);

    return (
        <div
            className={`relative mr-8 rounded-xl border p-4 transition-colors ${shellClass}`}
            data-detention-card="live"
        >
            {!readOnly && onMoveToTrash ? <DecisionCardTrashButton onClick={onMoveToTrash} /> : null}
            <span
                className={`absolute -right-1 top-3 h-[calc(100%-1.5rem)] w-1 rounded-full ${spineClass}`}
                aria-hidden
            />

            {/* Header — Chip + Date + Title */}
            <div className={`space-y-2 min-w-0${!readOnly && onMoveToTrash ? ' pl-11' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black ${statusChip}`}>
                        {detentionStatusLabel(endReached, closed)}
                    </span>
                    {decision.requestOutcomeStatus ? (
                        <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black whitespace-normal break-words ${lawyerRequestOutcomeBadgeClass(decision.requestOutcomeStatus)}`}
                        >
                            {decision.requestOutcomeStatus === 'approved' ? 'موافقة' : 'رفض'}
                        </span>
                    ) : null}
                    {showAppealButton ? (
                        <span
                            className="inline-flex items-center gap-1 rounded-md border border-[#E6C673]/55 bg-[#E6C673]/10 px-2 py-0.5 text-[10px] font-black text-[#E6C673] whitespace-normal break-words"
                            title="قرار قابل للطعن التمييزي"
                        >
                            <Scale className="w-3.5 h-3.5" aria-hidden />
                            <span>قابل للتمييز</span>
                        </span>
                    ) : null}
                    {concludedAppealShortLabel ? (
                        <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black whitespace-normal break-words ${cassationResultMarkClass(concludedAppealResult)}`}
                            title={concludedAppealTooltip}
                        >
                            <Scale className="w-3.5 h-3.5" aria-hidden />
                            <span>{concludedAppealShortLabel}</span>
                        </span>
                    ) : null}
                    <LedgerDate value={decision.issuedAt} />
                </div>
                <div className="text-white font-black text-sm whitespace-normal break-words">
                    {isDetentionDecisionTemplate(decision.proceduralTemplate ?? decision.title)
                        ? 'قرار توقيف المتهم'
                        : decision.title}
                </div>
            </div>

            {/* Body — الاسم + المادة + شَبكة بدء/انتهاء */}
            <div className="mt-3 space-y-2">
                {(partyRow || article) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
                        {partyRow ? (
                            <div className="min-w-0 text-white/95 text-[12px] font-black whitespace-normal break-words">
                                <span className="text-white/45 me-1">{partyRow.label}:</span>
                                <span>{partyRow.value}</span>
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

                <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white/45 mb-0.5">
                            <CalendarClock className="w-3.5 h-3.5" aria-hidden />
                            <span>تاريخ البدء</span>
                        </div>
                        <ModalIsoDate value={startDate} className="text-white text-[12px] font-black" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white/45 mb-0.5">
                            <CalendarClock className="w-3.5 h-3.5" aria-hidden />
                            <span>تاريخ الانتهاء</span>
                        </div>
                        <ModalIsoDate value={endDate} className="text-white text-[12px] font-black" />
                    </div>
                </div>
            </div>

            <DecisionInterventionCassationPanel
                decision={decision}
                partyLabel={partyLabel}
                readOnly={readOnly}
                onRecordResult={onResult}
            />
            <DecisionCassationAppealsPanel decision={decision} partyLabel={partyLabel} />

            {/* Footer — أزرار التنفيذ / الطعن — مَفصول بـ border-top رَفيع */}
            {(showActionBar || showRecordResult || !readOnly) ? (
                <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                    {showActionBar ? (
                        <div
                            className="flex flex-wrap items-center gap-2"
                            role="toolbar"
                            aria-label="توثيق مجريات التوقيف"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setExtendError('');
                                    setExtendEndDraft('');
                                    setExtendOpen((v) => !v);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/45 bg-amber-500/15 px-3 py-1.5 text-[11px] font-black text-amber-50 hover:bg-amber-500/25 transition whitespace-normal break-words"
                            >
                                <CalendarClock className="w-4 h-4" aria-hidden />
                                <span>تسجيل قرار تمديد</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onDocumentRelease(decision)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/45 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-black text-emerald-50 hover:bg-emerald-500/25 transition whitespace-normal break-words"
                            >
                                <Unlock className="w-4 h-4" aria-hidden />
                                <span>تسجيل إطلاق سراح</span>
                            </button>
                            {isDefendantLawyer ? (
                                <button
                                    type="button"
                                    onClick={() => onQuickBailRelease(decision)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-black text-cyan-50 hover:bg-cyan-500/25 transition whitespace-normal break-words"
                                >
                                    <ShieldOff className="w-4 h-4" aria-hidden />
                                    <span>تقديم طلب كفالة</span>
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {!readOnly ? (
                        <DecisionCardAppealFooter
                            decision={decision}
                            caseStage={caseStage}
                            crimeTypeLabel={crimeTypeLabel}
                            readOnly={readOnly}
                            userRole={userRole}
                            onCassationAppeal={onAppeal}
                            onInterventionCassation={onInterventionCassation}
                            onCassationCorrection={onCassationCorrection}
                            onDeclareJudgmentFinal={onDeclareJudgmentFinal}
                            onRecordAppealResult={
                                showRecordResult && pendingAppeal ? () => onResult(pendingAppeal) : undefined
                            }
                        />
                    ) : null}
                </div>
            ) : null}

            {/* لوحة تَوسيع التَوقيف — تَفتح من زِرّ التمديد */}
            {showActionBar && extendOpen ? (
                <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 space-y-2">
                    <label className="block text-[11px] font-bold text-amber-100 whitespace-normal break-words">
                        تاريخ انتهاء التوقيف الجديد (YYYY-MM-DD)
                    </label>
                    <ModalIsoDateInput
                        value={extendEndDraft}
                        onChange={(v) => {
                            setExtendEndDraft(v);
                            setExtendError('');
                        }}
                        min={endDate || startDate || undefined}
                    />
                    {extendError ? (
                        <p className="text-[10px] font-bold text-red-300 whitespace-normal break-words">
                            {extendError}
                        </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={submitExtend}
                            className="rounded-lg bg-amber-500/90 text-[#0B1021] px-3 py-1.5 text-[11px] font-black hover:brightness-110 transition"
                        >
                            حفظ على هذه البطاقة
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setExtendOpen(false);
                                setExtendError('');
                            }}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-black text-white/70 hover:bg-white/[0.04] transition"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
