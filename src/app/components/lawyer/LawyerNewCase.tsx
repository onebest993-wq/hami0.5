import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { HUB_NESTED_OVERLAY_Z_CLASS, HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import type { MainCategory, CaseType, Party, ThirdParty } from './LawyerNewCase/types';
import type { LawyerNewCaseProps } from '@/app/types/components';
import { ThirdPartyModal } from './LawyerNewCase/components/ThirdPartyModal';
import { CaseHeader } from './LawyerNewCase/components/CaseHeader';
import {
    getPersonalStatusLabels,
    type PersonalApplicableLaw,
} from './personal-status/personalStatusValidation';
import { CivilNewCaseForm } from './LawyerNewCase/components/CivilNewCaseForm';
import { SaveButton } from './LawyerNewCase/components/SaveButton';
import {
    computeStageOptions,
    getValuePlaceholder,
    getExceptionWarning,
    getCaseNumberError,
    getLabels,
} from './LawyerNewCase/validation';
import { consumePendingLawyerNewCaseJurisdiction } from '@/app/runtime/lawyerNewCaseLoader';
import {
    buildIncidentalSpawnPrefill,
    type IncidentalSpawnContextEnriched,
} from '@/app/domain/lawsuit/incidentalSpawnPrefill';
import {
    defaultCaseDetails,
    defaultParty,
    resolveIncidentalSpawnContext,
    resolveInitialCaseType,
    resolveInitialIncidentalPrefill,
    type LawyerNewCaseDetails,
} from './LawyerNewCase/spawnInit';
import { getAddPartyButtonText } from './LawyerNewCase/partyClientFlags';
import { useLawyerNewCasePartyHandlers } from './LawyerNewCase/useLawyerNewCasePartyHandlers';
import { useLawyerNewCaseFormSync } from './LawyerNewCase/useLawyerNewCaseFormSync';
import { performLawyerNewCaseSave } from './LawyerNewCase/performLawyerNewCaseSave';

const LazyCriminalNewCase = React.lazy(() =>
    import('./criminal-system/CriminalNewCase').then((m) => ({ default: m.CriminalNewCase })),
);

const LazyPersonalStatusNewCaseForm = React.lazy(() =>
    import('./personal-status/PersonalStatusNewCaseForm').then((m) => ({
        default: m.PersonalStatusNewCaseForm,
    })),
);

export const LawyerNewCase: React.FC<LawyerNewCaseProps> = ({
    onClose,
    onSave,
    onOpenCriminalDashboard,
    presetSelectedType,
    criminalSeveranceFormMode = false,
    consolidationNavActive = false,
    dossierNewCaseElevated = false,
    incidentalSpawnContext = null,
}) => {
    const [mainCategory] = useState<MainCategory | null>('lawsuit');
    const [selectedType, setSelectedType] = useState<CaseType>(() =>
        resolveInitialCaseType(presetSelectedType),
    );
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const savingRef = useRef(false);

    useEffect(() => {
        consumePendingLawyerNewCaseJurisdiction();
    }, []);

    useEffect(() => {
        if (presetSelectedType) {
            setSelectedType(presetSelectedType as CaseType);
        }
    }, [presetSelectedType]);

    useEffect(() => {
        if (selectedType !== 'criminal' || criminalSeveranceFormMode) return;
        void import('@/app/components/lawyer/criminal-system/criminalStore').then(
            ({ useCriminalStore }) => useCriminalStore.getState().prepareNormalCriminalCaseForm(),
        );
    }, [selectedType, criminalSeveranceFormMode]);

    const effectiveSpawnContext = useMemo(
        () => resolveIncidentalSpawnContext(incidentalSpawnContext),
        [incidentalSpawnContext],
    );

    const [parties1, setParties1] = useState<Party[]>(() => {
        const prefill = resolveInitialIncidentalPrefill(incidentalSpawnContext);
        return prefill?.parties1 ?? [defaultParty(1)];
    });
    const [parties2, setParties2] = useState<Party[]>(() => {
        const prefill = resolveInitialIncidentalPrefill(incidentalSpawnContext);
        return prefill?.parties2 ?? [defaultParty(2)];
    });

    const [isThirdPartyModalOpen, setIsThirdPartyModalOpen] = useState(false);
    const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
    const [isUndeterminedValue, setIsUndeterminedValue] = useState(false);
    const [isFixedFee, setIsFixedFee] = useState(false);
    const [applicableLaw, setApplicableLaw] = useState<PersonalApplicableLaw | ''>('');
    const [errorMap, setErrorMap] = useState<Record<string, string>>({});

    const [caseDetails, setCaseDetails] = useState<LawyerNewCaseDetails>(() => {
        const prefill = resolveInitialIncidentalPrefill(incidentalSpawnContext);
        return (prefill?.caseDetails as LawyerNewCaseDetails | undefined) ?? defaultCaseDetails();
    });
    const [incidentalFilingPartyId, setIncidentalFilingPartyId] = useState<string | null>(() => {
        const prefill = resolveInitialIncidentalPrefill(incidentalSpawnContext);
        if (!prefill) return null;
        return prefill.requiresFilingPartyPick
            ? null
            : prefill.filingPartyCandidates[0]?.id ?? null;
    });
    const [incidentalOpposingPartyId, setIncidentalOpposingPartyId] = useState<string | null>(() => {
        const prefill = resolveInitialIncidentalPrefill(incidentalSpawnContext);
        if (!prefill) return null;
        return prefill.requiresOpposingPartyPick
            ? null
            : prefill.opposingPartyCandidates[0]?.id ?? null;
    });

    const applyIncidentalSpawnPrefill = useCallback(
        (ctx: IncidentalSpawnContextEnriched, selection: { filingPartyId?: string | null; opposingPartyId?: string | null } = {}) => {
            const prefill = buildIncidentalSpawnPrefill(ctx, selection);
            setCaseDetails(prefill.caseDetails);
            setParties1(prefill.parties1);
            setParties2(prefill.parties2);
            setIncidentalFilingPartyId(
                prefill.requiresFilingPartyPick
                    ? selection.filingPartyId ?? null
                    : prefill.filingPartyCandidates[0]?.id ?? null,
            );
            setIncidentalOpposingPartyId(
                prefill.requiresOpposingPartyPick
                    ? selection.opposingPartyId ?? null
                    : prefill.opposingPartyCandidates[0]?.id ?? null,
            );
            setSelectedType('civil');
        },
        [],
    );

    const incidentalPartySelection = useMemo(
        () => ({
            filingPartyId: incidentalFilingPartyId,
            opposingPartyId: incidentalOpposingPartyId,
        }),
        [incidentalFilingPartyId, incidentalOpposingPartyId],
    );

    const spawnPrefill = useMemo(
        () =>
            effectiveSpawnContext
                ? buildIncidentalSpawnPrefill(effectiveSpawnContext, incidentalPartySelection)
                : null,
        [effectiveSpawnContext, incidentalPartySelection],
    );

    useLayoutEffect(() => {
        if (!effectiveSpawnContext?.parent) return;
        applyIncidentalSpawnPrefill(effectiveSpawnContext, incidentalPartySelection);
    }, [effectiveSpawnContext, incidentalPartySelection, applyIncidentalSpawnPrefill]);

    const topFormRef = useRef<HTMLDivElement>(null);
    const courtRef = useRef<HTMLInputElement>(null);
    const typeRef = useRef<HTMLInputElement>(null);
    const stageRef = useRef<HTMLButtonElement>(null);
    const numberRef = useRef<HTMLInputElement>(null);
    const retrialTargetRef = useRef<HTMLButtonElement>(null);

    const stageOptions = useMemo(() => {
        if (spawnPrefill) return spawnPrefill.stageOptions;
        return computeStageOptions(caseDetails.court);
    }, [spawnPrefill, caseDetails.court]);
    const valuePlaceholder = useMemo(
        () => getValuePlaceholder(caseDetails.type || ''),
        [caseDetails.type],
    );
    const exceptionWarning = useMemo(
        () => getExceptionWarning(caseDetails.claimValue, caseDetails.type || ''),
        [caseDetails.claimValue, caseDetails.type],
    );
    const caseNumberError = useMemo(
        () => getCaseNumberError(caseDetails.number),
        [caseDetails.number],
    );
    const labels = useMemo(
        () =>
            selectedType === 'personal'
                ? getPersonalStatusLabels(caseDetails.stage)
                : getLabels(mainCategory),
        [mainCategory, selectedType, caseDetails.stage],
    );
    const isPersonalCase = selectedType === 'personal';

    /** جلب مسبق لجسم إضبارة الأحوال + تسخين مفاتيح الدعاوى قبل الحفظ */
    useEffect(() => {
        if (!isPersonalCase) return;
        void import('./personal-status/PersonalStatusDossierBody');
        void import('@/app/services/SecureStoreService')
            .then(({ default: store }) => store.ensureLawsuitKeysReady())
            .catch(() => undefined);
        void import('@/app/services/CryptoService')
            .then(({ CryptoService }) => CryptoService.initialize())
            .catch(() => undefined);
    }, [isPersonalCase]);

    useLawyerNewCaseFormSync({
        caseDetails,
        setCaseDetails,
        setParties1,
        setParties2,
        setErrorMap,
        setIsUndeterminedValue,
        setIsFixedFee,
        selectedType,
        isPersonalCase,
        isFixedFee,
        isUndeterminedValue,
        applicableLaw,
        parties1Length: parties1.length,
        parties2Length: parties2.length,
        effectiveSpawnContext,
        mainCategory,
    });

    const {
        addParty,
        removeParty,
        updateParty,
        handleAddThirdParty,
        removeThirdParty,
        updateThirdParty,
    } = useLawyerNewCasePartyHandlers({
        parties1,
        parties2,
        thirdParties,
        setParties1,
        setParties2,
        setThirdParties,
        setErrorMap,
    });

    const scrollToElement = (ref: React.RefObject<HTMLInputElement | HTMLButtonElement | null>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ref.current?.focus();
    };

    const handleSave = () => {
        if (savingRef.current || isAnalyzing) return;
        savingRef.current = true;
        void performLawyerNewCaseSave({
            isPersonalCase,
            errorMap,
            setErrorMap,
            caseDetails,
            applicableLaw,
            caseNumberError,
            parties1,
            parties2,
            thirdParties,
            mainCategory,
            selectedType,
            isUndeterminedValue,
            isFixedFee,
            effectiveSpawnContext,
            incidentalPartySelection,
            spawnPrefill,
            incidentalFilingPartyId,
            incidentalOpposingPartyId,
            onSave,
            scrollToElement,
            courtRef,
            typeRef,
            stageRef,
            numberRef,
            retrialTargetRef,
            setIsAnalyzing,
        }).finally(() => {
            savingRef.current = false;
        });
    };

    return (
        <div
            ref={topFormRef}
            className={`fixed inset-0 ${consolidationNavActive || dossierNewCaseElevated ? HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS : HUB_NESTED_OVERLAY_Z_CLASS} flex min-h-0 flex-col bg-[#080c14] font-['Tajawal'] ${consolidationNavActive ? 'pt-12' : ''}`}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(230,198,115,0.07),transparent_52%)]" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_100%,rgba(90,120,180,0.06),transparent_48%)]" aria-hidden />

            <ThirdPartyModal
                isOpen={isThirdPartyModalOpen}
                onClose={() => setIsThirdPartyModalOpen(false)}
                onSave={handleAddThirdParty}
                currentStage={caseDetails.stage}
            />

            {selectedType !== 'criminal' && (
                <CaseHeader
                    onClose={onClose}
                    selectedType={selectedType}
                    incidentalBadge={spawnPrefill?.headerBadge}
                />
            )}

            <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide">
                        <div className="overflow-visible pb-6">
                            {selectedType === 'criminal' && (
                                <React.Suspense
                                    fallback={
                                        <div className="py-12 text-center text-[#E6C673] text-sm font-bold animate-pulse">
                                            جاري تحميل نموذج الإضبارة الجزائية...
                                        </div>
                                    }
                                >
                                    <LazyCriminalNewCase
                                        severanceFormMode={criminalSeveranceFormMode}
                                        onBack={() => {
                                            onClose();
                                        }}
                                        onClose={onClose}
                                        onCreated={(caseId) => {
                                            onClose();
                                            onOpenCriminalDashboard?.(caseId);
                                        }}
                                    />
                                </React.Suspense>
                            )}

                            {selectedType !== 'criminal' && (
                            <>
                            {isPersonalCase ? (
                                <React.Suspense
                                    fallback={
                                        <div className="py-12 text-center text-[#E6C673] text-sm font-bold">
                                            جاري تحميل نموذج الأحوال الشخصية...
                                        </div>
                                    }
                                >
                                    <LazyPersonalStatusNewCaseForm
                                        caseDetails={caseDetails}
                                        applicableLaw={applicableLaw}
                                        setApplicableLaw={setApplicableLaw}
                                        setCaseDetails={setCaseDetails}
                                        parties1={parties1}
                                        parties2={parties2}
                                        thirdParties={thirdParties}
                                        onUpdateParty={updateParty}
                                        onRemoveParty={removeParty}
                                        onAddParty={addParty}
                                        onAddThirdParty={() => setIsThirdPartyModalOpen(true)}
                                        onRemoveThirdParty={removeThirdParty}
                                        onUpdateThirdParty={updateThirdParty}
                                        errorMap={errorMap}
                                        caseNumberError={caseNumberError}
                                        courtRef={courtRef as React.RefObject<HTMLInputElement | null>}
                                        typeRef={typeRef as React.RefObject<HTMLInputElement | null>}
                                        stageRef={
                                            stageRef as unknown as React.RefObject<HTMLSelectElement | null>
                                        }
                                        numberRef={numberRef as React.RefObject<HTMLInputElement | null>}
                                        retrialTargetRef={
                                            retrialTargetRef as unknown as React.RefObject<HTMLSelectElement | null>
                                        }
                                    />
                                </React.Suspense>
                            ) : (
                                <CivilNewCaseForm
                                    caseDetails={caseDetails}
                                    setCaseDetails={setCaseDetails}
                                    errorMap={errorMap}
                                    caseNumberError={caseNumberError}
                                    labels={labels}
                                    stageOptions={stageOptions}
                                    isUndeterminedValue={isUndeterminedValue}
                                    setIsUndeterminedValue={setIsUndeterminedValue}
                                    isFixedFee={isFixedFee}
                                    setIsFixedFee={setIsFixedFee}
                                    valuePlaceholder={valuePlaceholder}
                                    exceptionWarning={exceptionWarning}
                                    courtRef={courtRef as React.RefObject<HTMLInputElement | null>}
                                    typeRef={typeRef as React.RefObject<HTMLInputElement | null>}
                                    stageRef={stageRef}
                                    numberRef={numberRef as React.RefObject<HTMLInputElement | null>}
                                    retrialTargetRef={retrialTargetRef}
                                    lockParentFields={Boolean(effectiveSpawnContext)}
                                    parties1={parties1}
                                    parties2={parties2}
                                    thirdParties={thirdParties}
                                    onUpdateParty={updateParty}
                                    onRemoveParty={removeParty}
                                    onAddParty={addParty}
                                    addPartyButtonText1={getAddPartyButtonText(1, parties1)}
                                    addPartyButtonText2={getAddPartyButtonText(2, parties2)}
                                    onAddThirdParty={() => setIsThirdPartyModalOpen(true)}
                                    onRemoveThirdParty={removeThirdParty}
                                    onUpdateThirdParty={updateThirdParty}
                                    incidentalSpawnType={effectiveSpawnContext?.type}
                                    incidentalFilingPartyCandidates={spawnPrefill?.filingPartyCandidates ?? []}
                                    incidentalOpposingPartyCandidates={spawnPrefill?.opposingPartyCandidates ?? []}
                                    incidentalFilingPartyId={incidentalFilingPartyId}
                                    incidentalOpposingPartyId={incidentalOpposingPartyId}
                                    onIncidentalFilingPartySelect={(id) => {
                                        setIncidentalFilingPartyId(id);
                                        setErrorMap((prev) => {
                                            if (!prev.incidental_filing_party) return prev;
                                            const next = { ...prev };
                                            delete next.incidental_filing_party;
                                            return next;
                                        });
                                    }}
                                    onIncidentalOpposingPartySelect={(id) => {
                                        setIncidentalOpposingPartyId(id);
                                        setErrorMap((prev) => {
                                            if (!prev.incidental_opposing_party) return prev;
                                            const next = { ...prev };
                                            delete next.incidental_opposing_party;
                                            return next;
                                        });
                                    }}
                                    incidentalFilingPartyError={errorMap.incidental_filing_party}
                                    incidentalOpposingPartyError={errorMap.incidental_opposing_party}
                                    lockIncidentalParties={Boolean(effectiveSpawnContext)}
                                />
                            )}
                            </>
                            )}
                        </div>
            </div>

            {selectedType !== 'criminal' ? (
                <SaveButton
                    isAnalyzing={isAnalyzing}
                    hasCriminalError={Boolean(errorMap.criminal_error)}
                    onSave={handleSave}
                    variant={isPersonalCase ? 'personal' : 'civil'}
                />
            ) : null}
        </div>
    );
};
