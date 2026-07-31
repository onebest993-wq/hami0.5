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
import type { UrgentActionsFormProps, UrgentActionFormData, UrgentPartyEntry } from './urgentActionsFormTypes';
import { buildUrgentActionsSubmitPayload, validateUrgentActionsForm } from './buildUrgentActionsSubmitPayload';
import { resolveUrgentPartyLabels } from './resolveUrgentPartyLabels';

export type { UrgentActionsFormProps } from './urgentActionsFormTypes';

export function useUrgentActionsForm(props: UrgentActionsFormProps) {
    const { onClose, onSave, initialActionType } = props;

    const isMountedRef = useRef(true);
    const rafIdsRef = useRef<number[]>([]);
    const closeRequestedRef = useRef(false);

    const selectedPathway: PathwayType = 'state_order';

    const [selectedSubActionType, setSelectedSubActionType] = useState<string>('');
    const [customSpecificActionType, setCustomSpecificActionType] = useState<string>('');

    const [party1List, setParty1List] = useState<UrgentPartyEntry[]>([
        { name: '', type: 'person', phone: '', address: '', isRepresented: false },
    ]);
    const [party2List, setParty2List] = useState<UrgentPartyEntry[]>([
        { name: '', type: 'person', address: '', isRepresented: false, isClient: false },
    ]);
    const party1EndRef = useRef<HTMLDivElement | null>(null);
    const party2EndRef = useRef<HTMLDivElement | null>(null);
    const ordinalNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'];
    const ordinalOf = (index: number) => ordinalNames[index] ?? String(index + 1);

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
        return () => {
            isMountedRef.current = false;
            rafIdsRef.current.forEach((id) => cancelAnimationFrame(id));
            rafIdsRef.current = [];
        };
    }, []);

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

    const addParty1 = () => {
        setParty1List((prev) => [
            ...prev,
            { name: '', type: 'person', phone: '', address: '', isRepresented: false },
        ]);
        const rafId = requestAnimationFrame(() => {
            if (!isMountedRef.current) return;
            party1EndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        rafIdsRef.current.push(rafId);
    };

    const removeParty1 = (index: number) => {
        setParty1List((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    };

    const updateParty1 = <K extends keyof UrgentPartyEntry>(
        index: number,
        field: K,
        value: UrgentPartyEntry[K],
    ) => {
        setParty1List((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addParty2 = () => {
        setParty2List((prev) => [
            ...prev,
            { name: '', type: 'person', address: '', isRepresented: false, isClient: false },
        ]);
        const rafId = requestAnimationFrame(() => {
            if (!isMountedRef.current) return;
            party2EndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        rafIdsRef.current.push(rafId);
    };

    const removeParty2 = (index: number) => {
        setParty2List((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    };

    const updateParty2 = <K extends keyof UrgentPartyEntry>(
        index: number,
        field: K,
        value: UrgentPartyEntry[K],
    ) => {
        setParty2List((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const setPartyRepresented = (side: 'party1' | 'party2', index: number, nextValue: boolean) => {
        if (side === 'party1') {
            setParty1List((prev) => prev.map((p, i) => (i === index ? { ...p, isRepresented: nextValue } : p)));
            if (nextValue) setParty2List((prev) => prev.map((p) => ({ ...p, isRepresented: false, isClient: false })));
            return;
        }
        setParty2List((prev) =>
            prev.map((p, i) => (i === index ? { ...p, isRepresented: nextValue, isClient: nextValue } : p)),
        );
        if (nextValue) setParty1List((prev) => prev.map((p) => ({ ...p, isRepresented: false })));
    };

    const resolvedSpecificActionTypeLive = useMemo(() => {
        if (selectedSubActionType === 'other' || selectedSubActionType === PETITION_ORDER_MANUAL_OPTION) {
            return customSpecificActionType.trim();
        }
        return String(selectedSubActionType || formData.specificActionType || '').trim();
    }, [selectedSubActionType, customSpecificActionType, formData.specificActionType]);

    const isIqrar = useMemo(() => isIqrarRequest(resolvedSpecificActionTypeLive), [resolvedSpecificActionTypeLive]);
    const isIqrarContext = isIqrar;

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
        return party2List.some((p) => !!p.isRepresented);
    }, [isIqrarContext, party2Hidden, party2List, selectedPathway]);

    const partyCardTitle = (side: 'party1' | 'party2', index: number) => {
        const list = side === 'party1' ? party1List : party2List;
        if (index === 0 && list.length === 1) return '';
        return ordinalOf(index);
    };

    const isParty1Client = party1List.some((p) => p.isRepresented);
    const isParty2Client = party2List.some((p) => p.isRepresented);

    const toggleSideClient = (side: 'party1' | 'party2', next: boolean) => {
        if (side === 'party1') {
            if (next) {
                setPartyRepresented('party1', 0, true);
                return;
            }
            const idx = party1List.findIndex((p) => p.isRepresented);
            if (idx >= 0) setPartyRepresented('party1', idx, false);
            return;
        }
        if (next) {
            setPartyRepresented('party2', 0, true);
            return;
        }
        const idx = party2List.findIndex((p) => p.isRepresented);
        if (idx >= 0) setPartyRepresented('party2', idx, false);
    };

    useEffect(() => {
        if (!party2Hidden) return;
        setParty2List((prev) => prev.map((p) => ({ ...p, isRepresented: false, isClient: false })));
    }, [party2Hidden]);

    const submitContext = useMemo(
        () => ({
            formData,
            party1List,
            party2List,
            selectedSubActionType,
            customSpecificActionType,
            party2Hidden,
            isRespondentClient,
        }),
        [
            formData,
            party1List,
            party2List,
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
        party1List,
        party2List,
        party1EndRef,
        party2EndRef,
        formData,
        validationErrors,
        addParty1,
        removeParty1,
        updateParty1,
        addParty2,
        removeParty2,
        updateParty2,
        resolvedSpecificActionTypeLive,
        isIqrarContext,
        partyLabels,
        procedureDetailsGuidance,
        party2Hidden,
        isRespondentClient,
        partyCardTitle,
        isParty1Client,
        isParty2Client,
        toggleSideClient,
        handleSubmit,
        updateField,
        safeClose,
    };
}
