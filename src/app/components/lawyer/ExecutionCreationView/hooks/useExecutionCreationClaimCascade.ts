import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import {
    isLegalEntityDebtorKind,
    normalizeDebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import { ecg } from '../components/executionCreationGlassUi';
import { createEmptyVisitationScheduleDraft } from '../components/VisitationScheduleSetupSection';
import {
    claimHasFinancialAmountSection,
    isDirectorateSectionComplete,
    isFinancialClaimForPartySplit,
    isInstrumentSectionReadyForParties,
    isPersonalStatusClassification,
    isShariaLinkedFinancialClaim,
    showCivilDebtorSolidarySplit,
} from './executionFormUtils';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';
import type { AdditionalDebtorDraft, DebtorDraft } from '../types';
import type { AlimonyCalculationResult } from './useAlimonyCalculator';

type ExecutionOptionListItem = { value: string; label: string };

export interface UseExecutionCreationClaimCascadeParams {
    directorate: string;
    fileNumber: string;

    docType: string;
    setDocType: Dispatch<SetStateAction<string>>;
    classification: string;
    setClassification: Dispatch<SetStateAction<string>>;
    claimType: string;
    setClaimType: Dispatch<SetStateAction<string>>;
    activeClaimTypes: string[];
    setActiveClaimTypes: Dispatch<SetStateAction<string[]>>;
    claimAmountsByType: Record<string, string>;
    setClaimAmountsByType: Dispatch<SetStateAction<Record<string, string>>>;

    debtors: DebtorDraft[];
    setDebtors: Dispatch<SetStateAction<DebtorDraft[]>>;
    additionalDebtorsForm: AdditionalDebtorDraft[];
    setAdditionalDebtorsForm: Dispatch<SetStateAction<AdditionalDebtorDraft[]>>;

    classificationOptionsList: ExecutionOptionListItem[];
    claimTypeOptionsList: ExecutionOptionListItem[];

    claimTypeSheetOpen: boolean;
    setClaimTypeSheetOpen: Dispatch<SetStateAction<boolean>>;
    linkedClaimDraft: string[];
    setLinkedClaimDraft: Dispatch<SetStateAction<string[]>>;

    setVisitationChildrenNames: Dispatch<SetStateAction<string[]>>;
    setVisitationScheduleDraft: Dispatch<SetStateAction<Partial<VisitationScheduleConfig>>>;
    setCustodyWardNames: Dispatch<SetStateAction<string[]>>;

    calculatedAlimonyNew: AlimonyCalculationResult | null | undefined;
    alimonyLawsuitDate: string;
    alimonyPastStartDate: string;

    setShowChequeValidatorModal: Dispatch<SetStateAction<boolean>>;
    setShowAbsenteeModal: Dispatch<SetStateAction<boolean>>;
    setSpecificDeliveryItems: Dispatch<SetStateAction<SpecificDeliveryItem[]>>;
}

/**
 * تسلسل نوع السند ← التصنيف ← نوع المطالبة (cascading dropdowns) — مستخرج من
 * ExecutionCreationView لتقليص حجم المكوّن الرئيسي (Phase-2 split).
 */
export function useExecutionCreationClaimCascade(params: UseExecutionCreationClaimCascadeParams) {
    const {
        directorate,
        fileNumber,
        docType,
        setDocType,
        classification,
        setClassification,
        claimType,
        setClaimType,
        activeClaimTypes,
        setActiveClaimTypes,
        setClaimAmountsByType,
        debtors,
        setDebtors,
        additionalDebtorsForm,
        setAdditionalDebtorsForm,
        classificationOptionsList,
        claimTypeOptionsList,
        claimTypeSheetOpen,
        setClaimTypeSheetOpen,
        linkedClaimDraft,
        setLinkedClaimDraft,
        setVisitationChildrenNames,
        setVisitationScheduleDraft,
        setCustodyWardNames,
        calculatedAlimonyNew,
        alimonyLawsuitDate,
        alimonyPastStartDate,
        setShowChequeValidatorModal,
        setShowAbsenteeModal,
        setSpecificDeliveryItems,
    } = params;

    useEffect(() => {
        if (claimType !== 'مشاهدة') {
            setVisitationChildrenNames(['']);
            setVisitationScheduleDraft(createEmptyVisitationScheduleDraft());
        }
        if (claimType !== 'تسليم ولد') {
            setCustodyWardNames(['']);
        }
    }, [claimType, setVisitationChildrenNames, setVisitationScheduleDraft, setCustodyWardNames]);

    const hasLegalEntityDebtor = useMemo(
        () =>
            [...debtors, ...additionalDebtorsForm].some((d) =>
                isLegalEntityDebtorKind(
                    normalizeDebtorEntityKind(
                        (d as { entityKind?: string; entityType?: string; type?: string }).entityKind ??
                            (d as { entityType?: string }).entityType ??
                            ((d as { type?: string }).type === 'company'
                                ? 'legal_entity'
                                : 'natural_person')
                    )
                )
            ),
        [debtors, additionalDebtorsForm]
    );

    const visibleClassificationOptions = useMemo(() => {
        if (hasLegalEntityDebtor) {
            return classificationOptionsList.filter((o) => o.value === 'مدني');
        }
        return classificationOptionsList;
    }, [classificationOptionsList, hasLegalEntityDebtor]);

    useEffect(() => {
        if (!hasLegalEntityDebtor) return;
        const needsClassification = ['قرارات وأحكام المحاكم', 'تنفيذ الأحكام الأجنبية'].includes(
            docType
        );
        if (!needsClassification) return;
        if (classification === 'مدني') return;
        setClassification('مدني');
        setActiveClaimTypes([]);
        setClaimType('');
    }, [hasLegalEntityDebtor, docType, classification, setClassification, setActiveClaimTypes, setClaimType]);

    const effectiveClaimTypes = useMemo(
        () => (activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : []),
        [activeClaimTypes, claimType],
    );
    const requiresClassification =
        docType !== 'الحجج الشرعية' && visibleClassificationOptions.length > 0;
    const showInstrumentSection = useMemo(
        () => isDirectorateSectionComplete(directorate, fileNumber),
        [directorate, fileNumber],
    );
    const showPartiesSection = useMemo(
        () =>
            showInstrumentSection &&
            isInstrumentSectionReadyForParties({
                docType,
                classification,
                claimType,
                effectiveClaimTypes,
                requiresClassification,
            }),
        [
            showInstrumentSection,
            docType,
            classification,
            claimType,
            effectiveClaimTypes,
            requiresClassification,
        ],
    );
    const allowMultipleDebtors = !isPersonalStatusClassification(classification);
    const showDebtorSolidarySplit = useMemo(
        () => showCivilDebtorSolidarySplit(classification, effectiveClaimTypes, claimType),
        [classification, effectiveClaimTypes, claimType],
    );

    useEffect(() => {
        if (!allowMultipleDebtors && additionalDebtorsForm.length > 0) {
            setAdditionalDebtorsForm([]);
            setDebtors((prev) =>
                prev.map((d) => ({ ...d, isSolidaryLiability: false })),
            );
        }
    }, [allowMultipleDebtors, additionalDebtorsForm.length, setAdditionalDebtorsForm, setDebtors]);

    useEffect(() => {
        if (showDebtorSolidarySplit) return;
        setDebtors((prev) =>
            prev.map((d) => ({ ...d, isSolidaryLiability: false })),
        );
        setAdditionalDebtorsForm((prev) =>
            prev.map((d) => ({ ...d, isSolidaryLiability: false })),
        );
    }, [showDebtorSolidarySplit, setDebtors, setAdditionalDebtorsForm]);

    /** المدين الأول = ضامن افتراضياً في تقسيم المدني المالي */
    useEffect(() => {
        if (!showDebtorSolidarySplit) return;
        setDebtors((prev) => {
            const primary = prev[0];
            if (!primary || primary.isSolidaryLiability) return prev;
            return [{ ...primary, isSolidaryLiability: true }, ...prev.slice(1)];
        });
    }, [showDebtorSolidarySplit, setDebtors]);

    const nonFinancialLawyerFeesClaims = useMemo(
        () =>
            new Set([
                'تسليم ولد',
                'تسليم طفل',
                'مشاهدة',
                'استصحاب',
                'مبيت',
                'مطاوعة',
                'حجة وصاية',
                'أثاث زوجية',
            ]),
        [],
    );
    const showLawyerFeesToggle =
        effectiveClaimTypes.length > 0 &&
        effectiveClaimTypes.some((ct) => !nonFinancialLawyerFeesClaims.has(ct));
    const showLawyerFeesBetweenSections = useMemo(
        () =>
            showLawyerFeesToggle &&
            isInstrumentSectionReadyForParties({
                docType,
                classification,
                claimType,
                effectiveClaimTypes,
                requiresClassification,
            }),
        [
            showLawyerFeesToggle,
            docType,
            classification,
            claimType,
            effectiveClaimTypes,
            requiresClassification,
        ],
    );
    const hasActiveClaim = useCallback(
        (ct: string) => effectiveClaimTypes.includes(ct),
        [effectiveClaimTypes],
    );
    const financialAmountClaimTypes = effectiveClaimTypes.filter(claimHasFinancialAmountSection);
    const showMultiClaimAggregatePanel = financialAmountClaimTypes.length > 1;
    const claimSectionCardClass = showMultiClaimAggregatePanel ? ecg.subCard : ecg.card;
    const showShariaLinkedClaimPanel =
        docType === 'قرارات وأحكام المحاكم' && classification === 'شرعي';
    const shariaLinkedClaimOptions = showShariaLinkedClaimPanel
        ? claimTypeOptionsList.filter((o) => isShariaLinkedFinancialClaim(o.value))
        : [];
    const shariaExclusiveClaimOptions = showShariaLinkedClaimPanel
        ? claimTypeOptionsList.filter((o) => !isShariaLinkedFinancialClaim(o.value))
        : claimTypeOptionsList;

    useEffect(() => {
        if (!claimTypeSheetOpen) return;
        setLinkedClaimDraft(activeClaimTypes.filter((ct) => isShariaLinkedFinancialClaim(ct)));
    }, [claimTypeSheetOpen, activeClaimTypes, setLinkedClaimDraft]);

    const toggleLinkedClaimDraft = useCallback(
        (value: string) => {
            setLinkedClaimDraft((prev) =>
                prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
            );
        },
        [setLinkedClaimDraft],
    );

    const saveLinkedClaimDraft = useCallback(() => {
        if (linkedClaimDraft.length === 0) return;
        setActiveClaimTypes(linkedClaimDraft);
        setClaimAmountsByType((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (!linkedClaimDraft.includes(key)) delete next[key];
            });
            return next;
        });
        setClaimTypeSheetOpen(false);
    }, [linkedClaimDraft, setActiveClaimTypes, setClaimAmountsByType, setClaimTypeSheetOpen]);

    const removeActiveClaimType = useCallback(
        (value: string) => {
            if (value === 'تسليم شيء معين') {
                setSpecificDeliveryItems([]);
            }
            setActiveClaimTypes((prev) => {
                const next = prev.filter((x) => x !== value);
                setClaimAmountsByType((amt) => {
                    const cleaned = { ...amt };
                    delete cleaned[value];
                    return cleaned;
                });
                return next;
            });
        },
        [setActiveClaimTypes, setClaimAmountsByType, setSpecificDeliveryItems],
    );

    useEffect(() => {
        setClaimType(activeClaimTypes[0] ?? '');
    }, [activeClaimTypes, setClaimType]);

    useEffect(() => {
        if (!activeClaimTypes.includes('نفقة ماضية')) return;
        const past = calculatedAlimonyNew?.pastAccumulation;
        if (!past || past <= 0) return;
        const next = String(Math.round(past));
        setClaimAmountsByType((prev) =>
            prev['نفقة ماضية'] === next ? prev : { ...prev, 'نفقة ماضية': next }
        );
    }, [
        activeClaimTypes,
        calculatedAlimonyNew?.pastAccumulation,
        alimonyLawsuitDate,
        alimonyPastStartDate,
        setClaimAmountsByType,
    ]);

    useEffect(() => {
        const types = activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
        if (!types.some((ct) => isFinancialClaimForPartySplit(ct))) {
            setDebtors((prev) =>
                prev.map((d) => ({ ...d, isSolidaryLiability: false })),
            );
            setAdditionalDebtorsForm((prev) =>
                prev.map((d) => ({ ...d, isSolidaryLiability: false })),
            );
        }
    }, [claimType, activeClaimTypes, setDebtors, setAdditionalDebtorsForm]);

    const handleDocTypeChange = useCallback(
        (newDocType: string) => {
            setDocType(newDocType);
            setClassification('');
            setClaimType('');
            setActiveClaimTypes([]);
            setClaimAmountsByType({});
            setLinkedClaimDraft([]);

            // ✅ CRITICAL LOGIC: DYNAMIC FIELD MORPHING (COMMERCIAL PAPERS)
            if (newDocType === 'الأوراق التجارية') {
                setClaimType('استحصال دين مالي');
                setClassification('none');
                setShowChequeValidatorModal(true);
            }

            if (newDocType === 'السندات المتضمنة إقراراً بدين') {
                setShowAbsenteeModal(true);
            }

            const needsClassification = ['قرارات وأحكام المحاكم', 'تنفيذ الأحكام الأجنبية'].includes(
                newDocType
            );

            if (!needsClassification) {
                setClassification('none');
            }
        },
        [
            setDocType,
            setClassification,
            setClaimType,
            setActiveClaimTypes,
            setClaimAmountsByType,
            setLinkedClaimDraft,
            setShowChequeValidatorModal,
            setShowAbsenteeModal,
        ],
    );

    const handleClassificationChange = useCallback(
        (newClassification: string) => {
            setClassification(newClassification);
            setClaimType('');
            setActiveClaimTypes([]);
            setClaimAmountsByType({});
            setLinkedClaimDraft([]);
            if (isPersonalStatusClassification(newClassification)) {
                setAdditionalDebtorsForm([]);
                setDebtors((prev) =>
                    prev.map((d) => ({
                        ...d,
                        isSolidaryLiability: false,
                        entityKind: 'natural_person',
                        entityType: 'natural_person',
                        type: 'individual',
                        occupation:
                            (d as { occupation?: string }).occupation === 'معنوي'
                                ? ('كاسب' as const)
                                : ((d as { occupation?: string }).occupation as 'موظف' | 'كاسب') ??
                                  ('كاسب' as const),
                    })),
                );
            }
        },
        [
            setClassification,
            setClaimType,
            setActiveClaimTypes,
            setClaimAmountsByType,
            setLinkedClaimDraft,
            setAdditionalDebtorsForm,
            setDebtors,
        ],
    );

    // === PHASE 25: AUTO-SELECT SINGLE OPTIONS ===
    useEffect(() => {
        if (docType && visibleClassificationOptions.length === 1 && !classification) {
            setClassification(visibleClassificationOptions[0]!.value);
        }
    }, [docType, classification, visibleClassificationOptions, setClassification]);

    useEffect(() => {
        if (classification && claimTypeOptionsList.length === 1 && activeClaimTypes.length === 0) {
            setActiveClaimTypes([claimTypeOptionsList[0]!.value]);
        }
    }, [classification, activeClaimTypes.length, claimTypeOptionsList, setActiveClaimTypes]);

    /** إزالة مطالبات لم تعد ضمن الخيارات (مثل تسليم شيء معين بعد إخفائه من المدني) */
    useEffect(() => {
        const allowed = new Set(claimTypeOptionsList.map((o) => o.value));
        setActiveClaimTypes((prev) => {
            const next = prev.filter((ct) => allowed.has(ct));
            return next.length === prev.length ? prev : next;
        });
        if (claimType && !allowed.has(claimType)) {
            setClaimType('');
        }
    }, [claimTypeOptionsList, claimType, setActiveClaimTypes, setClaimType]);

    return {
        hasLegalEntityDebtor,
        visibleClassificationOptions,
        effectiveClaimTypes,
        requiresClassification,
        showInstrumentSection,
        showPartiesSection,
        allowMultipleDebtors,
        showDebtorSolidarySplit,
        showLawyerFeesToggle,
        showLawyerFeesBetweenSections,
        hasActiveClaim,
        financialAmountClaimTypes,
        showMultiClaimAggregatePanel,
        claimSectionCardClass,
        showShariaLinkedClaimPanel,
        shariaLinkedClaimOptions,
        shariaExclusiveClaimOptions,
        toggleLinkedClaimDraft,
        saveLinkedClaimDraft,
        removeActiveClaimType,
        handleDocTypeChange,
        handleClassificationChange,
    };
}
