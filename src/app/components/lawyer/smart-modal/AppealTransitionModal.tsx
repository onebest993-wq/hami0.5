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
} from './smartFile/appealPartyEngine';
import {
    filterMethodsForAppealRoute,
    isAppellateAppealAllowed,
    resolveCassationOnlyHint,
} from './smartFile/appealRouteEligibility';
import { resolveAllowedOpponentAppealMethods } from './smartFile/judgmentTypes';
import { isAbsentJudgmentForm, canOfferAbsentObjectionToDefendant } from './smartFile/absentJudgmentFlow';
import {
    filterPersonalStatusAppealMethods,
    isPersonalStatusAppealContext,
    normalizePersonalStatusAppealMethod,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { useJudgmentModalStyles } from './smartFile/smartModalChrome';
import {
    appealMethodLabel,
    defaultAppealType,
    normalizeAppealMethodValue,
    resolveAppealOutcomeHint,
} from './appealTransitionModalHelpers';
import {
    deriveAbsentObjectionCaseNumber,
    resolveAppealStageCaseNumber,
    shouldDeriveAbsentObjectionCaseNumber,
} from './smartFile/absentObjectionCaseNumber';
import { resolveAppealTransitionChrome } from './appealTransitionModalChrome';
import { AppealTransitionModalHeader } from './AppealTransitionModalHeader';
import { AppealTransitionModalBody } from './AppealTransitionModalBody';
import { AppealTransitionModalFooter } from './AppealTransitionModalFooter';
import type { AppealTransitionModalProps } from './AppealTransitionModal.types';

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
}) => {
    const s = useJudgmentModalStyles();
    const isOpponentRegistration = mode === 'opponentRegistration';
    const isGhayabi = isAbsentJudgmentForm(judgmentForm, lastJudgmentType);
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
            }),
        [
            stageName,
            stages,
            judgmentForm,
            lastJudgmentType,
            effectiveFinalDecision,
            representedParty,
            isOpponentRegistration,
        ],
    );
    const showJudgmentFormMeta =
        Boolean(judgmentForm) &&
        !String(stageName ?? '').includes('استئناف') &&
        !String(stageName ?? '').includes('تمييز');
    const allowedOpponentMethods = useMemo(
        () =>
            isOpponentRegistration
                ? resolveAllowedOpponentAppealMethods({
                      judgmentForm,
                      lastJudgmentType,
                      stageName,
                      finalDecision: effectiveFinalDecision,
                      appealRoute,
                      stages,
                      file: lawsuitFile,
                  })
                : [],
        [
            isOpponentRegistration,
            judgmentForm,
            lastJudgmentType,
            stageName,
            effectiveFinalDecision,
            appealRoute,
            stages,
            lawsuitFile,
        ],
    );

    const standardAppellantSide = useMemo(() => {
        if (isOpponentRegistration) {
            return resolveOpponentAsAppellant(representedParty, currentParties);
        }
        return inferAppellantSideFromLawyer(representedParty, currentParties);
    }, [isOpponentRegistration, representedParty, currentParties]);

    const dossierLayout = useMemo(
        () =>
            isOpponentRegistration
                ? resolveOpponentRegistrationAppealLayout(
                      currentParties as Party[],
                      representedParty,
                      incidentalCases,
                  )
                : resolveAppealDossierLayout(currentParties as Party[], {
                      judgmentType,
                      representedParty,
                      incidentalCases,
                      standardAppellantSide,
                  }),
        [
            isOpponentRegistration,
            currentParties,
            judgmentType,
            representedParty,
            incidentalCases,
            standardAppellantSide,
        ],
    );

    const appellantParties = dossierLayout.appellantParties;
    const opponentParties = dossierLayout.opponentParties;

    const [selectedAppellantIds, setSelectedAppellantIds] = useState<Array<number | string>>(
        () => dossierLayout.defaultAppellantIds,
    );

    const [selectedOpponentIds, setSelectedOpponentIds] = useState<Array<number | string>>(
        () => dossierLayout.defaultOpponentIds,
    );

    const visibleAppellantParties = useMemo(
        () => filterVisibleAppellantParties(appellantParties, selectedOpponentIds),
        [appellantParties, selectedOpponentIds],
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
                parties: currentParties as Party[],
                incidentalCases,
            }),
        [dossierLayout, visibleAppellantParties, visibleOpponentParties, currentParties, incidentalCases],
    );

    const [appealType, setAppealType] = useState<string>(() =>
        defaultAppealType(judgmentForm, appealRoute, allowedOpponentMethods, stageName, canOfferAbsentObjection, stages),
    );
    const [filingDate, setFilingDate] = useState<string>(getLocalTodayYmd());
    const [newCaseNumber, setNewCaseNumber] = useState<string>('');
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
            setSelectedAppellantIds(dossierLayout.defaultAppellantIds);
            setSelectedOpponentIds(dossierLayout.defaultOpponentIds);
            wasOpenRef.current = true;
        }
    }, [isOpen, judgmentForm, appealRoute, allowedOpponentMethods, dossierLayout, stageName, canOfferAbsentObjection, stages, sourceCaseNumber]);

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

    const cassationOnlyHint =
        appealRoute && !isAppellateAppealAllowed(appealRoute)
            ? resolveCassationOnlyHint(appealRoute)
            : null;

    useEffect(() => {
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
        hintShell,
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

    const handleSubmit = () => {
        if (showAppellantPicker && selectedAppellantIds.length === 0) {
            SmartToast.error('⚠️ اختر طرفاً واحداً على الأقل من الطاعنين');
            return;
        }
        if (showOpponentPicker && selectedOpponentIds.length === 0) {
            SmartToast.error('⚠️ اختر طرفاً واحداً على الأقل للمخاصمة في الطعن');
            return;
        }
        const appellantLegalSide = resolveAppellantLegalSideFromSelection(
            showAppellantPicker ? selectedAppellantIds : dossierLayout.defaultAppellantIds,
            appellantParties,
            dossierLayout.appellantLegalSide,
        );

        const normalizedAppealType = normalizePersonalStatusAppealMethod(appealType, {
            stageName,
            stages,
            file: lawsuitFile,
        });
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
            includedOpponentPartyIds: showOpponentPicker ? selectedOpponentIds : undefined,
            includedAppellantPartyIds: showAppellantPicker ? selectedAppellantIds : undefined,
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
                    hintShell={hintShell}
                    judgmentType={judgmentType}
                    cassationOnlyHint={cassationOnlyHint}
                    showJudgmentFormMeta={showJudgmentFormMeta}
                    judgmentForm={judgmentForm}
                    appealType={appealType}
                    setAppealType={handleAppealTypeChange}
                    appealTypeOptions={appealTypeOptions}
                    showAppellantPicker={showAppellantPicker}
                    showOpponentPicker={showOpponentPicker}
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
                    caseNumberOptional
                    caseNumberHint={
                        shouldDeriveAbsentObjectionCaseNumber(appealType) && sourceCaseNumber
                            ? `اقتراح عند توفر الرقم: ${deriveAbsentObjectionCaseNumber(sourceCaseNumber)}`
                            : undefined
                    }
                />

                <AppealTransitionModalFooter
                    s={s}
                    isOpponentRegistration={isOpponentRegistration}
                    onSubmit={handleSubmit}
                    onClose={onClose}
                />
            </div>
        </div>
    );
};
