import { useState, useEffect, useMemo, useRef } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    PathwayType,
    getProcedureDetailsGuidance,
    isIqrarRequest,
    resolveStoredPathwayType,
    PETITION_ORDER_MANUAL_OPTION,
    JUDICIAL_ACKNOWLEDGMENT_PRIMARY,
} from './constants';
import type { UrgentActionsFormProps, UrgentActionFormData } from './urgentActionsFormTypes';
import { buildUrgentActionsSubmitPayload, validateUrgentActionsForm } from './buildUrgentActionsSubmitPayload';
import { resolveUrgentPartyLabels } from './resolveUrgentPartyLabels';
import { useUrgentActionsFormParties } from './useUrgentActionsFormParties';

export type { UrgentActionsFormProps } from './urgentActionsFormTypes';

export function useUrgentActionsForm(props: UrgentActionsFormProps) {
    const { onClose, onSave, initialActionType } = props;
    const closeRequestedRef = useRef(false);
    const selectedPathway: PathwayType = 'state_order';
    const parties = useUrgentActionsFormParties();

    const [selectedSubActionType, setSelectedSubActionType] = useState<string>('');
    const [customSpecificActionType, setCustomSpecificActionType] = useState<string>('');
    const [formData, setFormData] = useState<UrgentActionFormData>({
        actionType: 'state_order',
        requestNumber: '',
        requestDate: getLocalTodayYmd(),
        firstHearingDate: '',
        courtName: '',
        judgeName: '',
        specificActionType: '',
        procedureDetails: '',
        requestSubject: '',
        urgentReason: '',
        legalBasis: '',
        deadlineGrievance3Days: false,
        deadlineTamyeez7Days: false,
        notes: '',
        defenderEntryPhase: 1,
        stateOrderIssuedDate: '',
        defenderPhase3GrievanceDecisionDate: '',
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!initialActionType) return;
        if (initialActionType === 'acknowledgment') {
            setSelectedSubActionType(JUDICIAL_ACKNOWLEDGMENT_PRIMARY);
            setCustomSpecificActionType('');
            setFormData((prev) => ({
                ...prev,
                actionType: 'state_order',
                specificActionType: JUDICIAL_ACKNOWLEDGMENT_PRIMARY,
            }));
            return;
        }
        setFormData((prev) => ({
            ...prev,
            actionType: 'state_order',
        }));
    }, [initialActionType]);

    const resolvedSpecificActionTypeLive = useMemo(() => {
        if (selectedSubActionType === 'other' || selectedSubActionType === PETITION_ORDER_MANUAL_OPTION) {
            return customSpecificActionType.trim();
        }
        return String(selectedSubActionType || formData.specificActionType || '').trim();
    }, [selectedSubActionType, customSpecificActionType, formData.specificActionType]);

    const isIqrarContext = useMemo(
        () => isIqrarRequest(resolvedSpecificActionTypeLive),
        [resolvedSpecificActionTypeLive],
    );
    const partyLabels = useMemo(
        () => resolveUrgentPartyLabels(resolvedSpecificActionTypeLive),
        [resolvedSpecificActionTypeLive],
    );
    const guidancePathwayForCopy = useMemo(
        () => resolveStoredPathwayType(resolvedSpecificActionTypeLive),
        [resolvedSpecificActionTypeLive],
    );
    const procedureDetailsGuidance = useMemo(
        () => getProcedureDetailsGuidance(guidancePathwayForCopy, selectedSubActionType, customSpecificActionType),
        [guidancePathwayForCopy, selectedSubActionType, customSpecificActionType],
    );

    const party2Hidden = useMemo(() => {
        if (selectedPathway !== 'state_order') return false;
        const hiddenTypes = ['القسم الشرعي', 'إذن زواج', 'حجة وصاية'];
        return hiddenTypes.includes(formData.specificActionType);
    }, [selectedPathway, formData.specificActionType]);

    const isRespondentClient = useMemo(() => {
        if (isIqrarContext) return false;
        if (selectedPathway !== 'state_order' || party2Hidden) return false;
        return parties.party2List.some((p) => !!p.isRepresented);
    }, [isIqrarContext, party2Hidden, parties.party2List, selectedPathway]);

    useEffect(() => {
        if (!party2Hidden) return;
        parties.clearParty2ClientMarks();
    }, [party2Hidden, parties.clearParty2ClientMarks]);

    const submitContext = useMemo(
        () => ({
            formData,
            party1List: parties.party1List,
            party2List: parties.party2List,
            selectedSubActionType,
            customSpecificActionType,
            party2Hidden,
            isRespondentClient,
        }),
        [
            formData,
            parties.party1List,
            parties.party2List,
            selectedSubActionType,
            customSpecificActionType,
            party2Hidden,
            isRespondentClient,
        ],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const errors = validateUrgentActionsForm(submitContext);
        setValidationErrors(errors);
        if (Object.keys(errors).length > 0) return;
        onSave(buildUrgentActionsSubmitPayload(submitContext));
    };

    const updateField = <K extends keyof UrgentActionFormData>(field: K, value: UrgentActionFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const safeClose = () => {
        if (closeRequestedRef.current) return;
        closeRequestedRef.current = true;
        onClose();
    };

    return {
        selectedPathway,
        selectedSubActionType,
        setSelectedSubActionType,
        customSpecificActionType,
        setCustomSpecificActionType,
        party1List: parties.party1List,
        party2List: parties.party2List,
        party1EndRef: parties.party1EndRef,
        party2EndRef: parties.party2EndRef,
        formData,
        validationErrors,
        addParty1: parties.addParty1,
        removeParty1: parties.removeParty1,
        updateParty1: parties.updateParty1,
        addParty2: parties.addParty2,
        removeParty2: parties.removeParty2,
        updateParty2: parties.updateParty2,
        resolvedSpecificActionTypeLive,
        isIqrarContext,
        partyLabels,
        procedureDetailsGuidance,
        party2Hidden,
        isRespondentClient,
        partyCardTitle: parties.partyCardTitle,
        isParty1Client: parties.isParty1Client,
        isParty2Client: parties.isParty2Client,
        toggleSideClient: parties.toggleSideClient,
        handleSubmit,
        updateField,
        safeClose,
    };
}
