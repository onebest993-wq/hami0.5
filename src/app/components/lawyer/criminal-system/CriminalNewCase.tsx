import React from 'react';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import { X } from '@/app/components/ui/icons/X';
import { CaseInfoSection } from './CriminalNewCase/CaseInfoSection';
import { ComplainantSection } from './CriminalNewCase/ComplainantSection';
import { CriminalNewCaseFooter } from './CriminalNewCase/CriminalNewCaseFooter';
import { DefendantSection } from './CriminalNewCase/DefendantSection';
import { SeveranceReasonBar } from './CriminalNewCase/SeveranceReasonBar';
import { useCriminalNewCaseForm } from './CriminalNewCase/useCriminalNewCaseForm';
import type { CriminalNewCaseProps } from './CriminalNewCase/types';

export type { CriminalNewCaseProps } from './CriminalNewCase/types';

export const CriminalNewCase = ({
    onCreated,
    onBack,
    onClose,
    severanceFormMode = false,
    embeddedOverlay = false,
}: CriminalNewCaseProps) => {
    const form = useCriminalNewCaseForm({ severanceFormMode, onCreated });

    return (
        <div
            className={
                embeddedOverlay ? 'h-full min-h-0 flex flex-col' : 'min-h-screen flex flex-col'
            }
        >
            <div className="sticky top-0 z-50 h-14 bg-[#1A1E2E] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                <button
                    type="button"
                    onClick={() => {
                        form.handleExitSeveranceForm();
                        onClose?.();
                    }}
                    className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center leading-tight">
                    <div className="text-white font-black text-[13px]">
                        {form.isSeveranceMode ? 'إنشاء إضبارة مفرّقة (شطر)' : 'إضبارة الدعوى الجزائية'}
                    </div>
                    <div className="text-white/60 font-bold text-[11px] mt-0.5">
                        {form.isSeveranceMode
                            ? 'مسار التفريق — تعبئة بيانات الإضبارة الجديدة'
                            : 'المحاكم الجنائية'}
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => {
                            form.handleExitSeveranceForm();
                            onBack?.();
                        }}
                        disabled={!onBack}
                        className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/60"
                    >
                        <ChevronRight size={20} className="rotate-180" />
                    </button>
                </div>
            </div>

            {form.isSeveranceMode ? (
                <SeveranceReasonBar
                    pendingSeveranceReason={form.pendingSeveranceReason}
                    pendingSeveranceReasonDetail={form.pendingSeveranceReasonDetail}
                    setPendingSeveranceReason={form.setPendingSeveranceReason}
                />
            ) : null}

            <div
                className={
                    embeddedOverlay
                        ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 pb-6 pt-4 space-y-4'
                        : 'px-4 pb-32 pt-4 space-y-4 flex-1'
                }
            >
                <ComplainantSection
                    complainantCardTitle={form.complainantCardTitle}
                    complainants={form.draft.complainants}
                    isPublicProsecutionComplainant={form.isPublicProsecutionComplainant}
                    stage={form.stage}
                    addComplainant={form.addComplainant}
                    deleteComplainant={form.deleteComplainant}
                    setComplainantField={form.setComplainantField}
                    setDraftPublicProsecutionComplainant={form.setDraftPublicProsecutionComplainant}
                    toggleDraftComplainantOfficeClient={form.toggleDraftComplainantOfficeClient}
                />

                <DefendantSection
                    defendantCardTitle={form.defendantCardTitle}
                    stage={form.stage}
                    investigationPartyMix={form.investigationPartyMix}
                    identifiedDefendantsForForm={form.identifiedDefendantsForForm}
                    unknownDefendants={form.unknownDefendants}
                    showUnknownDefendantOption={form.showUnknownDefendantOption}
                    primaryDefendantSlotId={form.primaryDefendantSlotId}
                    crimeType={form.draft.basics.crimeType}
                    showMutualComplaintOption={form.showMutualComplaintOption}
                    isMutualComplaint={form.draft.isMutualComplaint}
                    toggleDraftDefendantOfficeClient={form.toggleDraftDefendantOfficeClient}
                    toggleDraftDefendantIdentityUnknown={form.toggleDraftDefendantIdentityUnknown}
                    deleteDefendant={form.deleteDefendant}
                    setDefendantField={form.setDefendantField}
                    setDraftDefendantGuarantor={form.setDraftDefendantGuarantor}
                    addDefendant={form.addDefendant}
                    addUnknownDefendant={form.addUnknownDefendant}
                    setDraftMutualComplaint={form.setDraftMutualComplaint}
                />

                <CaseInfoSection
                    draft={form.draft}
                    stage={form.stage}
                    isSeveranceMode={form.isSeveranceMode}
                    severanceLockedStage={form.severanceLockedStage}
                    isJuvenileInvestigationStage={form.isJuvenileInvestigationStage}
                    isCassationStage={form.isCassationStage}
                    isReferralStage={form.isReferralStage}
                    isPublicProsecutionComplainant={form.isPublicProsecutionComplainant}
                    investigationPartyMix={form.investigationPartyMix}
                    newCaseStageOptions={form.newCaseStageOptions}
                    locksStageToInvestigation={form.locksStageToInvestigation}
                    allDefendantsUnknownOnly={form.allDefendantsUnknownOnly}
                    mixedUnknownWithIdentified={form.mixedUnknownWithIdentified}
                    ensureFirstDefendantJuvenile={form.ensureFirstDefendantJuvenile}
                    setBasicField={form.setBasicField}
                    setLocationField={form.setLocationField}
                    setDraftArticleIncludesPublicRight={form.setDraftArticleIncludesPublicRight}
                />
            </div>

            <CriminalNewCaseFooter
                embeddedOverlay={embeddedOverlay}
                isSaveBlocked={form.isSaveBlocked}
                isSeveranceMode={form.isSeveranceMode}
                onSubmit={form.handleSubmit}
            />
        </div>
    );
};
