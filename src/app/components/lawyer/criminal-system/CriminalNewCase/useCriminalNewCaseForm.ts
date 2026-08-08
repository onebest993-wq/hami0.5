import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useCriminalStore, resolveOurRepresentationFromCaseRecord } from '../criminalStore';
import {
    isInvestigationStoredStage,
    isStageAllowedForNewCasePartyMix,
    normalizeLegacyCriminalStage,
    resolveNewCaseStageSelectOptions,
} from '../criminalStageUtils';
import {
    resolveInvestigationDefendantsPartyMix,
    JUVENILE_TRIAL_COURT_NAME,
} from '../juvenileInvestigationRules';
import {
    defendantsJuvenileMonitorFingerprint,
    resolveInvestigationLocationPatchForPartyMix,
} from '../juvenileMixedCaseSplitEngine';
import { isInvestigationDraftLocationIncomplete } from '../investigationDraftValidation';
import {
    draftHasNamedIdentifiedDefendant,
    draftIsAllUnknownDefendants,
    getIdentifiedDefendants,
    getUnknownIdentityDefendants,
    isComplaintRestrictedToInvestigationOnly,
    isDefendantIdentityUnknown,
    newCaseStageLockedToInvestigationForUnknown,
} from '../criminalUnknownDefendant';
import {
    NEW_CASE_ALL_UNKNOWN_INVESTIGATION_ONLY_MESSAGE,
    NEW_CASE_MIXED_UNKNOWN_IDENTIFIED_STAGE_BLOCKED_MESSAGE,
} from '../investigationPhaseGuidance';
import { isJuvenileCourtNature } from './helpers';
import type { CriminalNewCaseProps } from './types';

export function useCriminalNewCaseForm({
    severanceFormMode = false,
    onCreated,
}: Pick<CriminalNewCaseProps, 'severanceFormMode' | 'onCreated'>) {
    const draft = useCriminalStore((s) => s.draft);
    const setBasicField = useCriminalStore((s) => s.setBasicField);
    const setLocationField = useCriminalStore((s) => s.setLocationField);
    const addComplainant = useCriminalStore((s) => s.addComplainant);
    const deleteComplainant = useCriminalStore((s) => s.deleteComplainant);
    const setComplainantField = useCriminalStore((s) => s.setComplainantField);
    const setDraftMutualComplaint = useCriminalStore((s) => s.setDraftMutualComplaint);
    const setDraftPublicProsecutionComplainant = useCriminalStore((s) => s.setDraftPublicProsecutionComplainant);
    const setDraftArticleIncludesPublicRight = useCriminalStore((s) => s.setDraftArticleIncludesPublicRight);
    const setUnknownDefendant = useCriminalStore((s) => s.setUnknownDefendant);
    const addUnknownDefendant = useCriminalStore((s) => s.addUnknownDefendant);
    const toggleDraftDefendantIdentityUnknown = useCriminalStore((s) => s.toggleDraftDefendantIdentityUnknown);
    const addDefendant = useCriminalStore((s) => s.addDefendant);
    const deleteDefendant = useCriminalStore((s) => s.deleteDefendant);
    const setDefendantField = useCriminalStore((s) => s.setDefendantField);
    const setDraftDefendantGuarantor = useCriminalStore((s) => s.setDraftDefendantGuarantor);
    const toggleDraftComplainantOfficeClient = useCriminalStore((s) => s.toggleDraftComplainantOfficeClient);
    const toggleDraftDefendantOfficeClient = useCriminalStore((s) => s.toggleDraftDefendantOfficeClient);
    const createCaseFromDraft = useCriminalStore((s) => s.createCaseFromDraft);
    const resetDraft = useCriminalStore((s) => s.resetDraft);
    const pendingSeveranceContext = useCriminalStore((s) => s.pendingSeveranceContext);
    const commitSeveranceFromDossier = useCriminalStore((s) => s.commitSeveranceFromDossier);
    const stashPendingSeveranceForm = useCriminalStore((s) => s.stashPendingSeveranceForm);
    const resumePendingSeveranceForm = useCriminalStore((s) => s.resumePendingSeveranceForm);
    const setPendingSeveranceReason = useCriminalStore((s) => s.setPendingSeveranceReason);

    const isSeveranceMode = severanceFormMode && Boolean(pendingSeveranceContext);
    const parentCaseRecord = useCriminalStore((s) =>
        pendingSeveranceContext ? s.casesById[pendingSeveranceContext.parentCaseId] : undefined,
    );

    const stage = draft.basics.stage;
    const ourRepresentation = draft.basics.ourRepresentation;
    const isReferralStage = stage !== '' && !isInvestigationStoredStage(stage);
    const isCassationStage = stage === 'cassation_court';
    const isJuvenileInvestigationStage = stage === 'تحقيق الأحداث';

    const showUnknownDefendantOption = useMemo(() => {
        if (ourRepresentation === 'defendant_side') return false;
        if (ourRepresentation === 'complainant_side') return true;
        if (isSeveranceMode && parentCaseRecord) {
            return resolveOurRepresentationFromCaseRecord(parentCaseRecord) === 'complainant_side';
        }
        return true;
    }, [ourRepresentation, isSeveranceMode, parentCaseRecord]);

    useEffect(() => {
        const current = draft.basics.stage;
        const normalized = normalizeLegacyCriminalStage(String(current), draft.basics.crimeType);
        if (normalized && normalized !== current) {
            setBasicField('stage', normalized);
        }
    }, [draft.basics.crimeType, draft.basics.stage, setBasicField]);

    useEffect(() => {
        if (!severanceFormMode) return;
        resumePendingSeveranceForm();
        return () => {
            stashPendingSeveranceForm();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [severanceFormMode]);

    useEffect(() => {
        if (showUnknownDefendantOption) return;
        if (draft.unknownDefendant || draft.defendants.some((d) => isDefendantIdentityUnknown(d))) {
            setUnknownDefendant(false);
        }
    }, [showUnknownDefendantOption, draft.unknownDefendant, draft.defendants, setUnknownDefendant]);

    const ensureFirstDefendantJuvenile = useCallback(() => {
        const identified = getIdentifiedDefendants(draft.defendants);
        const first = identified[0];
        if (!first?.id || first.isJuvenile) return;
        setDefendantField(first.id, 'isJuvenile', true);
    }, [draft.defendants, setDefendantField]);

    useEffect(() => {
        if (!isReferralStage && !isCassationStage) return;
        if (!isJuvenileCourtNature(draft.location.courtName)) return;
        ensureFirstDefendantJuvenile();
    }, [draft.location.courtName, isReferralStage, isCassationStage, ensureFirstDefendantJuvenile]);

    const prevStageRef = useRef(stage);
    useEffect(() => {
        if (stage === 'cassation_court' && prevStageRef.current !== 'cassation_court') {
            setLocationField('courtName', '');
            setLocationField('caseNumber', '');
        }
        prevStageRef.current = stage;
    }, [stage, setLocationField]);

    const isTrialOrCassation =
        stage === 'محكمة الجنح' ||
        stage === 'محكمة الجنايات' ||
        stage === 'محكمة الأحداث' ||
        stage === 'cassation_court';

    const investigationPartyMix = useMemo(
        () => resolveInvestigationDefendantsPartyMix(draft.defendants),
        [draft.defendants],
    );

    const defendantsJuvenileFingerprint = useMemo(
        () => defendantsJuvenileMonitorFingerprint(draft.defendants),
        [draft.defendants],
    );

    const newCaseStageOptions = useMemo(() => {
        const base = resolveNewCaseStageSelectOptions(investigationPartyMix);
        if (!newCaseStageLockedToInvestigationForUnknown(draft.defendants)) {
            return base;
        }
        return base.filter((opt) => isInvestigationStoredStage(opt.value));
    }, [investigationPartyMix, draft.defendants]);

    useEffect(() => {
        if (!isInvestigationStoredStage(stage)) return;
        const patch = resolveInvestigationLocationPatchForPartyMix(investigationPartyMix);
        if (!patch) return;
        if (
            patch.investigationCourtName &&
            String(draft.location.investigationCourtName ?? '').trim() !== patch.investigationCourtName
        ) {
            setLocationField('investigationCourtName', patch.investigationCourtName);
        }
        if (
            patch.investigationPapersAt &&
            draft.location.investigationPapersAt !== patch.investigationPapersAt
        ) {
            setLocationField('investigationPapersAt', patch.investigationPapersAt);
        }
    }, [
        stage,
        investigationPartyMix,
        defendantsJuvenileFingerprint,
        draft.location.investigationCourtName,
        draft.location.investigationPapersAt,
        setLocationField,
    ]);

    useEffect(() => {
        if (investigationPartyMix !== 'juveniles_only' || stage !== 'محكمة الأحداث') return;
        const court = String(draft.location.courtName ?? '').trim();
        if (court !== JUVENILE_TRIAL_COURT_NAME) {
            setLocationField('courtName', JUVENILE_TRIAL_COURT_NAME);
        }
    }, [investigationPartyMix, stage, draft.location.courtName, setLocationField]);

    const complainantCardTitle = useMemo(() => {
        if (isInvestigationStoredStage(stage)) return 'بيانات مشتكي / مدعي بالحق الشخصي';
        if (isTrialOrCassation) return 'بيانات المجني عليه';
        return 'بيانات المشتكي / المجني عليه';
    }, [isTrialOrCassation, stage]);

    const defendantCardTitle = useMemo(() => {
        if (ourRepresentation === 'defendant_side') {
            return isTrialOrCassation ? 'بيانات موكلنا (المتهم)' : 'بيانات موكلنا (المشكو منه)';
        }
        if (isInvestigationStoredStage(stage)) return 'بيانات المشكو منه';
        if (isTrialOrCassation) return 'بيانات المتهم / الحَدَث';
        return 'بيانات المشكو منه / المتهم';
    }, [isTrialOrCassation, ourRepresentation, stage]);

    const isTrialCourtStage =
        stage === 'محكمة الجنح' || stage === 'محكمة الجنايات' || stage === 'محكمة الأحداث';

    const unknownDefendants = useMemo(
        () => getUnknownIdentityDefendants(draft.defendants),
        [draft.defendants],
    );

    const identifiedDefendantsForForm = useMemo(
        () => draft.defendants.filter((d) => !isDefendantIdentityUnknown(d)),
        [draft.defendants],
    );

    const primaryDefendantSlotId = useMemo(
        () => String(draft.defendants[0]?.id ?? '').trim(),
        [draft.defendants],
    );

    const locksStageToInvestigation = useMemo(
        () => newCaseStageLockedToInvestigationForUnknown(draft.defendants),
        [draft.defendants],
    );

    const allDefendantsUnknownOnly = useMemo(
        () => isComplaintRestrictedToInvestigationOnly(draft.defendants),
        [draft.defendants],
    );

    const mixedUnknownWithIdentified = useMemo(
        () => locksStageToInvestigation && !allDefendantsUnknownOnly,
        [locksStageToInvestigation, allDefendantsUnknownOnly],
    );

    const hasNamedIdentifiedDefendant = useMemo(
        () => draftHasNamedIdentifiedDefendant(draft.defendants),
        [draft.defendants],
    );

    const allDefendantsAreUnknown = useMemo(
        () => draftIsAllUnknownDefendants(draft.defendants),
        [draft.defendants],
    );

    useEffect(() => {
        if (isSeveranceMode) return;
        if (locksStageToInvestigation) {
            if (stage && !isInvestigationStoredStage(stage)) {
                if (typeof globalThis.alert === 'function') {
                    globalThis.alert(
                        allDefendantsUnknownOnly
                            ? NEW_CASE_ALL_UNKNOWN_INVESTIGATION_ONLY_MESSAGE
                            : NEW_CASE_MIXED_UNKNOWN_IDENTIFIED_STAGE_BLOCKED_MESSAGE,
                    );
                }
                setBasicField(
                    'stage',
                    investigationPartyMix === 'juveniles_only' ? 'تحقيق الأحداث' : 'مرحلة التحقيق',
                );
            }
            return;
        }
        if (!isStageAllowedForNewCasePartyMix(stage, investigationPartyMix)) {
            setBasicField('stage', '');
        }
    }, [
        investigationPartyMix,
        defendantsJuvenileFingerprint,
        stage,
        locksStageToInvestigation,
        allDefendantsUnknownOnly,
        setBasicField,
        isSeveranceMode,
    ]);

    const investigationLocationIncomplete = isInvestigationDraftLocationIncomplete(stage, draft.location);
    const isPublicProsecutionComplainant = draft.isPublicProsecutionComplainant === true;
    const showMutualComplaintOption = !isPublicProsecutionComplainant;

    const complainantGuardianDataIncomplete = draft.complainants.some((c) => {
        const isMinor = Boolean((c as { isJuvenile?: boolean }).isJuvenile) ||
            Boolean((c as { isUnderSeven?: boolean }).isUnderSeven);
        if (!isMinor) return false;
        return (
            !String((c as { guardianName?: string }).guardianName ?? '').trim() ||
            !String((c as { guardianRelationship?: string }).guardianRelationship ?? '').trim()
        );
    });

    const identifiedDefendantSaveIncomplete =
        !allDefendantsAreUnknown &&
        (!hasNamedIdentifiedDefendant ||
            identifiedDefendantsForForm.some((d) => !String(d.fullName ?? '').trim()));

    const isSaveBlocked =
        !ourRepresentation ||
        stage === '' ||
        (!isPublicProsecutionComplainant &&
            draft.complainants.some((c) => !String(c.fullName ?? '').trim())) ||
        identifiedDefendantSaveIncomplete ||
        investigationLocationIncomplete ||
        complainantGuardianDataIncomplete ||
        (isSeveranceMode &&
            pendingSeveranceContext?.severanceReason === 'other' &&
            !String(pendingSeveranceContext?.severanceReasonDetail ?? '').trim()) ||
        (isReferralStage &&
            (!draft.basics.legalArticle.trim() ||
                !draft.location.baseRegisterNumberAndDate.trim() ||
                !draft.location.investigationCourtName.trim() ||
                (isTrialCourtStage &&
                    (!draft.location.courtName.trim() || !draft.location.caseNumber.trim()))));

    const handleExitSeveranceForm = () => {
        if (isSeveranceMode) stashPendingSeveranceForm();
    };

    const pendingSeveranceReason = pendingSeveranceContext?.severanceReason;
    const pendingSeveranceReasonDetail = pendingSeveranceContext?.severanceReasonDetail ?? '';
    const severanceLockedStage = pendingSeveranceContext?.lockedCaseStage ?? '';

    useEffect(() => {
        if (!isSeveranceMode || !severanceLockedStage) return;
        if (draft.basics.stage !== severanceLockedStage) {
            setBasicField('stage', severanceLockedStage);
        }
    }, [isSeveranceMode, severanceLockedStage, draft.basics.stage, setBasicField]);

    const handleSubmit = useCallback(() => {
        if (isSaveBlocked) return;
        if (isSeveranceMode) {
            const severedId = commitSeveranceFromDossier();
            if (!severedId) return;
            resetDraft();
            onCreated(severedId);
            return;
        }
        const caseId = createCaseFromDraft();
        resetDraft();
        onCreated(caseId);
    }, [
        isSaveBlocked,
        isSeveranceMode,
        commitSeveranceFromDossier,
        resetDraft,
        onCreated,
        createCaseFromDraft,
    ]);

    return {
        draft,
        stage,
        isSeveranceMode,
        isReferralStage,
        isCassationStage,
        isJuvenileInvestigationStage,
        isPublicProsecutionComplainant,
        showMutualComplaintOption,
        showUnknownDefendantOption,
        investigationPartyMix,
        newCaseStageOptions,
        locksStageToInvestigation,
        allDefendantsUnknownOnly,
        mixedUnknownWithIdentified,
        complainantCardTitle,
        defendantCardTitle,
        unknownDefendants,
        identifiedDefendantsForForm,
        primaryDefendantSlotId,
        severanceLockedStage,
        pendingSeveranceReason,
        pendingSeveranceReasonDetail,
        investigationLocationIncomplete,
        identifiedDefendantSaveIncomplete,
        complainantGuardianDataIncomplete,
        isSaveBlocked,
        handleExitSeveranceForm,
        handleSubmit,
        ensureFirstDefendantJuvenile,
        setBasicField,
        setLocationField,
        addComplainant,
        deleteComplainant,
        setComplainantField,
        setDraftMutualComplaint,
        setDraftPublicProsecutionComplainant,
        setDraftArticleIncludesPublicRight,
        toggleDraftDefendantIdentityUnknown,
        addDefendant,
        deleteDefendant,
        setDefendantField,
        setDraftDefendantGuarantor,
        toggleDraftComplainantOfficeClient,
        toggleDraftDefendantOfficeClient,
        addUnknownDefendant,
        setPendingSeveranceReason,
    };
}
