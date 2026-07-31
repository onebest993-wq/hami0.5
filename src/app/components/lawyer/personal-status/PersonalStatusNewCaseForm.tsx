import React, { useMemo, useState } from 'react';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
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
import { personalFieldClass, PERSONAL_STATUS_FIELD } from './personalStatusVisualTheme';

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
        firstHearingDate: string;
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
            firstHearingDate: string;
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
        <div className="pb-6">
            <PersonalFormStepRail active={step} onChange={setStep} completion={completion} />

            {step === 'identity' ? (
                <div>
                    <PersonalSectionShell title="هوية الدعوى">
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
                        <div className="mt-4">
                            <label className="text-[10px] text-white/55 mb-1.5 block">تاريخ أول مرافعة</label>
                            <HamiDateInput
                                value={caseDetails.firstHearingDate}
                                onValueChange={(v) => setCaseDetails((p) => ({ ...p, firstHearingDate: v }))}
                                className={PERSONAL_STATUS_FIELD}
                                placeholder="اختر التاريخ من التقويم"
                            />
                        </div>
                    </PersonalSectionShell>

                    <PersonalSectionShell title="المرحلة والقانون">
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
                                    <label className="text-[10px] text-[#E6C673]/88 font-bold mb-1.5 block">
                                        {getPersonalUnderlyingStageFieldLabel(caseDetails.stage)}
                                    </label>
                                    <select
                                        ref={retrialTargetRef}
                                        value={caseDetails.retrialTargetStage ?? ''}
                                        onChange={(e) =>
                                            setCaseDetails((p) => ({ ...p, retrialTargetStage: e.target.value }))
                                        }
                                        className={`${personalFieldClass(Boolean(errorMap.retrialTargetStage))} appearance-none`}
                                    >
                                        <option value="" disabled>
                                            اختر المرحلة...
                                        </option>
                                        {underlyingOptions.map((opt) => (
                                            <option key={opt} value={opt} className="bg-[#0B1021]">
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
                </div>
            ) : null}

            {step === 'parties' ? (
                <div>
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
                </div>
            ) : null}
        </div>
    );
}
