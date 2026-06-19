import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HeartHandshake } from 'lucide-react';
import {
    PERSONAL_APPLICABLE_LAW_OPTIONS,
    type PersonalApplicableLaw,
    computePersonalStatusStageOptions,
    getPersonalUnderlyingStageFieldLabel,
    getPersonalUnderlyingStageOptions,
    isPersonalFormExtraordinaryStage,
} from './personalStatusValidation';
import {
    PersonalFloatingField,
    PersonalFormStepRail,
    PersonalLawSelector,
    PersonalSectionShell,
    PersonalStagePillRail,
    type PersonalFormStep,
} from './PersonalStatusFormPrimitives';
import { PersonalStatusPartiesPanel } from './PersonalStatusPartiesPanel';
import { PersonalStatusThirdPartiesPanel } from './PersonalStatusThirdPartiesPanel';
import type { Party, ThirdParty } from '../LawyerNewCase/types';
import { personalFieldClass } from './personalStatusVisualTheme';

const LAW_CARD_OPTIONS = PERSONAL_APPLICABLE_LAW_OPTIONS.map(({ id, label }) => ({
    id,
    label,
    subtitle: id === 'law_188_1959' ? 'المسلمون — قانون مدني أحوال' : 'تطبيق المدونة الجعفرية',
}));

export interface PersonalStatusNewCaseFormProps {
    caseDetails: {
        number: string;
        court: string;
        type: string;
        judge: string;
        stage: string;
        retrialTargetStage?: string;
    };
    applicableLaw: PersonalApplicableLaw | '';
    setApplicableLaw: React.Dispatch<React.SetStateAction<PersonalApplicableLaw | ''>>;
    setCaseDetails: React.Dispatch<
        React.SetStateAction<{
            number: string;
            court: string;
            type: string;
            judge: string;
            stage: string;
            claimValue: string;
            totalAgreedFees: string;
            retrialTargetStage?: string;
        }>
    >;
    parties1: Party[];
    parties2: Party[];
    thirdParties: ThirdParty[];
    onUpdateParty: (side: 1 | 2, id: string, field: keyof Party, value: string | boolean) => void;
    onRemoveParty: (side: 1 | 2, id: string) => void;
    onAddParty: (side: 1 | 2) => void;
    onAddThirdParty: () => void;
    onRemoveThirdParty: (id: number) => void;
    onUpdateThirdParty: (id: number, field: keyof ThirdParty, value: string | boolean | number) => void;
    errorMap: Record<string, string>;
    caseNumberError: string | null;
    courtRef: React.RefObject<HTMLInputElement | null>;
    typeRef: React.RefObject<HTMLInputElement | null>;
    stageRef: React.RefObject<HTMLSelectElement | null>;
    numberRef: React.RefObject<HTMLInputElement | null>;
    retrialTargetRef?: React.RefObject<HTMLSelectElement | null>;
}

export function PersonalStatusNewCaseForm(props: PersonalStatusNewCaseFormProps) {
    const {
        caseDetails,
        applicableLaw,
        setApplicableLaw,
        setCaseDetails,
        parties1,
        parties2,
        thirdParties,
        onUpdateParty,
        onRemoveParty,
        onAddParty,
        onAddThirdParty,
        onRemoveThirdParty,
        onUpdateThirdParty,
        errorMap,
        caseNumberError,
        courtRef,
        typeRef,
        stageRef,
        numberRef,
        retrialTargetRef,
    } = props;

    const [step, setStep] = useState<PersonalFormStep>('identity');
    const stageOptions = computePersonalStatusStageOptions(caseDetails.court);
    const isExtraordinary = isPersonalFormExtraordinaryStage(caseDetails.stage);
    const underlyingOptions = getPersonalUnderlyingStageOptions(caseDetails.stage);

    const completion = useMemo<Record<PersonalFormStep, boolean>>(
        () => ({
            identity: Boolean(
                caseDetails.number.trim()
                && caseDetails.court.trim()
                && caseDetails.type.trim()
                && caseDetails.stage.trim()
                && (isExtraordinary ? caseDetails.retrialTargetStage?.trim() : applicableLaw),
            ),
            parties: parties1.some((p) => p.name.trim()) && parties2.some((p) => p.name.trim()),
        }),
        [caseDetails, applicableLaw, isExtraordinary, parties1, parties2],
    );

    return (
        <div className="pb-8">
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-3 rounded-[1.75rem] border border-violet-300/15 bg-gradient-to-l from-violet-500/10 via-[#140f1a] to-teal-500/8 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-400/25 to-teal-400/15 border border-white/10 flex items-center justify-center shrink-0">
                        <HeartHandshake size={20} className="text-violet-100/90" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <h2 className="text-sm font-black text-white/95 truncate">تأسيس دعوى الأحوال الشخصية</h2>
                    </div>
                </div>
            </div>

            <PersonalFormStepRail active={step} onChange={setStep} completion={completion} />

            <AnimatePresence mode="wait">
                {step === 'identity' ? (
                    <motion.div key="identity" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                        <PersonalSectionShell title="هوية الدعوى" accent="violet">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <PersonalFloatingField
                                    label="رقم الدعوى"
                                    value={caseDetails.number}
                                    onChange={(v) => setCaseDetails((p) => ({ ...p, number: v }))}
                                    placeholder="15/ش/2026"
                                    inputRef={numberRef}
                                    error={caseNumberError ?? errorMap.number}
                                    dir="ltr"
                                    mono
                                />
                                <PersonalFloatingField
                                    label="محكمة الأحوال الشخصية"
                                    value={caseDetails.court}
                                    onChange={(v) => setCaseDetails((p) => ({ ...p, court: v }))}
                                    inputRef={courtRef}
                                    error={errorMap.court}
                                    placeholder="اسم المحكمة..."
                                />
                            </div>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <PersonalFloatingField
                                    label="نوع الدعوى"
                                    value={caseDetails.type}
                                    onChange={(v) => setCaseDetails((p) => ({ ...p, type: v }))}
                                    inputRef={typeRef}
                                    error={errorMap.type}
                                    placeholder="طلاق، نفقة، حضانة..."
                                />
                                <PersonalFloatingField
                                    label="اسم القاضي (اختياري)"
                                    value={caseDetails.judge}
                                    onChange={(v) => setCaseDetails((p) => ({ ...p, judge: v }))}
                                />
                            </div>
                        </PersonalSectionShell>

                        <PersonalSectionShell title="المرحلة والقانون" accent="fuchsia">
                            <PersonalStagePillRail
                                options={stageOptions}
                                value={caseDetails.stage}
                                onChange={(v) =>
                                    setCaseDetails((p) => ({ ...p, stage: v, retrialTargetStage: '' }))
                                }
                                inputRef={stageRef}
                                error={errorMap.stage}
                            />

                            <div className="mt-5">
                                {isExtraordinary ? (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-fuchsia-200/80">
                                            {getPersonalUnderlyingStageFieldLabel(caseDetails.stage)}
                                        </label>
                                        <select
                                            ref={retrialTargetRef}
                                            value={caseDetails.retrialTargetStage ?? ''}
                                            onChange={(e) =>
                                                setCaseDetails((p) => ({ ...p, retrialTargetStage: e.target.value }))
                                            }
                                            className={`${personalFieldClass(Boolean(errorMap.retrialTargetStage))} appearance-none rounded-2xl`}
                                        >
                                            <option value="" disabled>
                                                اختر المرحلة...
                                            </option>
                                            {underlyingOptions.map((opt) => (
                                                <option key={opt} value={opt} className="bg-[#1A1018]">
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                        {errorMap.retrialTargetStage ? (
                                            <p className="text-[10px] text-amber-400/90">{errorMap.retrialTargetStage}</p>
                                        ) : null}
                                    </div>
                                ) : (
                                    <PersonalLawSelector
                                        value={applicableLaw}
                                        onChange={(id) => setApplicableLaw(id as PersonalApplicableLaw)}
                                        options={LAW_CARD_OPTIONS}
                                        error={errorMap.applicableLaw}
                                    />
                                )}
                            </div>
                        </PersonalSectionShell>
                    </motion.div>
                ) : null}

                {step === 'parties' ? (
                    <motion.div key="parties" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                        <PersonalStatusPartiesPanel
                            stage={caseDetails.stage || 'أحوال شخصية'}
                            parties1={parties1}
                            parties2={parties2}
                            onUpdate={onUpdateParty}
                            onRemove={onRemoveParty}
                            onAdd={onAddParty}
                            errorMap={errorMap}
                            clientError={errorMap.lawyer_client}
                        />
                        <PersonalStatusThirdPartiesPanel
                            thirdParties={thirdParties}
                            onAdd={onAddThirdParty}
                            onRemove={onRemoveThirdParty}
                            onUpdate={onUpdateThirdParty}
                        />
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
