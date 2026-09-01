import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from '@/app/components/ui/icons/Check';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
import { formatNumberInput } from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import { NC_FIELD, NC_LABEL, NC_SECTION, NC_SECTION_TITLE, ncFieldClass } from '../newCaseGlassTheme';
import { CaseFieldSelect } from './CaseFieldSelect';
import {
    getUnderlyingStageFieldLabel,
    getUnderlyingStageOptions,
    isExtraordinaryProcedureStage,
    isFixedFeeType,
} from '../validation';
import {
    computeNewCaseProgressiveReveal,
    hasFilledNewCaseText,
    hasLawsuitClaimValueBasis,
    INITIAL_NEW_CASE_UNLOCK,
    LOCKED_NEW_CASE_UNLOCK,
    type NewCaseFieldUnlock,
} from '../newCaseProgressiveReveal';
import { normalizeSavedLawsuitType } from '../savedLawsuitTypes';
import { useSavedLawsuitTypes } from '../useSavedLawsuitTypes';
import type { LawyerNewCaseDetails } from '../spawnInit';

const VALUE_MODE_OPTIONS = [
    { id: 'undetermined' as const, label: 'دعوى غير مقدرة القيمة' },
    { id: 'fixedFee' as const, label: 'دعوى خاضعة للرسم المقطوع' },
];

function isCommitEnter(event: React.KeyboardEvent): boolean {
    return event.key === 'Enter' && !event.nativeEvent.isComposing && !event.shiftKey;
}

type FocusTarget = 'type' | 'value' | 'stage' | 'court' | 'judge';

export interface CaseBasicsFormProps {
    caseDetails: LawyerNewCaseDetails;
    setCaseDetails: React.Dispatch<React.SetStateAction<LawyerNewCaseDetails>>;
    errorMap: Record<string, string>;
    caseNumberError: string | null;
    labels: { p1Main: string; p2Main: string; courtPlaceholder: string; typePlaceholder: string };
    stageOptions: string[];
    isUndeterminedValue: boolean;
    setIsUndeterminedValue: React.Dispatch<React.SetStateAction<boolean>>;
    isFixedFee: boolean;
    setIsFixedFee: React.Dispatch<React.SetStateAction<boolean>>;
    valuePlaceholder: string;
    exceptionWarning: string | null;
    courtRef: React.RefObject<HTMLInputElement | null>;
    typeRef: React.RefObject<HTMLInputElement | null>;
    stageRef: React.RefObject<HTMLButtonElement | null>;
    numberRef: React.RefObject<HTMLInputElement | null>;
    retrialTargetRef?: React.RefObject<HTMLButtonElement | null>;
    /** حقول موروثة من الإضبارة الأم — دعوى حادثة منضمة/متقابلة */
    lockParentFields?: boolean;
    onPartiesUnlockChange?: (unlocked: boolean) => void;
}

export const CaseBasicsForm = ({
    caseDetails, setCaseDetails,
    errorMap, caseNumberError,
    labels,
    stageOptions,
    isUndeterminedValue, setIsUndeterminedValue,
    isFixedFee, setIsFixedFee,
    valuePlaceholder,
    exceptionWarning,
    courtRef, typeRef, stageRef, numberRef, retrialTargetRef,
    lockParentFields = false,
    onPartiesUnlockChange,
}: CaseBasicsFormProps) => {
    const isExtraordinary = isExtraordinaryProcedureStage(caseDetails.stage);
    const underlyingStageOptions = getUnderlyingStageOptions(caseDetails.stage);
    const valueLocked =
        isUndeterminedValue || isFixedFee || isFixedFeeType(caseDetails.type);
    const numberHasError = Boolean(errorMap['number'] || caseNumberError);
    const { savedTypes, saveType } = useSavedLawsuitTypes();
    const typeTrimmed = normalizeSavedLawsuitType(caseDetails.type);
    const canSaveType = Boolean(typeTrimmed) && !lockParentFields && !savedTypes.includes(typeTrimmed);
    const claimValueRef = useRef<HTMLInputElement | null>(null);
    const judgeRef = useRef<HTMLInputElement | null>(null);
    const pendingFocusRef = useRef<FocusTarget | null>(null);
    const [unlock, setUnlock] = useState<NewCaseFieldUnlock>(
        lockParentFields ? LOCKED_NEW_CASE_UNLOCK : INITIAL_NEW_CASE_UNLOCK,
    );

    useEffect(() => {
        if (lockParentFields) setUnlock(LOCKED_NEW_CASE_UNLOCK);
    }, [lockParentFields]);

    const reveal = computeNewCaseProgressiveReveal({
        lockParentFields,
        unlock,
    });

    useEffect(() => {
        onPartiesUnlockChange?.(reveal.showParties);
    }, [onPartiesUnlockChange, reveal.showParties]);

    useEffect(() => {
        if (lockParentFields) return;
        if (!unlock.stage || !hasFilledNewCaseText(caseDetails.stage)) return;
        setUnlock((prev) => (prev.court ? prev : { ...prev, court: true }));
    }, [caseDetails.stage, lockParentFields, unlock.stage]);

    useLayoutEffect(() => {
        const target = pendingFocusRef.current;
        if (!target) return;
        pendingFocusRef.current = null;
        if (target === 'type') typeRef.current?.focus();
        else if (target === 'value') claimValueRef.current?.focus();
        else if (target === 'stage') stageRef.current?.focus();
        else if (target === 'court') courtRef.current?.focus();
        else if (target === 'judge') judgeRef.current?.focus();
    }, [unlock, courtRef, stageRef, typeRef]);

    const commitNumber = () => {
        if (lockParentFields || !hasFilledNewCaseText(caseDetails.number)) return;
        pendingFocusRef.current = 'type';
        setUnlock((prev) => (prev.type ? prev : { ...prev, type: true }));
    };

    const commitType = () => {
        if (lockParentFields || !hasFilledNewCaseText(caseDetails.type)) return;
        const skipValue = isFixedFeeType(caseDetails.type) || isUndeterminedValue || isFixedFee;
        pendingFocusRef.current = skipValue ? 'stage' : 'value';
        setUnlock((prev) => ({
            ...prev,
            value: true,
            stage: skipValue ? true : prev.stage,
        }));
    };

    const commitValue = () => {
        if (lockParentFields) return;
        const ready =
            isExtraordinary ||
            hasLawsuitClaimValueBasis({
                claimValue: caseDetails.claimValue,
                isUndeterminedValue,
                isFixedFee,
                caseType: caseDetails.type,
            });
        if (!ready) return;
        pendingFocusRef.current = 'stage';
        setUnlock((prev) => (prev.stage ? prev : { ...prev, stage: true }));
    };

    const commitStage = (stage: string) => {
        setCaseDetails((prev) => ({ ...prev, stage }));
        if (lockParentFields) return;
        pendingFocusRef.current = 'court';
        setUnlock((prev) => (prev.court ? prev : { ...prev, court: true }));
    };

    const commitCourt = () => {
        if (lockParentFields || !hasFilledNewCaseText(caseDetails.court)) return;
        pendingFocusRef.current = 'judge';
        setUnlock((prev) => (prev.judgeDate ? prev : { ...prev, judgeDate: true }));
    };

    const commitDate = (firstHearingDate: string) => {
        setCaseDetails((prev) => ({ ...prev, firstHearingDate }));
        if (lockParentFields || !hasFilledNewCaseText(firstHearingDate)) return;
        setUnlock((prev) => (prev.parties ? prev : { ...prev, parties: true }));
    };

    const toggleValueMode = (id: 'undetermined' | 'fixedFee') => {
        if (id === 'undetermined') {
            const next = !isUndeterminedValue;
            setIsUndeterminedValue(next);
            if (next) setIsFixedFee(false);
            if (next) {
                pendingFocusRef.current = 'stage';
                setUnlock((prev) => ({ ...prev, stage: true }));
            }
        } else {
            const next = !isFixedFee;
            setIsFixedFee(next);
            if (next) setIsUndeterminedValue(false);
            if (next) {
                pendingFocusRef.current = 'stage';
                setUnlock((prev) => ({ ...prev, stage: true }));
            }
        }
    };

    return (
        <div className={NC_SECTION}>
            <h4 className={NC_SECTION_TITLE}>أساسيات الدعوى</h4>

            <div className="space-y-4">
                <div>
                    <label className={NC_LABEL}>رقم الدعوى</label>
                    <div className="relative group">
                        <input
                            ref={numberRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            inputMode="text"
                            autoComplete="off"
                            spellCheck={false}
                            enterKeyHint="next"
                            aria-label="رقم الدعوى"
                            data-testid="lawyer-new-case-number"
                            value={caseDetails.number}
                            onChange={(e) =>
                                setCaseDetails((prev) => ({ ...prev, number: e.target.value }))
                            }
                            onKeyDown={(e) => {
                                if (!isCommitEnter(e)) return;
                                e.preventDefault();
                                commitNumber();
                            }}
                            className={`${NC_FIELD} ${numberHasError ? 'border-amber-500/60 ring-1 ring-amber-500/20' : ''}`}
                            dir="auto"
                        />
                    </div>
                    {caseNumberError && <p className="text-amber-500/80 text-[10px] mt-1.5 font-bold">{caseNumberError}</p>}
                </div>

                {reveal.showType ? (
                    <div>
                        <label className={NC_LABEL}>نوع الدعوى</label>
                        <div className="flex items-stretch gap-2">
                            <input
                                ref={typeRef as React.RefObject<HTMLInputElement>}
                                type="text"
                                enterKeyHint="next"
                                aria-label="نوع الدعوى"
                                data-testid="lawyer-new-case-type"
                                value={caseDetails.type}
                                readOnly={lockParentFields}
                                onChange={(e) =>
                                    setCaseDetails((prev) => ({ ...prev, type: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                    if (!isCommitEnter(e)) return;
                                    e.preventDefault();
                                    commitType();
                                }}
                                placeholder={labels.typePlaceholder}
                                className={`${ncFieldClass(Boolean(errorMap['type']))} ${lockParentFields ? 'opacity-80 cursor-default' : ''}`}
                            />
                            {canSaveType ? (
                                <button
                                    type="button"
                                    data-testid="lawyer-new-case-save-type"
                                    onClick={() => {
                                        saveType(caseDetails.type);
                                        commitType();
                                    }}
                                    className="shrink-0 min-h-[44px] min-w-[44px] px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[10px] font-medium text-white/65 hover:border-white/15 hover:bg-white/[0.05] hover:text-white/80 touch-manipulation"
                                >
                                    حفظ
                                </button>
                            ) : null}
                        </div>
                        {savedTypes.length > 0 && !lockParentFields ? (
                            <div className="mt-2">
                                <CaseFieldSelect
                                    value={savedTypes.includes(typeTrimmed) ? typeTrimmed : ''}
                                    onChange={(type) => {
                                        setCaseDetails((prev) => ({ ...prev, type }));
                                        pendingFocusRef.current = isFixedFeeType(type) ? 'stage' : 'value';
                                        setUnlock((prev) => ({
                                            ...prev,
                                            value: true,
                                            stage: isFixedFeeType(type) ? true : prev.stage,
                                        }));
                                    }}
                                    options={savedTypes}
                                    placeholder="الأنواع المحفوظة"
                                    aria-label="الأنواع المحفوظة"
                                />
                            </div>
                        ) : null}
                        {errorMap['type'] && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">{errorMap['type']}</p>}
                    </div>
                ) : null}

                {reveal.showValue ? (
                    <div>
                        {isExtraordinary ? (
                            <>
                                <label className="text-[10px] text-[#E6C673] font-bold mb-1.5 block">
                                    {getUnderlyingStageFieldLabel(caseDetails.stage)}
                                </label>
                                <CaseFieldSelect
                                    ref={retrialTargetRef as React.RefObject<HTMLButtonElement> | undefined}
                                    value={caseDetails.retrialTargetStage ?? ''}
                                    onChange={(retrialTargetStage) => {
                                        setCaseDetails((prev) => ({ ...prev, retrialTargetStage }));
                                        if (lockParentFields) return;
                                        pendingFocusRef.current = 'stage';
                                        setUnlock((prev) => (prev.stage ? prev : { ...prev, stage: true }));
                                    }}
                                    options={underlyingStageOptions}
                                    placeholder="اختر المرحلة..."
                                    hasError={Boolean(errorMap['retrialTargetStage'])}
                                    aria-label={getUnderlyingStageFieldLabel(caseDetails.stage)}
                                />
                                {errorMap['retrialTargetStage'] && (
                                    <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">
                                        {errorMap['retrialTargetStage']}
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <label className="text-[10px] text-[#E6C673] font-bold mb-1 block">القيمة التقديرية للدعوى</label>
                                <input
                                    ref={claimValueRef}
                                    type="text"
                                    inputMode="numeric"
                                    enterKeyHint="next"
                                    data-testid="lawyer-new-case-claim-value"
                                    value={caseDetails.claimValue}
                                    disabled={valueLocked}
                                    onChange={(e) =>
                                        setCaseDetails((prev) => ({
                                            ...prev,
                                            claimValue: formatNumberInput(e.target.value),
                                        }))
                                    }
                                    onKeyDown={(e) => {
                                        if (!isCommitEnter(e)) return;
                                        e.preventDefault();
                                        commitValue();
                                    }}
                                    className={`${ncFieldClass(Boolean(errorMap['claimValue']) || Boolean(exceptionWarning))} disabled:opacity-50 text-left`}
                                    placeholder={valueLocked ? '----' : valuePlaceholder}
                                />
                                <div className="mt-2 flex flex-col gap-1.5">
                                    {VALUE_MODE_OPTIONS.map(({ id, label }) => {
                                        const active = id === 'undetermined' ? isUndeterminedValue : isFixedFee;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                role="checkbox"
                                                aria-checked={active}
                                                onClick={() => toggleValueMode(id)}
                                                className={`flex items-center gap-2 w-full rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-right transition-all duration-200 ${
                                                    active
                                                        ? 'border-[#E6C673]/45 bg-[#E6C673]/10 text-[#E6C673]'
                                                        : 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/15 hover:bg-white/[0.05] hover:text-white/65'
                                                }`}
                                            >
                                                <span
                                                    className={`shrink-0 w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-colors ${
                                                        active ? 'border-[#E6C673] bg-[#E6C673] text-[#0F172A]' : 'border-white/25 bg-transparent'
                                                    }`}
                                                >
                                                    {active && <Check size={9} strokeWidth={3} />}
                                                </span>
                                                <span className="leading-tight">{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {exceptionWarning && (
                                    <div className="mt-1 text-[9px] text-amber-400 font-bold animate-pulse">
                                        {exceptionWarning}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : null}

                {reveal.showStage ? (
                    <div>
                        <label className={NC_LABEL}>المرحلة الحالية</label>
                        <CaseFieldSelect
                            ref={stageRef as React.RefObject<HTMLButtonElement>}
                            value={caseDetails.stage}
                            onChange={commitStage}
                            options={stageOptions}
                            placeholder="اختر المرحلة..."
                            hasError={Boolean(errorMap['stage'])}
                            disabled={lockParentFields}
                            aria-label="المرحلة الحالية"
                        />
                        {errorMap['stage'] && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">{errorMap['stage']}</p>}
                    </div>
                ) : null}

                {reveal.showCourt ? (
                    <div>
                        <label className={NC_LABEL}>اسم المحكمة المختصة</label>
                        <input
                            ref={courtRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            enterKeyHint="next"
                            aria-label="اسم المحكمة المختصة"
                            data-testid="lawyer-new-case-court"
                            value={caseDetails.court}
                            readOnly={lockParentFields}
                            onChange={(e) =>
                                setCaseDetails((prev) => ({ ...prev, court: e.target.value }))
                            }
                            onKeyDown={(e) => {
                                if (!isCommitEnter(e)) return;
                                e.preventDefault();
                                commitCourt();
                            }}
                            placeholder={labels.courtPlaceholder}
                            className={`${ncFieldClass(Boolean(errorMap['court']))} ${lockParentFields ? 'opacity-80 cursor-default' : ''}`}
                        />
                        {errorMap['court'] && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">{errorMap['court']}</p>}
                    </div>
                ) : null}

                {reveal.showJudgeAndDate ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                        <div>
                            <label className={NC_LABEL}>اسم السيد القاضي</label>
                            <input
                                ref={judgeRef}
                                type="text"
                                enterKeyHint="next"
                                aria-label="اسم السيد القاضي"
                                data-testid="lawyer-new-case-judge"
                                value={caseDetails.judge}
                                readOnly={lockParentFields}
                                onChange={(e) =>
                                    setCaseDetails((prev) => ({ ...prev, judge: e.target.value }))
                                }
                                className={`${ncFieldClass()} ${lockParentFields ? 'opacity-80 cursor-default' : ''}`}
                            />
                        </div>
                        <div>
                            <label className={NC_LABEL}>تاريخ أول مرافعة</label>
                            <HamiDateInput
                                value={caseDetails.firstHearingDate}
                                onValueChange={commitDate}
                                className={NC_FIELD}
                                placeholder="اختر التاريخ من التقويم"
                                aria-label="تاريخ أول مرافعة"
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
