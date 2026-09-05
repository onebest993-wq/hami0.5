import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { Party } from '../LawyerShared';
import { resolveOpponentAsAppellant } from './smartFile/appealStageTransition';
import {
    inferAppellantSideFromLawyer,
    resolveAppealDossierLayout,
    resolveAppellantLegalSideFromSelection,
    resolveOpponentRegistrationAppealLayout,
    filterVisibleAppellantParties,
    filterVisibleOpponentParties,
    isInterpleaderAppealParty,
    resolveAppealPartyPickerVisibility,
    litigantsForAppealHopFromObjection,
} from './smartFile/appealPartyEngine';
import {
    filterMethodsForAppealRoute,
} from './smartFile/appealRouteEligibility';
import { resolveAllowedOpponentAppealMethods } from './smartFile/judgmentTypes';
import { canOfferAbsentObjectionToDefendant } from './smartFile/absentJudgmentFlow';
import { isDisputeIndivisible, judgmentFormHasGhayabi, normalizePartyJudgmentDispositions } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { filterAppellantPartiesByChallengeMethod } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import { filterAppellantsByAppealInterest } from './smartFile/appealInterestEligibility';
import { missingCompulsoryJoinderIds } from '@/app/domain/lawsuit/partyChallengeLanes';
import {
    filterPersonalStatusAppealMethods,
    isPersonalStatusAppealContext,
    normalizePersonalStatusAppealMethod,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { useJudgmentModalStyles } from './smartFile/smartModalChrome';
import {
    appealMethodLabel,
    defaultAppealType,
    defaultSelectedChallengeAppellantIds,
    normalizeAppealMethodValue,
    resolveAppealOutcomeHint,
} from './appealTransitionModalHelpers';
import {
    resolveAppealStageCaseNumber,
} from './smartFile/absentObjectionCaseNumber';
import { resolveAppealTransitionChrome } from './appealTransitionModalChrome';
import { AppealTransitionModalHeader } from './AppealTransitionModalHeader';
import { AppealTransitionModalBody } from './AppealTransitionModalBody';
import { AppealTransitionModalFooter } from './AppealTransitionModalFooter';
import type { AppealTransitionModalProps } from './AppealTransitionModal.types';
import {
    isAppealWindowLapseMethod,
    isCassationWindowLapseMethod,
    shouldOfferAppealWindowLapse,
    shouldOfferCassationWindowLapse,
} from './smartFile/appealWindowLapseEngine';
import { blocksCivilDossierFinality } from './smartFile/art172AppealStay';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';

export type { AppealTransitionModalProps } from './AppealTransitionModal.types';

export const AppealTransitionModal: React.FC<AppealTransitionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    currentParties,
    representedParty,
    judgmentType,
    judgmentForm,
    lastJudgmentType,
    stageName,
    finalDecision,
    incidentalCases,
    appealRoute,
    mode = 'postJudgment',
    stages = [],
    lawsuitFile,
    sourceCaseNumber = '',
    decisionDate,
    appealDeadline,
    cassationDeadline,
    appealWindowLapsed,
    cassationWindowLapsed,
    presetCourt = '',
    partyJudgmentDispositions,
    forcedAllowedMethods,
    preferredChallengerPartyId = null,
    spawnIndependentDossier: spawnIndependentDossierProp = false,
}) => {
    const s = useJudgmentModalStyles();
    const isOpponentRegistration = mode === 'opponentRegistration';
    const isGhayabi = judgmentFormHasGhayabi(
        judgmentForm,
        lastJudgmentType,
        partyJudgmentDispositions,
    );
    const effectiveFinalDecision = useMemo(
        () => resolveAppealOutcomeHint(judgmentType, finalDecision),
        [judgmentType, finalDecision],
    );
    const canOfferAbsentObjection = useMemo(
        () =>
            canOfferAbsentObjectionToDefendant({
                currentStage: stageName,
                stages,
                judgmentForm,
                lastJudgmentType,
                finalDecision: effectiveFinalDecision,
                representedParty,
                opponentRegistration: isOpponentRegistration,
                partyJudgmentDispositions,
                parties: currentParties,
            }),
        [
            stageName,
            stages,
            judgmentForm,
            lastJudgmentType,
            effectiveFinalDecision,
            representedParty,
            isOpponentRegistration,
            partyJudgmentDispositions,
            currentParties,
        ],
    );
    const allowedOpponentMethods = useMemo(
        () => {
            const resolved = isOpponentRegistration
                ? resolveAllowedOpponentAppealMethods({
                      judgmentForm,
                      lastJudgmentType,
                      stageName,
                      finalDecision: effectiveFinalDecision,
                      appealRoute,
                      stages,
                      file: lawsuitFile,
                      appealWindowLapsed,
                      cassationWindowLapsed,
                      partyJudgmentDispositions,
                  })
                : [];
            if (!forcedAllowedMethods?.length) return resolved;
            const forced = forcedAllowedMethods.map((method) => normalizeAppealMethodValue(method));
            const overlap = resolved.filter((method) => forced.includes(normalizeAppealMethodValue(method)));
            return overlap.length > 0 ? overlap : forced;
        },
        [
            isOpponentRegistration,
            judgmentForm,
            lastJudgmentType,
            stageName,
            effectiveFinalDecision,
            appealRoute,
            stages,
            lawsuitFile,
            appealWindowLapsed,
            cassationWindowLapsed,
            partyJudgmentDispositions,
            forcedAllowedMethods,
        ],
    );

    const lapseStage = useMemo(
        () => ({
            stageName: stageName ?? undefined,
            decisionDate: decisionDate ?? undefined,
            appealDeadline: appealDeadline ?? undefined,
            legalTimers: cassationDeadline ? { cassationDeadline } : undefined,
            appealWindowLapsed,
            cassationWindowLapsed,
            awaitingOpponentAppeal: true as const,
        }),
        [
            stageName,
            decisionDate,
            appealDeadline,
            cassationDeadline,
            appealWindowLapsed,
            cassationWindowLapsed,
        ],
    );

    const offerAppealWindowLapse =
        isOpponentRegistration && shouldOfferAppealWindowLapse(lapseStage);
    const offerCassationWindowLapse =
        isOpponentRegistration
        && shouldOfferCassationWindowLapse(lapseStage)
        && !blocksCivilDossierFinality({
            stages,
            parties: currentParties,
            parentIntegrity: lawsuitFile?.disputeIntegrity,
        });

    const [appealType, setAppealType] = useState<string>(() =>
        defaultAppealType(judgmentForm, appealRoute, allowedOpponentMethods, stageName, canOfferAbsentObjection, stages),
    );

    const hopParties = useMemo(
        () => litigantsForAppealHopFromObjection(currentParties as Party[], appealType),
        [currentParties, appealType],
    );

    const standardAppellantSide = useMemo(() => {
        if (isOpponentRegistration) {
            return resolveOpponentAsAppellant(representedParty, hopParties);
        }
        return inferAppellantSideFromLawyer(representedParty, hopParties);
    }, [isOpponentRegistration, representedParty, hopParties]);

    const dossierLayout = useMemo(
        () =>
            isOpponentRegistration
                ? resolveOpponentRegistrationAppealLayout(
                      hopParties,
                      representedParty,
                      incidentalCases,
                  )
                : resolveAppealDossierLayout(hopParties, {
                      judgmentType,
                      representedParty,
                      incidentalCases,
                      standardAppellantSide,
                  }),
        [
            isOpponentRegistration,
            hopParties,
            judgmentType,
            representedParty,
            incidentalCases,
            standardAppellantSide,
        ],
    );

    const appellantParties = dossierLayout.appellantParties;
    const opponentParties = dossierLayout.opponentParties;
    const normalizedDispositions = useMemo(
        () => normalizePartyJudgmentDispositions(partyJudgmentDispositions),
        [partyJudgmentDispositions],
    );
    const sourceStageForTracks = useMemo(
        () =>
            (stages ?? []).find(
                (stage) => String(stage.stageName ?? stage.name ?? '') === String(stageName ?? ''),
            ) ?? (stages ?? []).find((stage) => Array.isArray(stage.partyChallengeLanes) && stage.partyChallengeLanes.length > 0),
        [stages, stageName],
    );
    const challengeFilterParams = useMemo(
        () => ({
            dispositions: normalizedDispositions.length > 0
                ? normalizedDispositions
                : sourceStageForTracks?.partyJudgmentDispositions,
            lanes: sourceStageForTracks?.partyChallengeLanes,
            scalarForm: judgmentForm ?? lastJudgmentType ?? sourceStageForTracks?.judgmentForm,
            judgmentType: String(judgmentType ?? '').trim() || undefined,
        }),
        [normalizedDispositions, sourceStageForTracks, judgmentForm, lastJudgmentType, judgmentType],
    );

    const [selectedAppellantIds, setSelectedAppellantIds] = useState<Array<number | string>>(
        () =>
            defaultSelectedChallengeAppellantIds(
                dossierLayout.appellantParties as Party[],
                preferredChallengerPartyId,
            ),
    );

    const [selectedOpponentIds, setSelectedOpponentIds] = useState<Array<number | string>>(
        () => dossierLayout.defaultOpponentIds,
    );

    const spawnIndependentDossier =
        Boolean(spawnIndependentDossierProp)
        || shouldSpawnIndependentChallengeDossier({
            stages,
            sourceStage: (stages.find((stage) => String(stage.stageName ?? stage.name ?? '') === String(stageName ?? ''))
                ?? { stageName, name: stageName }) as (typeof stages)[number],
            appealType,
        });

    const formEligibleAppellants = useMemo(
        () =>
            filterAppellantsByAppealInterest(
                filterAppellantPartiesByChallengeMethod(appellantParties as Party[], {
                    appealType,
                    dispositions: challengeFilterParams.dispositions,
                    lanes: challengeFilterParams.lanes,
                    scalarForm: challengeFilterParams.scalarForm,
                }),
                {
                    appealType,
                    judgmentType: challengeFilterParams.judgmentType,
                    dispositions: challengeFilterParams.dispositions,
                },
            ),
        [appellantParties, appealType, challengeFilterParams],
    );

    const visibleAppellantParties = useMemo(
        () => filterVisibleAppellantParties(formEligibleAppellants, selectedOpponentIds),
        [formEligibleAppellants, selectedOpponentIds],
    );
    const visibleOpponentParties = useMemo(
        () => filterVisibleOpponentParties(opponentParties, selectedAppellantIds),
        [opponentParties, selectedAppellantIds],
    );

    const { showAppellantPicker, showOpponentPicker } = useMemo(
        () =>
            resolveAppealPartyPickerVisibility({
                dossierLayout,
                visibleAppellantParties,
                visibleOpponentParties,
                parties: hopParties,
                incidentalCases,
            }),
        [dossierLayout, visibleAppellantParties, visibleOpponentParties, hopParties, incidentalCases],
    );

    const [filingDate, setFilingDate] = useState<string>(getLocalTodayYmd());
    const [newCaseNumber, setNewCaseNumber] = useState<string>('');
    const [courtName, setCourtName] = useState<string>(() => String(presetCourt ?? '').trim());
    const wasOpenRef = useRef(false);
    const caseNumberEditedRef = useRef(false);

    const applyDefaultCaseNumber = (_method: string) => {
        caseNumberEditedRef.current = false;
        setNewCaseNumber('');
    };

    useEffect(() => {
        if (!isOpen) {
            wasOpenRef.current = false;
            caseNumberEditedRef.current = false;
            return;
        }

        if (!wasOpenRef.current) {
            const initialType = defaultAppealType(
                judgmentForm,
                appealRoute,
                allowedOpponentMethods,
                stageName,
                canOfferAbsentObjection,
                stages,
            );
            setAppealType(initialType);
            setFilingDate(getLocalTodayYmd());
            applyDefaultCaseNumber(initialType);
            setCourtName(String(presetCourt ?? '').trim());
            setSelectedAppellantIds(
                defaultSelectedChallengeAppellantIds(
                    filterAppellantsByAppealInterest(
                        filterAppellantPartiesByChallengeMethod(dossierLayout.appellantParties as Party[], {
                            appealType: initialType,
                            dispositions: challengeFilterParams.dispositions,
                            lanes: challengeFilterParams.lanes,
                            scalarForm: challengeFilterParams.scalarForm,
                        }),
                        {
                            appealType: initialType,
                            judgmentType: challengeFilterParams.judgmentType,
                            dispositions: challengeFilterParams.dispositions,
                        },
                    ),
                    preferredChallengerPartyId,
                ),
            );
            setSelectedOpponentIds(dossierLayout.defaultOpponentIds);
            wasOpenRef.current = true;
        }
    }, [isOpen, judgmentForm, appealRoute, allowedOpponentMethods, dossierLayout, stageName, canOfferAbsentObjection, stages, sourceCaseNumber, presetCourt, challengeFilterParams, preferredChallengerPartyId]);

    useEffect(() => {
        if (!isOpen) return;
        if (isAppealWindowLapseMethod(appealType) || isCassationWindowLapseMethod(appealType)) return;
        const eligible = new Set(formEligibleAppellants.map((party) => String(party.id)));
        setSelectedAppellantIds((prev) => {
            const kept = prev.filter((id) => eligible.has(String(id)));
            if (kept.length === prev.length && (kept.length > 0 || prev.length === 0)) return prev;
            return kept.length > 0
                ? kept
                : defaultSelectedChallengeAppellantIds(formEligibleAppellants, preferredChallengerPartyId);
        });
    }, [isOpen, appealType, formEligibleAppellants, preferredChallengerPartyId]);

    const isPersonalAppeal = isPersonalStatusAppealContext(stageName, stages, lawsuitFile);
    const isFromAppealStage = !isPersonalAppeal && String(stageName ?? '').includes('استئناف');

    const appealTypeOptions = useMemo(() => {
        if (isFromAppealStage && !isOpponentRegistration) {
            return [{ value: 'تمييز', label: 'تمييز' }];
        }
        if (isOpponentRegistration) {
            return allowedOpponentMethods.map((method) => ({
                value: normalizeAppealMethodValue(method),
                label: appealMethodLabel(method),
            }));
        }
        const base = isGhayabi && canOfferAbsentObjection
            ? [
                  { value: 'اعتراض على الحكم الغيابي', label: 'اعتراض غيابي' },
                  ...(isPersonalAppeal ? [] : [{ value: 'استئناف', label: 'استئناف' }]),
                  { value: 'تمييز', label: 'تمييز' },
              ]
            : [
                  ...(isPersonalAppeal ? [] : [{ value: 'استئناف', label: 'استئناف' }]),
                  { value: 'تمييز', label: 'تمييز' },
              ];
        if (!appealRoute) {
            return isPersonalAppeal
                ? filterPersonalStatusAppealMethods(base.map((o) => o.value)).map(
                      (value) => base.find((o) => o.value === value) ?? { value, label: value },
                  )
                : base;
        }
        const allowedValues = filterMethodsForAppealRoute(
            base.map((o) => o.value),
            appealRoute,
        );
        const filtered = base.filter((o) => allowedValues.includes(o.value));
        return isPersonalAppeal ? filterPersonalStatusAppealMethods(filtered.map((o) => o.value)).map(
            (value) => filtered.find((o) => o.value === value) ?? { value, label: value },
        ) : filtered;
    }, [isFromAppealStage, isOpponentRegistration, allowedOpponentMethods, isGhayabi, appealRoute, isPersonalAppeal, canOfferAbsentObjection]);

    useEffect(() => {
        if (isAppealWindowLapseMethod(appealType) || isCassationWindowLapseMethod(appealType)) {
            return;
        }
        if (!appealTypeOptions.some((o) => o.value === appealType)) {
            setAppealType(appealTypeOptions[0]?.value ?? 'تمييز');
        }
    }, [appealTypeOptions, appealType]);

    const toggleOpponent = (id: number | string) => {
        const party = opponentParties.find((p) => String(p.id) === String(id));
        const interpleader = party && isInterpleaderAppealParty(party as Party);

        setSelectedOpponentIds((prev) => {
            const adding = !prev.some((x) => String(x) === String(id));
            if (adding && interpleader) {
                setSelectedAppellantIds((app) => app.filter((x) => String(x) !== String(id)));
                return [...prev, id];
            }
            return adding ? [...prev, id] : prev.filter((x) => String(x) !== String(id));
        });
    };

    const toggleAppellant = (id: number | string) => {
        const party = appellantParties.find((p) => String(p.id) === String(id));
        const interpleader = party && isInterpleaderAppealParty(party as Party);

        setSelectedAppellantIds((prev) => {
            const adding = !prev.some((x) => String(x) === String(id));
            if (adding && interpleader) {
                setSelectedOpponentIds((opp) => opp.filter((x) => String(x) !== String(id)));
                return [...prev, id];
            }
            return adding ? [...prev, id] : prev.filter((x) => String(x) !== String(id));
        });
    };

    const appellantLabel = dossierLayout.appellantSideLabel;
    const opponentLabel = dossierLayout.opponentSideLabel;

    const handleAppealTypeChange = (value: string) => {
        setAppealType(value);
        applyDefaultCaseNumber(value);
    };

    const handleCaseNumberChange = (value: string) => {
        caseNumberEditedRef.current = true;
        setNewCaseNumber(value);
    };

    const caseNumberLabel = appealType.includes('تمييز')
        ? 'رقم دعوى التمييز'
        : appealType.includes('اعتراض')
          ? 'رقم دعوى الاعتراض'
          : isPersonalAppeal
            ? 'رقم دعوى الطعن'
            : 'رقم دعوى الاستئناف';

    const {
        appellantPickerCard,
        opponentPickerCard,
        appellantPickerTitle,
        opponentPickerTitle,
        appellantRowSelected,
        appellantRowIdle,
        appellantCheckSelected,
        opponentRowSelected,
        opponentRowIdle,
        opponentCheckSelected,
    } = resolveAppealTransitionChrome(s);

    const isLapseSelection =
        isAppealWindowLapseMethod(appealType) || isCassationWindowLapseMethod(appealType);

    const showCourtField =
        !isLapseSelection
        && !isPersonalAppeal
        && (appealType === 'استئناف' || appealType.includes('استئناف'))
        && !appealType.includes('تمييز')
        && !appealType.includes('اعتراض');
    const showIdentityCourtField = showCourtField || spawnIndependentDossier;

    const handleSubmit = () => {
        if (isLapseSelection) {
            onConfirm({
                appealType,
                appellant: dossierLayout.appellantLegalSide,
                filingDate: getLocalTodayYmd(),
                newCaseNumber: '',
                notes: '',
                newCourt: String(presetCourt ?? '').trim() || undefined,
            });
            onClose();
            return;
        }
        const effectiveAppellantIds = showAppellantPicker
            ? selectedAppellantIds.filter((id) =>
                visibleAppellantParties.some((party) => String(party.id) === String(id)),
            )
            : visibleAppellantParties.map((party) => party.id);
        if (effectiveAppellantIds.length === 0) {
            SmartToast.error(
                visibleAppellantParties.length === 0
                    ? 'لا يوجد طرف يمكن تسجيل الطعن باسمه'
                    : 'حدّد من قام بالطعن',
            );
            return;
        }
        if (showOpponentPicker && selectedOpponentIds.length === 0) {
            SmartToast.error('⚠️ اختر طرفاً واحداً على الأقل للمخاصمة في الطعن');
            return;
        }
        if (spawnIndependentDossier) {
            const court = String(courtName ?? '').trim();
            const caseNo = String(newCaseNumber ?? '').trim();
            if (!court) {
                SmartToast.error('أدخل اسم محكمة الاستئناف قبل إنشاء الإضبارة المستقلة');
                return;
            }
            if (!caseNo) {
                SmartToast.error('أدخل رقم دعوى الاستئناف قبل إنشاء الإضبارة المستقلة');
                return;
            }
        }
        if (
            isDisputeIndivisible(lawsuitFile?.disputeIntegrity)
        ) {
            const selectedForJoinder = showOpponentPicker
                ? selectedOpponentIds
                : dossierLayout.defaultOpponentIds;
            const missing = missingCompulsoryJoinderIds(
                dossierLayout.defaultOpponentIds,
                selectedForJoinder,
            );
            if (missing.length > 0) {
                SmartToast.error('وحدة النزاع تلزم اختصام كافة المحكوم لهم في عريضة الطعن');
                return;
            }
        }
        const appellantLegalSide = resolveAppellantLegalSideFromSelection(
            effectiveAppellantIds,
            appellantParties,
            dossierLayout.appellantLegalSide,
        );

        const normalizedAppealType = normalizePersonalStatusAppealMethod(appealType, {
            stageName,
            stages,
            file: lawsuitFile,
        });
        const resolvedCourt = showIdentityCourtField
            ? String(courtName ?? '').trim() || String(presetCourt ?? '').trim() || undefined
            : String(presetCourt ?? '').trim() || undefined;
        onConfirm({
            appealType: normalizedAppealType,
            appellant: appellantLegalSide,
            filingDate,
            newCaseNumber: resolveAppealStageCaseNumber(
                normalizedAppealType,
                newCaseNumber,
                sourceCaseNumber,
            ),
            notes: '',
            newCourt: resolvedCourt,
            includedOpponentPartyIds: isDisputeIndivisible(lawsuitFile?.disputeIntegrity)
                ? (showOpponentPicker ? selectedOpponentIds : dossierLayout.defaultOpponentIds)
                : (showOpponentPicker ? selectedOpponentIds : undefined),
            includedAppellantPartyIds: effectiveAppellantIds,
            appealDossierMode: dossierLayout.mode,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={s.overlay} dir="rtl">
            <div className={s.shell}>
                <AppealTransitionModalHeader
                    s={s}
                    isOpponentRegistration={isOpponentRegistration}
                    isGhayabi={isGhayabi}
                    onClose={onClose}
                />

                <AppealTransitionModalBody
                    s={s}
                    appealType={appealType}
                    setAppealType={handleAppealTypeChange}
                    appealTypeOptions={appealTypeOptions}
                    offerAppealWindowLapse={offerAppealWindowLapse}
                    offerCassationWindowLapse={offerCassationWindowLapse}
                    showAppellantPicker={showAppellantPicker && !isLapseSelection}
                    showOpponentPicker={showOpponentPicker && !isLapseSelection}
                    isOpponentRegistration={isOpponentRegistration}
                    appellantLabel={appellantLabel}
                    opponentLabel={opponentLabel}
                    appellantPickerCard={appellantPickerCard}
                    opponentPickerCard={opponentPickerCard}
                    appellantPickerTitle={appellantPickerTitle}
                    opponentPickerTitle={opponentPickerTitle}
                    visibleAppellantParties={visibleAppellantParties}
                    visibleOpponentParties={visibleOpponentParties}
                    selectedAppellantIds={selectedAppellantIds}
                    selectedOpponentIds={selectedOpponentIds}
                    appellantRowSelected={appellantRowSelected}
                    appellantRowIdle={appellantRowIdle}
                    appellantCheckSelected={appellantCheckSelected}
                    opponentRowSelected={opponentRowSelected}
                    opponentRowIdle={opponentRowIdle}
                    opponentCheckSelected={opponentCheckSelected}
                    toggleAppellant={toggleAppellant}
                    toggleOpponent={toggleOpponent}
                    filingDate={filingDate}
                    setFilingDate={setFilingDate}
                    newCaseNumber={newCaseNumber}
                    setNewCaseNumber={handleCaseNumberChange}
                    caseNumberLabel={caseNumberLabel}
                    caseNumberOptional={!spawnIndependentDossier}
                    hideFilingFields={isLapseSelection}
                    showCourtField={showIdentityCourtField}
                    courtName={courtName}
                    setCourtName={setCourtName}
                    courtFieldRequired={spawnIndependentDossier}
                />

                <AppealTransitionModalFooter
                    s={s}
                    isOpponentRegistration={isOpponentRegistration}
                    submitLabel={
                        isLapseSelection
                            ? 'تأكيد'
                            : spawnIndependentDossier
                              ? 'إنشاء طعن استئنافي مستقل'
                              : undefined
                    }
                    onSubmit={handleSubmit}
                    onClose={onClose}
                />
            </div>
        </div>
    );
};
