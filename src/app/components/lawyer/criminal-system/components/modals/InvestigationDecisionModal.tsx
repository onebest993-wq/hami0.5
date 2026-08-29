import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    INVESTIGATION_REFERRAL_FELONY_LABEL,
    INVESTIGATION_REFERRAL_MISDEMEANOR_LABEL,
} from '@/app/types/criminal';
import type { CriminalComplainant, CriminalDefendant, StageConclusion } from '../../criminalStore';
import { MISDEMEANOR_TYPE_REFERRAL_OPTIONS, isMisdemeanorType, type MisdemeanorType } from '../../caseClassificationEngine';
import { resolveEffectiveDefendantScopeIds } from '../../partyPersonalStage';
import { investigationDossierHasMixedUnknownAndIdentified } from '../../criminalUnknownDefendant';
import {
    JUVENILE_TRIAL_COURT_NAME,
    selectedInvestigationDefendantsAllJuvenile,
    selectedInvestigationDefendantsIncludeJuvenile,
    type InvestigationReferralTargetStage,
} from '../../juvenileInvestigationRules';
import {
    investigationDecisionValidationError,
    isDefendantStatus,
} from './investigationDecisionModalValidation';
export {
    investigationDecisionValidationError,
    isDefendantStatus,
} from './investigationDecisionModalValidation';
import { InvestigationDecisionDefendantScopePicker } from './InvestigationDecisionDefendantScopePicker';

type DefendantStatus = StageConclusion['defendantStatusAtDecision'];

export type InvestigationDecisionModalProps = {
    open: boolean;
    onClose: () => void;
    error?: string;
    defendants: CriminalDefendant[];
    /**
     * ⚖️ شكوى متقابلة — قائمة المشتكين الذين يَحملون صفة المتهم (per-complainant flag
     * أو case-level `isMutualComplaint=true`). تُدمَج مع المتهمين في محدّد الإحالة.
     */
    crossAccusedComplainants?: CriminalComplainant[];
    activeLegalArticle?: string;
    publicProsecutionNumber?: string;
    onSubmitReferral: (payload: {
        targetCaseStage: InvestigationReferralTargetStage;
        courtName: string;
        courtCaseNumber: string;
        publicProsecutionNumber?: string;
        referralLegalArticle: string;
        decisionDate: string;
        decisionDetails: string;
        defendantStatusAtDecision: DefendantStatus;
        defendantIds: string[];
        defendantStatusesByDefendantId?: Record<string, DefendantStatus>;
        referralMisdemeanorType?: MisdemeanorType;
    }) => void;
};

/** مودال إحالة مرحلة التحقيق إلى محكمة الموضوع — غلق/انقضاء/صلح عبر «قرارات القاضي». */
export const InvestigationDecisionModal = ({
    open,
    onClose,
    error,
    defendants,
    crossAccusedComplainants = [],
    activeLegalArticle = '',
    publicProsecutionNumber = '',
    onSubmitReferral,
}: InvestigationDecisionModalProps) => {
    const accusedRoster = useMemo<CriminalDefendant[]>(() => {
        const adaptedComplainants: CriminalDefendant[] = crossAccusedComplainants.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            address: c.address ?? '',
            birthYear: '',
            status: (c.accusedStatus ?? '') as CriminalDefendant['status'],
            detentionAuthority: c.accusedDetentionAuthority ?? '',
            detentionExpiryDate: c.accusedDetentionExpiryDate ?? '',
            detentionHistoryLog: c.accusedDetentionHistoryLog ?? [],
            totalDetentionDays: c.accusedTotalDetentionDays ?? 0,
            guarantorDetails: c.accusedGuarantorDetails,
            isJuvenile: c.isJuvenile,
            birthDate: c.birthDate,
            guardianName: c.guardianName,
            guardianRelationship: c.guardianRelationship,
        }));
        return [...defendants, ...adaptedComplainants];
    }, [defendants, crossAccusedComplainants]);

    const [referralTarget, setReferralTarget] = useState<InvestigationReferralTargetStage | ''>('');
    const [misdemeanorType, setMisdemeanorType] = useState<MisdemeanorType | ''>('');
    const [courtName, setCourtName] = useState('');
    const [courtCaseNumber, setCourtCaseNumber] = useState('');
    const [localPublicProsecutionNumber, setLocalPublicProsecutionNumber] = useState('');
    const [decisionDate, setDecisionDate] = useState('');
    const [scopedDefendantIds, setScopedDefendantIds] = useState<string[]>([]);
    const [defendantStatuses, setDefendantStatuses] = useState<Record<string, DefendantStatus>>({});
    const [localError, setLocalError] = useState('');

    const accusedRosterRef = useRef(accusedRoster);
    const publicProsecutionNumberRef = useRef(publicProsecutionNumber);
    useEffect(() => {
        accusedRosterRef.current = accusedRoster;
    }, [accusedRoster]);
    useEffect(() => {
        publicProsecutionNumberRef.current = publicProsecutionNumber;
    }, [publicProsecutionNumber]);

    useEffect(() => {
        if (!open) return;
        const roster = accusedRosterRef.current;
        setLocalError('');
        setReferralTarget('');
        setMisdemeanorType('');
        setCourtName('');
        setCourtCaseNumber('');
        setLocalPublicProsecutionNumber(String(publicProsecutionNumberRef.current ?? '').trim());
        setDecisionDate(new Date().toISOString().slice(0, 10));
        setScopedDefendantIds(roster.map((d) => d.id));
        const initialStatuses: Record<string, DefendantStatus> = {};
        for (const d of roster) initialStatuses[d.id] = 'bailed';
        setDefendantStatuses(initialStatuses);
    }, [open]);

    const effectiveScopeIds = useMemo(
        () => resolveEffectiveDefendantScopeIds(accusedRoster, scopedDefendantIds),
        [accusedRoster, scopedDefendantIds],
    );
    const scopedAllJuvenile = useMemo(
        () => selectedInvestigationDefendantsAllJuvenile(accusedRoster, effectiveScopeIds),
        [accusedRoster, effectiveScopeIds],
    );
    const scopedIncludesJuvenile = useMemo(
        () => selectedInvestigationDefendantsIncludeJuvenile(accusedRoster, effectiveScopeIds),
        [accusedRoster, effectiveScopeIds],
    );
    const dossierMixesUnknownAndIdentified = useMemo(
        () => investigationDossierHasMixedUnknownAndIdentified(defendants),
        [defendants],
    );

    useEffect(() => {
        if (!open) return;
        if (scopedAllJuvenile && effectiveScopeIds.length) {
            setReferralTarget('juvenile');
            setCourtName(JUVENILE_TRIAL_COURT_NAME);
            setMisdemeanorType('');
            return;
        }
        if (!scopedIncludesJuvenile) {
            setReferralTarget((prev) => (prev === 'juvenile' ? '' : prev));
            setCourtName((prev) => (prev === JUVENILE_TRIAL_COURT_NAME ? '' : prev));
        }
    }, [open, scopedAllJuvenile, scopedIncludesJuvenile, effectiveScopeIds.length]);

    if (!open) return null;

    const submitBlocker = investigationDecisionValidationError({
        decisionDate,
        referralTarget,
        misdemeanorType,
        courtName,
        scopedDefendantIds,
        scopedAllJuvenile,
        scopedIncludesJuvenile,
        dossierMixesUnknownAndIdentified,
    });

    const displayedError = error || localError;

    const toggleDefendant = (id: string, next: boolean) => {
        setScopedDefendantIds((prev) =>
            next ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id),
        );
    };

    const setDefendantStatusFor = (id: string, status: DefendantStatus) => {
        setDefendantStatuses((prev) => (prev[id] === status ? prev : { ...prev, [id]: status }));
    };

    const buildScopedStatusMap = (effectiveIds: string[]): Record<string, DefendantStatus> | undefined => {
        if (!effectiveIds.length) return undefined;
        const map: Record<string, DefendantStatus> = {};
        for (const id of effectiveIds) {
            map[id] = defendantStatuses[id] ?? 'bailed';
        }
        return map;
    };

    const deriveGlobalStatus = (statusMap: Record<string, DefendantStatus> | undefined): DefendantStatus => {
        if (!statusMap) return 'bailed';
        const values = Object.values(statusMap);
        if (!values.length) return 'bailed';
        if (values.includes('detained')) return 'detained';
        if (values.includes('fugitive')) return 'fugitive';
        return 'bailed';
    };

    const handleSubmit = () => {
        const blocker = investigationDecisionValidationError({
            decisionDate,
            referralTarget,
            misdemeanorType,
            courtName,
            scopedDefendantIds,
            scopedAllJuvenile,
            scopedIncludesJuvenile,
            dossierMixesUnknownAndIdentified,
        });
        if (blocker) {
            setLocalError(blocker);
            return;
        }
        if (!referralTarget || !courtName.trim()) return;
        setLocalError('');

        const date = decisionDate.trim();
        const effectiveScopeIds = resolveEffectiveDefendantScopeIds(accusedRoster, scopedDefendantIds);
        const statusMap = buildScopedStatusMap(effectiveScopeIds);
        const globalStatus = deriveGlobalStatus(statusMap);

        onSubmitReferral({
            targetCaseStage: referralTarget,
            courtName: courtName.trim(),
            courtCaseNumber: courtCaseNumber.trim(),
            publicProsecutionNumber: localPublicProsecutionNumber.trim() || undefined,
            referralLegalArticle: String(activeLegalArticle ?? '').trim(),
            decisionDate: date,
            decisionDetails: '',
            defendantStatusAtDecision: globalStatus,
            defendantIds: effectiveScopeIds,
            defendantStatusesByDefendantId: statusMap,
            referralMisdemeanorType: isMisdemeanorType(misdemeanorType) ? misdemeanorType : undefined,
        });
    };

    return (
        <div
            className="fixed inset-0 z-[500] isolate bg-black/62 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="relative z-[501] w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        إحالة إلى محكمة الموضوع
                    </div>
                    <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] px-3 text-white/70 hover:text-white text-sm font-bold touch-manipulation">
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {displayedError ? (
                        <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-3 text-red-200 font-black text-sm whitespace-normal break-words">
                            {displayedError}
                        </div>
                    ) : null}

                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-3">
                        {!scopedAllJuvenile ? (
                            <div>
                                <label className="block text-white/70 text-xs mb-1">جهة الإحالة</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={referralTarget}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === 'felony' || v === 'misdemeanor') {
                                            setReferralTarget(v);
                                            setCourtName(v === 'felony' ? 'محكمة الجنايات' : 'محكمة الجنح');
                                            setMisdemeanorType('');
                                        } else {
                                            setReferralTarget('');
                                            setMisdemeanorType('');
                                        }
                                    }}
                                >
                                    <option value="">اختر...</option>
                                    <option value="misdemeanor">{INVESTIGATION_REFERRAL_MISDEMEANOR_LABEL}</option>
                                    <option value="felony">{INVESTIGATION_REFERRAL_FELONY_LABEL}</option>
                                </select>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white font-bold whitespace-normal break-words">
                                مسار إحالة الأحداث — {JUVENILE_TRIAL_COURT_NAME}
                            </div>
                        )}
                        {referralTarget === 'misdemeanor' ? (
                            <div>
                                <label className="block text-white/70 text-xs mb-1">نوع الدعوى *</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={misdemeanorType}
                                    onChange={(e) => setMisdemeanorType(e.target.value as MisdemeanorType | '')}
                                >
                                    <option value="">اختر نوع الدعوى...</option>
                                    {MISDEMEANOR_TYPE_REFERRAL_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}
                        <div>
                            <label className="block text-white/70 text-xs mb-1">اسم محكمة الموضوع</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 disabled:opacity-60"
                                value={courtName}
                                onChange={(e) => setCourtName(e.target.value)}
                                disabled={scopedAllJuvenile}
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs mb-1">رقم دعوى المحكمة (اختياري)</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={courtCaseNumber}
                                onChange={(e) => setCourtCaseNumber(e.target.value)}
                                placeholder="مثال: 123/ج/2026"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs mb-1">رقم الادعاء العام (اختياري)</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 placeholder:text-white/30"
                                value={localPublicProsecutionNumber}
                                onChange={(e) => setLocalPublicProsecutionNumber(e.target.value)}
                                placeholder="اختياري"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-white/70 text-xs mb-1">تاريخ صدور قرار الإحالة</label>
                        <input
                            type="date"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={decisionDate}
                            onChange={(e) => setDecisionDate(e.target.value)}
                        />
                    </div>

                    <InvestigationDecisionDefendantScopePicker
                        defendants={accusedRoster}
                        selectedIds={scopedDefendantIds}
                        onToggle={toggleDefendant}
                        statuses={defendantStatuses}
                        onStatusChange={setDefendantStatusFor}
                    />
                </div>

                <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-sm font-black text-white/80 touch-manipulation"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={Boolean(submitBlocker)}
                        className="min-h-[44px] px-4 rounded-lg bg-[#E6C673] text-[#0B1021] font-black text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                    >
                        تأكيد الإحالة
                    </button>
                </div>
            </div>
        </div>
    );
};

