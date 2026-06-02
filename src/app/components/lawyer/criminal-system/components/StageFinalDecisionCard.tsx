import React, { useMemo, useState } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import {
    formatPenaltyDisplay,
    resolvePenaltiesSupplementary,
    resolveStageFinalDecisionActions,
    resolveStageFinalDecisionBadge,
    stageFinalDecisionKindLabel,
    type StageFinalDecisionBadgeTone,
    type StageFinalDecisionUserRole,
} from '../stageFinalDecisionEngine';
import {
    verdictCardShellClass,
    verdictOutcomeLabel,
    type VerdictCard,
    type VerdictCorrectionAppealTrack,
    type VerdictOrdinaryAppealTrack,
} from '../verdictCardsEngine';
import { ModalIsoDate } from './ModalIsoDate';
import { ModalIsoDateInput } from './ModalIsoDateInput';
import {
    VerdictCassationCorrectionModal,
    VerdictCassationResultModal,
} from './VerdictCassationModals';
import type { VerdictCassationResultSaveInput } from '../verdictCassationResultEngine';

export type StageFinalDecisionCardProps = {
    card: VerdictCard;
    caseStage: CaseStage;
    defendantName?: string;
    currentAccusationArticle?: string;
    crimeType?: string;
    readOnly?: boolean;
    userRole?: StageFinalDecisionUserRole;
    onUpdateDraft: (draft: string) => void;
    onSaveOrdinaryAppeal: (patch: Partial<VerdictOrdinaryAppealTrack>) => void;
    onSaveVerdictCassationResult: (input: VerdictCassationResultSaveInput) => string | null | void;
    onSaveCorrectionAppeal: (patch: Partial<VerdictCorrectionAppealTrack>) => void;
    onRecordAbsentiaPublication: (publicationDate: string) => void;
    onRecordAbsentiaObjection: () => void;
    /** يفتح مودال تسجيل الطعن الموحّد في VerdictCardsPanel. */
    onOpenCassationFiling?: () => void;
};

const badgeClassForTone = (tone: StageFinalDecisionBadgeTone): string => {
    if (tone === 'final_green') return 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100';
    if (tone === 'countdown_orange') return 'border-amber-500/45 bg-amber-950/25 text-amber-100';
    if (tone === 'absentee_gray') return 'border-slate-500/40 bg-slate-800/50 text-slate-200';
    if (tone === 'absentee_objection') return 'border-sky-500/40 bg-sky-950/25 text-sky-100';
    if (tone === 'cassation_review') return 'border-sky-500/50 bg-sky-950/35 text-sky-100';
    if (tone === 'cassation_result') return 'border-violet-500/40 bg-violet-950/30 text-violet-100';
    return 'border-white/15 bg-white/5 text-white/80';
};

export const StageFinalDecisionCard = ({
    card,
    caseStage,
    defendantName,
    currentAccusationArticle,
    crimeType,
    readOnly,
    userRole,
    onUpdateDraft,
    onSaveOrdinaryAppeal,
    onSaveVerdictCassationResult,
    onSaveCorrectionAppeal,
    onRecordAbsentiaPublication,
    onRecordAbsentiaObjection,
    onOpenCassationFiling,
}: StageFinalDecisionCardProps) => {
    const [draftValue, setDraftValue] = useState(card.decisionDraft ?? '');
    const [showDraftSection, setShowDraftSection] = useState(() =>
        Boolean(String(card.decisionDraft ?? '').trim()),
    );
    const [pubDateDraft, setPubDateDraft] = useState('');
    const [showPubForm, setShowPubForm] = useState(false);
    const [resultModalOpen, setResultModalOpen] = useState(false);
    const [correctionModalOpen, setCorrectionModalOpen] = useState(false);

    const badge = useMemo(() => resolveStageFinalDecisionBadge(card), [card]);
    const actions = useMemo(
        () => resolveStageFinalDecisionActions(card, { readOnly, userRole, caseStage }),
        [card, readOnly, userRole, caseStage],
    );
    const penaltyLine = formatPenaltyDisplay(card.penalty);
    const supplementaryLine = resolvePenaltiesSupplementary(card.penalty);
    const kindLabel =
        card.decisionProcedurePath === 'summary'
            ? 'أمر جزائي / عقوبة موجزة'
            : stageFinalDecisionKindLabel(card.finalDecisionKind);
    const bindingDirections = String(card.ordinaryAppeal?.bindingDirections ?? '').trim();

    const showStatusBadge = badge.tone !== 'countdown_orange';

    return (
        <>
            <div className={`flex-1 rounded-xl border p-3.5 ${verdictCardShellClass(card.outcome)}`}>
                <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="space-y-2 min-w-0 flex-1">
                    {defendantName ? (
                        <div className="text-[#E6C673]/90 text-xs font-black whitespace-normal break-words">
                            المتهم: {defendantName}
                        </div>
                    ) : null}
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        {verdictOutcomeLabel(card.outcome)}
                        {kindLabel !== '—' ? (
                            <span className="text-white/50 font-bold text-xs mr-2">· {kindLabel}</span>
                        ) : null}
                    </div>
                    <div className="text-white/65 text-xs font-bold">
                        تاريخ الحكم:{' '}
                        <span dir="ltr" className="unicode-bidi-plaintext tabular-nums text-white/80">
                            <ModalIsoDate value={card.issuedAt} />
                        </span>
                        {card.presenceType ? (
                            <span className="mr-2"> · {card.presenceType === 'غيابي' ? 'غيابي' : 'وجاهي'}</span>
                        ) : null}
                    </div>
                    {penaltyLine ? (
                        <div className="text-[#E6C673]/85 text-xs font-bold whitespace-normal break-words">
                            المحكومية: {penaltyLine}
                        </div>
                    ) : null}
                    {supplementaryLine ? (
                        <div className="text-white/70 text-xs font-bold whitespace-normal break-words">
                            عقوبات تبعية وتكميلية: {supplementaryLine}
                        </div>
                    ) : null}
                </div>
                {!readOnly && !showDraftSection ? (
                    <button
                        type="button"
                        className="shrink-0 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/75 hover:bg-white/[0.07] hover:text-white transition"
                        onClick={() => setShowDraftSection(true)}
                    >
                        إضافة فحوى القرار
                    </button>
                ) : null}
                </div>

                {showStatusBadge ? (
                    <span
                        className={`mt-2 inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black whitespace-normal break-words ${badgeClassForTone(badge.tone)}`}
                    >
                        {badge.label}
                    </span>
                ) : null}

                {bindingDirections ? (
                    <div className="mt-2 rounded-lg border border-violet-500/30 bg-violet-950/20 px-2.5 py-2 text-[11px] font-bold text-violet-100/90 whitespace-normal break-words">
                        توجيهات محكمة التمييز الملزمة: {bindingDirections}
                    </div>
                ) : null}

                {!readOnly ? (
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        {actions.showAbsentiaPublication ? (
                            showPubForm ? (
                                <div className="w-full flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                                    <div className="flex-1 min-w-[10rem]">
                                        <label className="block text-white/60 text-[10px] mb-1">تاريخ التبليغ بالنشر</label>
                                        <ModalIsoDateInput value={pubDateDraft} onChange={setPubDateDraft} />
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-lg px-3 py-2 text-xs font-black bg-sky-500/15 border border-sky-400/35 text-sky-100"
                                        onClick={() => {
                                            const d = pubDateDraft.trim();
                                            if (!d) return;
                                            onRecordAbsentiaPublication(d);
                                            setShowPubForm(false);
                                            setPubDateDraft('');
                                        }}
                                    >
                                        📅 حفظ التبليغ
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-white/60"
                                        onClick={() => setShowPubForm(false)}
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="rounded-xl border border-slate-400/35 bg-slate-800/40 px-3 py-2 text-xs font-black text-slate-100"
                                    onClick={() => setShowPubForm(true)}
                                >
                                    📅 تسجيل تاريخ التبليغ بالنشر
                                </button>
                            )
                        ) : null}

                        {actions.showAbsentiaObjection ? (
                            <button
                                type="button"
                                className="rounded-xl border border-sky-400/35 bg-sky-500/12 px-3 py-2 text-xs font-black text-sky-100"
                                onClick={onRecordAbsentiaObjection}
                            >
                                تسجيل اعتراض غيابي
                            </button>
                        ) : null}

                        {actions.showCassationAppeal ? (
                            <button
                                type="button"
                                className="rounded-xl border-2 border-[#E6C673]/55 bg-[#E6C673]/12 px-3 py-2 text-xs font-black text-[#E6C673]"
                                onClick={() => onOpenCassationFiling?.()}
                            >
                                تسجيل طعن تمييزي
                            </button>
                        ) : null}

                        {actions.showComplainantCassation ? (
                            <button
                                type="button"
                                className="rounded-xl border border-violet-400/35 bg-violet-500/12 px-3 py-2 text-xs font-black text-violet-100"
                                onClick={() => onOpenCassationFiling?.()}
                            >
                                تسجيل طعن تمييزي (مشتكي/ادعاء)
                            </button>
                        ) : null}

                        {actions.showRecordCassationResult ? (
                            <button
                                type="button"
                                className="rounded-xl border-2 border-sky-400/55 bg-sky-500/15 px-3 py-2 text-xs font-black text-sky-100"
                                onClick={() => setResultModalOpen(true)}
                            >
                                ⚖️ تسجيل قرار التمييز الوارد
                            </button>
                        ) : null}

                        {actions.showCassationCorrection ? (
                            <button
                                type="button"
                                className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-100"
                                onClick={() => setCorrectionModalOpen(true)}
                            >
                                طلب تصحيح القرار التمييزي
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {showDraftSection ? (
                    <div className="mt-3 space-y-2">
                        <label className="block text-white/60 text-xs font-bold whitespace-normal break-words">
                            فحوى القرار
                        </label>
                        <textarea
                            className="w-full min-h-[88px] bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/45 resize-y"
                            value={draftValue}
                            disabled={readOnly}
                            placeholder="نص اختياري لفحوى القرار أو ملاحظات التوثيق..."
                            onChange={(e) => setDraftValue(e.target.value)}
                            onBlur={() => {
                                if (draftValue !== (card.decisionDraft ?? '')) onUpdateDraft(draftValue);
                            }}
                        />
                        {!readOnly ? (
                            <button
                                type="button"
                                className="text-[10px] font-bold text-white/45 hover:text-white/70 transition"
                                onClick={() => {
                                    if (draftValue !== (card.decisionDraft ?? '')) onUpdateDraft(draftValue);
                                    setShowDraftSection(false);
                                }}
                            >
                                إخفاء
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <VerdictCassationResultModal
                open={resultModalOpen}
                card={resultModalOpen ? card : null}
                readOnly={readOnly}
                crimeType={crimeType}
                onClose={() => setResultModalOpen(false)}
                onSave={onSaveVerdictCassationResult}
            />
            <VerdictCassationCorrectionModal
                open={correctionModalOpen}
                card={correctionModalOpen ? card : null}
                readOnly={readOnly}
                onClose={() => setCorrectionModalOpen(false)}
                onSave={onSaveCorrectionAppeal}
            />
        </>
    );
};
