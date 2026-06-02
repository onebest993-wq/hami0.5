import React, { useMemo, useState } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import {
    expandVerdictCardsForDisplay,
    verdictCardShellClass,
    verdictOutcomeEmoji,
    verdictOutcomeLabel,
    type VerdictCard,
    type VerdictCardDisplayRow,
    type VerdictCorrectionAppealTrack,
    type VerdictInterventionAppealTrack,
    type VerdictOrdinaryAppealTrack,
} from '../verdictCardsEngine';
import type { CriminalDefendant } from '../criminalStore';
import { resolveDefendantFullName } from '../criminalUnknownDefendant';
import { ModalIsoDate } from './ModalIsoDate';
import {
    VerdictCassationCorrectionModal,
    VerdictCassationResultModal,
} from './VerdictCassationModals';
import { StageFinalDecisionCard } from './StageFinalDecisionCard';
import {
    resolveStageFinalDecisionActions,
    type StageFinalDecisionUserRole,
} from '../stageFinalDecisionEngine';
import {
    formatVerdictCassationResultLabel,
    isVerdictCassationUnderReview,
} from '../verdictCardsEngine';
import type { VerdictCassationResultSaveInput } from '../verdictCassationResultEngine';

export type VerdictCardsPanelProps = {
    cards: VerdictCard[];
    defendants?: CriminalDefendant[];
    caseStage: CaseStage;
    currentAccusationArticle?: string;
    crimeType?: string;
    readOnly?: boolean;
    userRole?: StageFinalDecisionUserRole;
    sendToCassation?: {
        label: string;
        urgent?: boolean;
        onClick: () => void;
    };
    onUpdateDraft: (cardId: string, draft: string) => void;
    onSaveOrdinaryAppeal: (cardId: string, patch: Partial<VerdictOrdinaryAppealTrack>) => void;
    onSaveVerdictCassationResult: (cardId: string, input: VerdictCassationResultSaveInput) => string | null | void;
    onSaveCorrectionAppeal: (cardId: string, patch: Partial<VerdictCorrectionAppealTrack>) => void;
    onRecordAbsentiaPublication?: (cardId: string, publicationDate: string) => void;
    onRecordAbsentiaObjection?: (cardId: string) => void;
    onOpenCassationFiling?: (cardId: string) => void;
};

const interventionStatusLabel = (status: string | undefined): string => {
    const v = String(status ?? '').trim();
    if (v === 'accepted_quashed') return 'مقبول ومنقوض';
    if (v === 'rejected') return 'مردود';
    if (v === 'pending') return 'قيد الانتظار';
    return v || '—';
};

export const VerdictCardsPanel = ({
    cards,
    defendants = [],
    caseStage,
    currentAccusationArticle,
    crimeType,
    readOnly,
    userRole,
    sendToCassation,
    onUpdateDraft,
    onSaveOrdinaryAppeal,
    onSaveVerdictCassationResult,
    onSaveCorrectionAppeal,
    onRecordAbsentiaPublication,
    onRecordAbsentiaObjection,
    onOpenCassationFiling,
}: VerdictCardsPanelProps) => {
    const defendantNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const d of defendants) {
            const name = String(resolveDefendantFullName(d) ?? '').trim();
            if (name) map.set(d.id, name);
        }
        return map;
    }, [defendants]);

    const displayRows = useMemo(
        () =>
            expandVerdictCardsForDisplay(cards, (defendantId) => defendantNameById.get(defendantId) ?? '—'),
        [cards, defendantNameById],
    );

    const [resultCard, setResultCard] = useState<VerdictCardDisplayRow | null>(null);
    const [correctionCard, setCorrectionCard] = useState<VerdictCardDisplayRow | null>(null);
    const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});

    if (!displayRows.length) return null;

    return (
        <div className="space-y-4">
            <div className="text-white/85 font-black text-sm whitespace-normal break-words">
                بطاقات الأحكام والطعون
            </div>

            <ul className="space-y-4 list-none m-0 p-0">
                {displayRows.map((card) => {
                    const sourceCardId = card.sourceCardId;
                    if (card.finalDecisionKind) {
                        return (
                            <li key={card.id}>
                                <StageFinalDecisionCard
                                    card={card}
                                    defendantName={card.displayDefendantName}
                                    caseStage={caseStage}
                                    currentAccusationArticle={currentAccusationArticle}
                                    crimeType={crimeType}
                                    readOnly={readOnly}
                                    userRole={userRole}
                                    onUpdateDraft={(draft) => onUpdateDraft(sourceCardId, draft)}
                                    onSaveOrdinaryAppeal={(patch) => onSaveOrdinaryAppeal(sourceCardId, patch)}
                                    onSaveVerdictCassationResult={(input) =>
                                        onSaveVerdictCassationResult(sourceCardId, input)
                                    }
                                    onSaveCorrectionAppeal={(patch) => onSaveCorrectionAppeal(sourceCardId, patch)}
                                    onRecordAbsentiaPublication={(date) =>
                                        onRecordAbsentiaPublication?.(sourceCardId, date)
                                    }
                                    onRecordAbsentiaObjection={() => onRecordAbsentiaObjection?.(sourceCardId)}
                                    onOpenCassationFiling={() => onOpenCassationFiling?.(sourceCardId)}
                                />
                            </li>
                        );
                    }

                    const draftValue = draftEdits[sourceCardId] ?? card.decisionDraft ?? '';
                    const legacyActions = resolveStageFinalDecisionActions(card, {
                        readOnly,
                        userRole,
                        caseStage,
                    });
                    const hasOrdinary = Boolean(
                        card.ordinaryAppeal?.cassationDossierNumber ||
                            card.ordinaryAppeal?.filedAt ||
                            card.ordinaryAppeal?.result,
                    );
                    const underReview = isVerdictCassationUnderReview(card);
                    const showLegacyAppealButton =
                        legacyActions.showCassationAppeal || legacyActions.showComplainantCassation;

                    return (
                        <li key={card.id}>
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
                                <div
                                    className={`flex-1 rounded-2xl border-2 p-4 shadow-lg ${verdictCardShellClass(card.outcome)}`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="space-y-1 min-w-0">
                                            {card.displayDefendantName ? (
                                                <div className="text-[#E6C673]/90 text-xs font-black whitespace-normal break-words">
                                                    المتهم: {card.displayDefendantName}
                                                </div>
                                            ) : null}
                                            <div className="text-white font-black text-base whitespace-normal break-words">
                                                {verdictOutcomeEmoji(card.outcome)}{' '}
                                                {verdictOutcomeLabel(card.outcome)}
                                            </div>
                                            <div className="text-white/70 text-xs font-bold">
                                                تاريخ الحكم:{' '}
                                                <span dir="ltr" className="unicode-bidi-plaintext tabular-nums">
                                                    <ModalIsoDate value={card.issuedAt} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="block text-white/75 text-xs font-black mb-1 whitespace-normal break-words">
                                            فحوى ومسودة القرار{' '}
                                            <span className="text-white/40 font-bold">(اختياري)</span>
                                        </label>
                                        <textarea
                                            className="w-full min-h-[88px] bg-black/25 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/50 resize-y"
                                            value={draftValue}
                                            disabled={readOnly}
                                            placeholder="يمكنك حفظ البطاقة الآن وتدوين نص الحكم لاحقاً بعد طباعته من المحكمة..."
                                            onChange={(e) =>
                                                setDraftEdits((prev) => ({ ...prev, [sourceCardId]: e.target.value }))
                                            }
                                            onBlur={() => {
                                                const next = draftEdits[sourceCardId];
                                                if (next === undefined) return;
                                                if (next !== (card.decisionDraft ?? '')) {
                                                    onUpdateDraft(sourceCardId, next);
                                                }
                                            }}
                                        />
                                    </div>

                                    {hasOrdinary ? (
                                        <div className="mt-3 rounded-xl border border-sky-500/35 bg-sky-950/20 px-3 py-2 text-[11px] text-sky-100/90 space-y-1">
                                            <div className="font-black text-sky-200">
                                                {underReview ? '🔵 طعن تمييزي - قيد التدقيق' : 'تمييز اعتيادي'}
                                            </div>
                                            {card.ordinaryAppeal?.cassationDossierNumber ? (
                                                <div>أضبارة: {card.ordinaryAppeal.cassationDossierNumber}</div>
                                            ) : null}
                                            {card.ordinaryAppeal?.filedAt ? (
                                                <div dir="ltr" className="unicode-bidi-plaintext">
                                                    تقديم: {card.ordinaryAppeal.filedAt}
                                                </div>
                                            ) : null}
                                            {card.ordinaryAppeal?.result ? (
                                                <div>
                                                    النتيجة:{' '}
                                                    {formatVerdictCassationResultLabel(card.ordinaryAppeal.result)}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {(card.correctionAppeal?.correctionRequestNumber ||
                                        card.correctionAppeal?.targetedDecisionDescription ||
                                        card.correctionAppeal?.filedAt) ? (
                                        <div className="mt-3 rounded-xl border border-amber-500/35 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100/90 space-y-1">
                                            <div className="font-black text-amber-200">
                                                تصحيح قرار تمييزي — م 266
                                            </div>
                                            {card.correctionAppeal?.targetedDecisionDescription ? (
                                                <div className="whitespace-normal break-words">
                                                    {card.correctionAppeal.targetedDecisionDescription}
                                                </div>
                                            ) : null}
                                            {card.correctionAppeal?.correctionRequestNumber ? (
                                                <div>رقم الطلب: {card.correctionAppeal.correctionRequestNumber}</div>
                                            ) : null}
                                            {card.correctionAppeal?.filedAt ? (
                                                <div dir="ltr" className="unicode-bidi-plaintext">
                                                    تقديم: {card.correctionAppeal.filedAt}
                                                </div>
                                            ) : null}
                                            <div>
                                                الحالة:{' '}
                                                {interventionStatusLabel(card.correctionAppeal?.status)}
                                            </div>
                                        </div>
                                    ) : null}

                                    {(card.interventionAppeal?.interventionRequestNumber ||
                                        card.interventionAppeal?.targetedDecisionDescription ||
                                        card.interventionAppeal?.referredToAuthority) ? (
                                        <div className="mt-3 rounded-xl border border-violet-500/35 bg-violet-950/20 px-3 py-2 text-[11px] text-violet-100/90 space-y-1">
                                            <div className="font-black text-violet-200">
                                                تدخل تمييزي — م 264
                                            </div>
                                            {card.interventionAppeal?.targetedDecisionDescription ? (
                                                <div className="whitespace-normal break-words">
                                                    {card.interventionAppeal.targetedDecisionDescription}
                                                </div>
                                            ) : null}
                                            {card.interventionAppeal?.interventionRequestNumber ? (
                                                <div>رقم الطلب: {card.interventionAppeal.interventionRequestNumber}</div>
                                            ) : null}
                                            {card.interventionAppeal?.referredToAuthority ? (
                                                <div className="whitespace-normal break-words">
                                                    الجهة: {card.interventionAppeal.referredToAuthority}
                                                </div>
                                            ) : null}
                                            <div>
                                                الحالة:{' '}
                                                {interventionStatusLabel(card.interventionAppeal?.status)}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                {!readOnly ? (
                                    <div className="flex flex-col gap-2 shrink-0 self-start">
                                        {sendToCassation ? (
                                            <button
                                                type="button"
                                                onClick={sendToCassation.onClick}
                                                className={
                                                    sendToCassation.urgent
                                                        ? 'sm:w-[11.5rem] rounded-xl bg-red-500 text-white font-black px-4 py-3 text-sm hover:brightness-110 active:brightness-95 transition whitespace-normal break-words animate-pulse'
                                                        : 'sm:w-[11.5rem] rounded-xl bg-[#E6C673] text-[#0B1021] font-black px-4 py-3 text-sm hover:brightness-110 active:brightness-95 transition whitespace-normal break-words shadow-[0_0_16px_rgba(230,198,115,0.15)]'
                                                }
                                            >
                                                {sendToCassation.label}
                                            </button>
                                        ) : null}
                                        {showLegacyAppealButton ? (
                                            <button
                                                type="button"
                                                onClick={() => onOpenCassationFiling?.(sourceCardId)}
                                                className="sm:w-[11.5rem] rounded-xl border-2 border-[#E6C673]/55 bg-[#E6C673]/12 px-4 py-3 text-[#E6C673] font-black text-sm hover:bg-[#E6C673]/22 transition whitespace-normal break-words shadow-[0_0_16px_rgba(230,198,115,0.15)]"
                                            >
                                                تسجيل طعن تمييزي
                                            </button>
                                        ) : null}
                                        {legacyActions.showRecordCassationResult ? (
                                            <button
                                                type="button"
                                                onClick={() => setResultCard(card)}
                                                className="sm:w-[11.5rem] rounded-xl border-2 border-sky-400/55 bg-sky-500/15 px-4 py-3 text-sky-100 font-black text-sm hover:bg-sky-500/22 transition whitespace-normal break-words"
                                            >
                                                ⚖️ تسجيل قرار التمييز الوارد
                                            </button>
                                        ) : null}
                                        {legacyActions.showCassationCorrection ? (
                                            <button
                                                type="button"
                                                onClick={() => setCorrectionCard(card)}
                                                className="sm:w-[11.5rem] rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-100 font-black text-sm hover:bg-amber-500/18 transition whitespace-normal break-words"
                                            >
                                                طلب تصحيح القرار التمييزي
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </li>
                    );
                })}
            </ul>

            <VerdictCassationResultModal
                open={Boolean(resultCard)}
                card={resultCard}
                readOnly={readOnly}
                crimeType={crimeType}
                onClose={() => setResultCard(null)}
                onSave={(input) => {
                    if (!resultCard) return 'بطاقة الحكم غير موجودة.';
                    return onSaveVerdictCassationResult(resultCard.sourceCardId, input);
                }}
            />
            <VerdictCassationCorrectionModal
                open={Boolean(correctionCard)}
                card={correctionCard}
                readOnly={readOnly}
                onClose={() => setCorrectionCard(null)}
                onSave={(patch) => {
                    if (!correctionCard) return;
                    onSaveCorrectionAppeal(correctionCard.sourceCardId, patch);
                }}
            />
        </div>
    );
};
