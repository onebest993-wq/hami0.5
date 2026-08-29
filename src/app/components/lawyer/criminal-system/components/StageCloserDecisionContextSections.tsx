import type { Dispatch, SetStateAction } from 'react';
import type { StageConclusion } from '../criminalStore';
import type { CriminalDefendant, SocialInquiryWorkflowStatus } from '../criminalCaseModel';
import { isPrivateRightWaiverDecisionValue } from '../criminalStageUtils';
import {
    isValidSocialInquiryWorkflowStatus,
    socialInquiryWorkflowLabel,
} from '../criminalStagePresentationCore';
import { isCassationClosureQuashDecision } from '../cassationEngine';
import {
    decisionRequiresDefendantScope,
    shouldShowDefendantDecisionScopePicker,
} from '../partyPersonalStage';
import { JUVENILE_SOCIAL_INQUIRY_ARTICLE_REF } from '../juvenileInvestigationRules';
import type { StageCloserDecisionType } from '../orchestrators/criminalOrchestratorSliceTypes';
import { ExpirationReasonFields } from './ExpirationReasonFields';
import { DefendantDecisionScopePicker } from './DefendantDecisionScopePicker';

export type StageCloserDecisionContextSectionsProps = {
    defendants: CriminalDefendant[];
    juvenileAccused: boolean;
    firstJuvenileDefendant: CriminalDefendant | null;
    firstJuvenileSocialWorkflow: SocialInquiryWorkflowStatus;
    patchSocialInquiryReport: (patch: {
        workflowStatus?: SocialInquiryWorkflowStatus;
        isAttached?: boolean;
        receivedDate?: string;
        investigatorName?: string;
        recommendations?: string;
    }) => void;
    closureDecisionType: StageCloserDecisionType;
    closureExpirationReason: StageConclusion['expirationReason'] | '';
    setClosureExpirationReason: Dispatch<SetStateAction<StageConclusion['expirationReason'] | ''>>;
    closureExpirationCustomDetail: string;
    setClosureExpirationCustomDetail: Dispatch<SetStateAction<string>>;
    closureExpirationDefendantIds: string[];
    setClosureExpirationDefendantIds: Dispatch<SetStateAction<string[]>>;
    closureScopedDefendantIds: string[];
    setClosureScopedDefendantIds: Dispatch<SetStateAction<string[]>>;
    closureSharedObjective269b: boolean;
    setClosureSharedObjective269b: Dispatch<SetStateAction<boolean>>;
    closurePunishmentType: 'death' | 'life' | 'other';
    setClosurePunishmentType: Dispatch<SetStateAction<'death' | 'life' | 'other'>>;
    closureJuvenileSeverDefendantId: string;
    setClosureJuvenileSeverDefendantId: Dispatch<SetStateAction<string>>;
};

export function StageCloserDecisionContextSections({
    defendants,
    juvenileAccused,
    firstJuvenileDefendant,
    firstJuvenileSocialWorkflow,
    patchSocialInquiryReport,
    closureDecisionType,
    closureExpirationReason,
    setClosureExpirationReason,
    closureExpirationCustomDetail,
    setClosureExpirationCustomDetail,
    closureExpirationDefendantIds,
    setClosureExpirationDefendantIds,
    closureScopedDefendantIds,
    setClosureScopedDefendantIds,
    closureSharedObjective269b,
    setClosureSharedObjective269b,
    closurePunishmentType,
    setClosurePunishmentType,
    closureJuvenileSeverDefendantId,
    setClosureJuvenileSeverDefendantId,
}: StageCloserDecisionContextSectionsProps) {
    return (
        <>
            {closureDecisionType &&
            !isPrivateRightWaiverDecisionValue(closureDecisionType) &&
            decisionRequiresDefendantScope(closureDecisionType) &&
            shouldShowDefendantDecisionScopePicker(defendants) &&
            closureDecisionType !== 'expiration' &&
            closureDecisionType !== 'juvenile_severance_referral' &&
            !(
                closureSharedObjective269b &&
                isCassationClosureQuashDecision(closureDecisionType)
            ) ? (
                <DefendantDecisionScopePicker
                    defendants={defendants}
                    selectedIds={closureScopedDefendantIds}
                    onChange={setClosureScopedDefendantIds}
                />
            ) : null}

            {isCassationClosureQuashDecision(closureDecisionType) ? (
                <label className="flex items-center justify-between gap-3 rounded-xl border border-violet-500/40 bg-violet-950/30 px-3 py-2.5 cursor-pointer">
                    <span className="text-[11px] font-bold text-white/85 whitespace-normal break-words">
                        هل أسباب النقض موضوعية مشتركة يستفيد منها بقية المتهمين؟ (المادة 269/ب أصولية)
                    </span>
                    <input
                        type="checkbox"
                        checked={closureSharedObjective269b}
                        onChange={(e) => setClosureSharedObjective269b(e.target.checked)}
                        className="h-5 w-5 accent-[#E6C673]"
                    />
                </label>
            ) : null}

            {juvenileAccused && firstJuvenileDefendant ? (
                <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        موقف تقرير الباحث الاجتماعي {JUVENILE_SOCIAL_INQUIRY_ARTICLE_REF}
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            حالة التقرير
                        </label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={firstJuvenileSocialWorkflow}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (!isValidSocialInquiryWorkflowStatus(v)) return;
                                patchSocialInquiryReport({
                                    workflowStatus: v,
                                    isAttached: v === 'submitted',
                                });
                            }}
                        >
                            <option value="not_requested" className="bg-slate-900 text-white">
                                {socialInquiryWorkflowLabel('not_requested')}
                            </option>
                            <option value="under_preparation" className="bg-slate-900 text-white">
                                {socialInquiryWorkflowLabel('under_preparation')}
                            </option>
                            <option value="submitted" className="bg-slate-900 text-white">
                                {socialInquiryWorkflowLabel('submitted')}
                            </option>
                        </select>
                    </div>
                    {firstJuvenileSocialWorkflow === 'submitted' ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        تاريخ ورود التقرير
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={String(firstJuvenileDefendant?.socialInquiryReport?.receivedDate ?? '')}
                                        onChange={(e) => patchSocialInquiryReport({ receivedDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        اسم الباحث الاجتماعي
                                    </label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={String(firstJuvenileDefendant?.socialInquiryReport?.investigatorName ?? '')}
                                        onChange={(e) => patchSocialInquiryReport({ investigatorName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    توصيات التقرير
                                </label>
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[90px] resize-none"
                                    value={String(firstJuvenileDefendant?.socialInquiryReport?.recommendations ?? '')}
                                    onChange={(e) => patchSocialInquiryReport({ recommendations: e.target.value })}
                                />
                            </div>
                        </>
                    ) : null}
                </div>
            ) : null}

            {closureDecisionType === 'expiration' ? (
                <div className="rounded-xl border border-slate-700/80 bg-slate-800/20 p-2.5 space-y-2">
                    <ExpirationReasonFields
                        reason={closureExpirationReason}
                        customDetail={closureExpirationCustomDetail}
                        onReasonChange={setClosureExpirationReason}
                        onCustomDetailChange={setClosureExpirationCustomDetail}
                        compact
                    />

                    <div>
                        <label className="block text-[#A0AEC0] text-[10px] font-light mb-1 whitespace-normal break-words">
                            المتهم المعني بالانقضاء
                        </label>
                        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2">
                            {defendants.length ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {defendants.map((d) => {
                                        const label = d.fullName.trim() || '—';
                                        const checked = closureExpirationDefendantIds.includes(d.id);
                                        return (
                                            <label
                                                key={d.id}
                                                className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/30 px-2 py-1.5 text-xs font-medium text-white/80"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-3.5 w-3.5 accent-[#E6C673]"
                                                    checked={checked}
                                                    onChange={() =>
                                                        setClosureExpirationDefendantIds((prev) =>
                                                            prev.includes(d.id)
                                                                ? prev.filter((x) => x !== d.id)
                                                                : [...prev, d.id],
                                                        )
                                                    }
                                                />
                                                <span className="whitespace-normal break-words">{label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-white/60 text-xs whitespace-normal break-words">—</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}

            {closureDecisionType === 'conviction' ? (
                <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            نوع العقوبة
                        </label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={closurePunishmentType}
                            onChange={(e) => {
                                const v = e.target.value;
                                setClosurePunishmentType(v === 'death' || v === 'life' || v === 'other' ? v : 'other');
                            }}
                        >
                            <option value="death" className="bg-slate-900 text-white">
                                إعدام
                            </option>
                            <option value="life" className="bg-slate-900 text-white">
                                سجن مؤبد
                            </option>
                            <option value="other" className="bg-slate-900 text-white">
                                عقوبات أخرى
                            </option>
                        </select>
                    </div>
                </div>
            ) : null}

            {closureDecisionType === 'juvenile_severance_referral' ? (
                <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            المتهم الحدث المراد تفريق دعواه (إجباري)
                        </label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={closureJuvenileSeverDefendantId}
                            onChange={(e) => setClosureJuvenileSeverDefendantId(e.target.value)}
                        >
                            <option value="" className="bg-slate-900 text-white">
                                اختر...
                            </option>
                            {defendants
                                .filter((d) => Boolean(d.isJuvenile))
                                .map((d) => (
                                    <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                                        {String(d.fullName ?? '').trim() || '—'}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>
            ) : null}
        </>
    );
}
