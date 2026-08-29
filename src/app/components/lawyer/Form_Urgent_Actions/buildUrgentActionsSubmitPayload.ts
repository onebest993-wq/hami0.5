import {
    isIqrarRequest,
    resolveStoredPathwayType,
    resolveProcedureCategory,
    PETITION_ORDER_MANUAL_OPTION,
    UNIFIED_URGENT_FORM_HEADER,
} from './constants';
import type { UrgentActionFormData, UrgentPartyEntry } from './urgentActionsFormTypes';

type UrgentSubmitContext = {
    formData: UrgentActionFormData;
    party1List: UrgentPartyEntry[];
    party2List: UrgentPartyEntry[];
    selectedSubActionType: string;
    customSpecificActionType: string;
    party2Hidden: boolean;
    isRespondentClient: boolean;
};

export function resolveUrgentSpecificActionType(ctx: UrgentSubmitContext): string {
    if (
        ctx.selectedSubActionType === 'other' ||
        ctx.selectedSubActionType === PETITION_ORDER_MANUAL_OPTION
    ) {
        return ctx.customSpecificActionType.trim();
    }
    return String(ctx.formData.specificActionType || '').trim();
}

export function validateUrgentActionsForm(ctx: UrgentSubmitContext): Record<string, string> {
    const resolvedSpecificActionType = resolveUrgentSpecificActionType(ctx);
    const errors: Record<string, string> = {};
    const party1First = String(ctx.party1List[0]?.name ?? '').trim();
    const party2First = String(ctx.party2List[0]?.name ?? '').trim();
    const isIqrarSubmit = isIqrarRequest(resolvedSpecificActionType);
    const { formData, party2Hidden, isRespondentClient, selectedSubActionType, customSpecificActionType } =
        ctx;

    if (!formData.courtName.trim()) errors.courtName = 'حقل المحكمة إلزامي';

    if (isIqrarSubmit) {
        const rd = String(formData.requestDate || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rd)) {
            errors.requestDate = 'موعد الحضور للمصادقة إلزامي';
        }
        if (!String(formData.requestSubject || '').trim()) {
            errors.requestSubject = 'موضوع الإقرار/الحجة إلزامي';
        }
    } else if (isRespondentClient) {
        const ep = formData.defenderEntryPhase;
        if (ep === 2) {
            const od = String(formData.stateOrderIssuedDate || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(od)) {
                errors.stateOrderIssuedDate = 'تاريخ صدور الأمر الولائي إلزامي';
            }
        }
        if (ep === 3) {
            const gd = String(formData.defenderPhase3GrievanceDecisionDate || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(gd)) {
                errors.defenderPhase3GrievanceDecisionDate = 'تاريخ قرار التظلم إلزامي';
            }
        }
    }

    if (!resolvedSpecificActionType) errors.specificActionType = 'حقل نوع الطلب / الإجراء إلزامي';
    if (
        (selectedSubActionType === 'other' || selectedSubActionType === PETITION_ORDER_MANUAL_OPTION) &&
        !customSpecificActionType.trim()
    ) {
        errors.customSpecificActionType = 'يرجى كتابة نوع الإجراء يدوياً';
    }
    if (!party1First) {
        errors.party1Name = isIqrarSubmit
            ? 'لا يمكن الحفظ بدون اسم المُقَر له (المستفيد) الأول'
            : 'لا يمكن حفظ الطلب بدون اسم طالب القرار (المستدعي) الأول';
    }
    if (!party2Hidden && !party2First) {
        errors.party2Name = isIqrarSubmit
            ? 'لا يمكن الحفظ بدون اسم المُقِر الأول'
            : 'لا يمكن حفظ الطلب بدون اسم المطلوب ضده الأول';
    }

    ctx.party1List.forEach((p, i) => {
        if (!String(p.address ?? '').trim()) {
            errors[`party1_${i}_address`] = 'العنوان إلزامي للتبليغ والإخطار القانوني';
        }
    });
    if (!party2Hidden) {
        ctx.party2List.forEach((p, i) => {
            if (!String(p.address ?? '').trim()) {
                errors[`party2_${i}_address`] = 'العنوان إلزامي للتبليغ والإخطار القانوني';
            }
        });
    }

    return errors;
}

export function buildUrgentActionsSubmitPayload(ctx: UrgentSubmitContext): Record<string, unknown> {
    const resolvedSpecificActionType = resolveUrgentSpecificActionType(ctx);
    const isIqrarSubmit = isIqrarRequest(resolvedSpecificActionType);
    const { formData, party1List, party2List, party2Hidden, isRespondentClient } = ctx;

    const allParty2Norm = party2List.map((p) => ({ ...p, isClient: !!p.isRepresented }));
    const representedParty: 'client' | 'opponent' | null = (() => {
        const p1Rep = party1List.some((p) => !!p.isRepresented);
        const p2Rep = party2List.some((p) => !!p.isRepresented);
        if (p1Rep && !p2Rep) return 'client';
        if (p2Rep && !p1Rep) return 'opponent';
        return null;
    })();
    const clientRole =
        representedParty === 'opponent' ? 'respondent' : representedParty === 'client' ? 'applicant' : null;

    const storedPathway = resolveStoredPathwayType(resolvedSpecificActionType);

    const payload: Record<string, unknown> = {
        ...formData,
        actionType: storedPathway,
        pathwayTitle: UNIFIED_URGENT_FORM_HEADER.title,
        actionPath: UNIFIED_URGENT_FORM_HEADER.title,
        createdAt: new Date().toISOString(),
        specificActionType: resolvedSpecificActionType,
        procedureCategory: resolveProcedureCategory(null, resolvedSpecificActionType),
        procedureDetails: isIqrarSubmit ? '' : String(formData.procedureDetails || '').trim(),
        firstHearingDate:
            isIqrarSubmit || !String(formData.firstHearingDate || '').trim()
                ? null
                : String(formData.firstHearingDate).trim(),
        deadlineGrievance3Days: isIqrarSubmit ? false : formData.deadlineGrievance3Days,
        deadlineTamyeez7Days: isIqrarSubmit ? false : formData.deadlineTamyeez7Days,
        hasIntervention: false,
        initialEntryMode: 'normal',
        initialJudgeDecisionDate: '',
        defenderEntryPhase: !isIqrarSubmit && isRespondentClient ? formData.defenderEntryPhase : null,
        stateOrderIssuedDate:
            !isIqrarSubmit && isRespondentClient && formData.defenderEntryPhase >= 2
                ? formData.stateOrderIssuedDate
                : '',
        defenderPhase3GrievanceDecisionDate:
            !isIqrarSubmit && isRespondentClient && formData.defenderEntryPhase === 3
                ? formData.defenderPhase3GrievanceDecisionDate
                : '',
        representedParty: isIqrarSubmit ? null : representedParty,
        clientRole: isIqrarSubmit ? null : clientRole,
        party1Name: party1List[0]?.name || '',
        party1Type: party1List[0]?.type || 'person',
        party1Phone: party1List[0]?.phone || '',
        party1Address: party1List[0]?.address || '',
        party2Name: party2List[0]?.name || '',
        party2Type: party2List[0]?.type || 'person',
        party2Address: party2List[0]?.address || '',
        allParty1: party1List,
        allParty2: allParty2Norm,
    };

    if (!isIqrarSubmit && isRespondentClient && formData.defenderEntryPhase === 2) {
        payload.initialEntryMode = 'defender_phase2';
        payload.judgeDecision = 'rejected';
        payload.judgeDecisionDate = String(formData.stateOrderIssuedDate || '').trim();
        payload.legalState = 'Awaiting_Grievance';
    } else if (!isIqrarSubmit && isRespondentClient && formData.defenderEntryPhase === 3) {
        const req = String(formData.requestDate || '').trim();
        const gDate = String(formData.defenderPhase3GrievanceDecisionDate || '').trim();
        payload.initialEntryMode = 'defender_phase3';
        payload.judgeDecision = 'rejected';
        payload.judgeDecisionDate = req;
        payload.grievanceOutcome = 'filed';
        payload.grievanceFilingDate = req;
        payload.grievanceFirstHearingDate = req;
        payload.phase2FirstHearingDate = req;
        payload.grievanceDecision = 'confirmed';
        payload.grievanceDecisionDate = gDate;
        payload.preDecisionClosed = true;
        payload.grievanceTimingConfirmed = true;
        payload.grievanceDetailsConfirmed = true;
        payload.legalState = 'Awaiting_Cassation';
    }

    return payload;
}
