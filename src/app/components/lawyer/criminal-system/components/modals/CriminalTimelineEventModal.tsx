import React, { useEffect, useMemo, useState } from 'react';
import type { CriminalCaseStage, CriminalDefendant, TimelineEvent } from '../../criminalStore';
import {
    hasJuvenileAccused,
    INVESTIGATION_TIMELINE_CATEGORIES,
    INVESTIGATION_TIMELINE_OTHER_CATEGORY,
    isBailCategory,
    isDetentionArrestCategory,
    isDetentionExtensionCategory,
    isInvestigationDetentionCategory,
    isInvestigationNonPersonalCategory,
    isInvestigationPersonalDefendantCategory,
    isJuvenileTrialStage,
    isValidCriminalStage,
    isValidJuvenileDetentionPlacement,
    resolveInvestigationTimelineEventType,
    resolveTimelineEventTitle,
    type CriminalActionParty,
    type JuvenileDetentionPlacement,
} from '../../criminalStageUtils';
import { INVESTIGATION_JUVENILE_DETENTION_PLACEMENT_OPTIONS } from '../../juvenileInvestigationRules';

export type CriminalTimelineEventModalProps = {
    isOpen: boolean;
    caseId: string;
    stage: string;
    isUnknownPerpetrator: boolean;
    isInvestigation: boolean;
    isCourtStage: boolean;
    isTrialCourtStage: boolean;
    isCassationStage: boolean;
    defendants: CriminalDefendant[];
    actionParties: CriminalActionParty[];
    isMutualComplaint: boolean;
    onClose: () => void;
    addTimelineEvent: (caseId: string, event: TimelineEvent) => void;
    updateCaseStage: (caseId: string, stage: CriminalCaseStage) => void;
    onError: () => void;
};

const createId = () => {
    return globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const isCriminalCaseStage = (v: string): v is CriminalCaseStage => isValidCriminalStage(v);

const isPostponementCategory = (category: string) => {
    const c = String(category ?? '').trim();
    return c === 'تأجيل الجلسة/المراجعة' || c === 'تأجيل الجلسة';
};

const isPsychiatricHoldCategory = (category: string) => String(category ?? '').trim() === 'قرار إيداع المتهم في مصح عقلي للمراقبة';
const isPsychiatricReportCategory = (category: string) => String(category ?? '').trim() === 'ورود تقرير اللجنة الطبية العقلية';
const isBailForfeitureCategory = (category: string) => String(category ?? '').trim() === 'قرار مصادرة الكفالة وتحصيلها';
const isInAbsentiaNotificationCategory = (category: string) => String(category ?? '').trim() === 'تبليغ رسمي بالحكم الغيابي';
const isSummonsStatusValue = (v: string): v is 'served_valid' | 'not_served_invalid' | 'served_to_official' =>
    v === 'served_valid' || v === 'not_served_invalid' || v === 'served_to_official';

const postponementReasonOptions = [
    'بسبب عدم حضور المشتكي (المجني عليه)',
    'بسبب عدم سوق المتهم الموقوف (عطل نقل الموقوفين)',
    'بسبب تخلف المتهم المكفل عن الحضور (تنبيه الكفيل/أمر قبض)',
    'بسبب عدم حضور الشهود (تقرر إعادة التبليغ)',
    'بسبب عدم حضور الشهود (تقرر إصدار أمر قبض بحق الشاهد)',
    'بسبب عدم حضور الشهود (تقرر تغريم الشاهد المتخلف)',
] as const;

export const CriminalTimelineEventModal = ({
    isOpen,
    caseId,
    stage,
    isUnknownPerpetrator,
    isInvestigation,
    isCourtStage,
    isTrialCourtStage,
    isCassationStage,
    defendants,
    actionParties,
    isMutualComplaint,
    onClose,
    addTimelineEvent,
    updateCaseStage,
    onError,
}: CriminalTimelineEventModalProps) => {
    const isJuvenileTrial = useMemo(() => isJuvenileTrialStage(stage, defendants), [stage, defendants]);

    const [eventCategory, setEventCategory] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventNextDate, setEventNextDate] = useState('');
    const [eventDefendantIds, setEventDefendantIds] = useState<string[]>([]);
    const [eventAppealedDecision, setEventAppealedDecision] = useState('');
    const [eventPostponementReason, setEventPostponementReason] = useState('');
    const [eventBailAmount, setEventBailAmount] = useState('');
    const [eventGuarantorInfo, setEventGuarantorInfo] = useState('');
    const [eventExtensionDays, setEventExtensionDays] = useState('');
    const [eventSocialWorkerPresent, setEventSocialWorkerPresent] = useState(false);
    const [eventSuspendedExecution, setEventSuspendedExecution] = useState(false);
    const [eventProbationYears, setEventProbationYears] = useState('');
    const [eventTransferredToStage, setEventTransferredToStage] = useState('');
    const [eventNotifiedDate, setEventNotifiedDate] = useState('');
    const [eventNotificationMethod, setEventNotificationMethod] = useState('');
    const [eventSummonsStatus, setEventSummonsStatus] = useState('');
    const [eventSummonsDate, setEventSummonsDate] = useState('');
    const [eventSummonsDocumentRef, setEventSummonsDocumentRef] = useState('');
    const [eventDetentionPlacement, setEventDetentionPlacement] = useState<JuvenileDetentionPlacement | ''>('');
    const [eventCustomActionName, setEventCustomActionName] = useState('');
    const [eventCustomPersonalToggle, setEventCustomPersonalToggle] = useState(false);
    const [eventCustomTargetDefendantId, setEventCustomTargetDefendantId] = useState('');

    const hasCaseJuvenileAccused = useMemo(() => hasJuvenileAccused(defendants), [defendants]);

    const selectedJuvenileDefendantIds = useMemo(() => {
        const ids = eventDefendantIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0);
        return ids.filter((partyId) => Boolean(actionParties.find((p) => p.id === partyId && p.isJuvenile)));
    }, [actionParties, eventDefendantIds]);

    const requiresJuvenilePlacement = useMemo(() => {
        const detentionLike =
            isDetentionArrestCategory(eventCategory) || isInvestigationDetentionCategory(eventCategory);
        if (!detentionLike) return false;
        if (selectedJuvenileDefendantIds.length > 0) return true;
        return actionParties.some((p) => p.isJuvenile) && eventDefendantIds.length === 0;
    }, [actionParties, eventCategory, eventDefendantIds.length, selectedJuvenileDefendantIds.length]);

    useEffect(() => {
        if (!requiresJuvenilePlacement) return;
        setEventDetentionPlacement('juvenile_observation');
    }, [requiresJuvenilePlacement, eventCategory, selectedJuvenileDefendantIds.join('|')]);

    const addTitle = isCourtStage ? 'إضافة جلسة مرافعة' : 'إضافة إجراء تحقيقي';
    const nextDateLabel = isInvestigation ? 'تاريخ المراجعة التحقيقية القادمة' : isTrialCourtStage ? 'تاريخ المرافعة القادمة' : 'تاريخ الجلسة القادمة';

    const categoryOptions = useMemo(() => {
        if (isInvestigation) {
            return INVESTIGATION_TIMELINE_CATEGORIES;
        }
        if (!isCourtStage) {
            return [] as const;
        }
        const base = [
            'جلسة مرافعة اعتيادية',
            'تأجيل الجلسة/المراجعة',
            'تقديم لائحة دفاعية/تمييزية',
            'إصدار أمر قبض/توقيف (من المحكمة)',
            'تمديد توقيف المتهم',
            'إخلاء سبيل بكفالة',
            'قرار قبول الكفالة',
            'قرار إلغاء الكفالة وإعادة التوقيف',
            'قرار مصادرة الكفالة وتحصيلها',
            'قرار إيداع المتهم في مصح عقلي للمراقبة',
            'ورود تقرير اللجنة الطبية العقلية',
            'تبليغ رسمي بالحكم الغيابي',
            'نطق بالقرار (براءة)',
            'نطق بالقرار (إدانة)',
            'نطق بالقرار (إفراج)',
            'طعن تمييزي بقرار إعدادي',
        ];
        if (isTrialCourtStage) base.splice(3, 0, 'قرار عدم اختصاص وإحالة لمحكمة أخرى');
        if (isCassationStage) base.push('قرار نقض وإعادة المحاكمة');
        return base as readonly string[];
    }, [isCassationStage, isCourtStage, isInvestigation, isTrialCourtStage]);

    const isCustomInvestigationCategory = eventCategory.trim() === INVESTIGATION_TIMELINE_OTHER_CATEGORY;

    const defendantCount = defendants.length;
    const isInvestigationPersonalDefendant = isInvestigationPersonalDefendantCategory(eventCategory);
    const showInvestigationDefendantPicker =
        isInvestigation &&
        isInvestigationPersonalDefendant &&
        !isUnknownPerpetrator &&
        defendantCount > 1;
    const requiresInvestigationDefendantPick = showInvestigationDefendantPicker;

    useEffect(() => {
        if (!isOpen) return;
        setEventCategory('');
        setEventDate('');
        setEventTitle('');
        setEventDescription('');
        setEventNextDate('');
        setEventDefendantIds([]);
        setEventAppealedDecision('');
        setEventPostponementReason('');
        setEventBailAmount('');
        setEventGuarantorInfo('');
        setEventExtensionDays('');
        setEventSocialWorkerPresent(false);
        setEventSuspendedExecution(false);
        setEventProbationYears('');
        setEventTransferredToStage('');
        setEventNotifiedDate(new Date().toISOString().slice(0, 10));
        setEventNotificationMethod('');
        setEventSummonsStatus('');
        setEventSummonsDate('');
        setEventSummonsDocumentRef('');
        setEventDetentionPlacement('');
        setEventCustomActionName('');
        setEventCustomPersonalToggle(false);
        setEventCustomTargetDefendantId('');
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !isCustomInvestigationCategory) return;
        if (!eventCustomPersonalToggle || isUnknownPerpetrator || defendantCount === 0) {
            setEventCustomTargetDefendantId('');
            return;
        }
        if (defendantCount === 1) {
            const soleId = String(defendants[0]?.id ?? '').trim();
            setEventCustomTargetDefendantId(soleId);
        }
    }, [
        defendantCount,
        defendants,
        eventCustomPersonalToggle,
        isCustomInvestigationCategory,
        isOpen,
        isUnknownPerpetrator,
    ]);

    useEffect(() => {
        if (!isOpen) return;
        const clean = String(eventCategory ?? '').trim();
        const type: TimelineEvent['type'] = /حكم|قرار|إحالة/.test(clean)
            ? 'decision'
            : isCourtStage
              ? 'court_session'
              : 'investigation';
        if (type === 'court_session' && hasCaseJuvenileAccused) {
            setEventSocialWorkerPresent(true);
        }
    }, [eventCategory, hasCaseJuvenileAccused, isCourtStage, isOpen]);

    useEffect(() => {
        if (!isOpen || !isInvestigation) return;
        const cat = eventCategory.trim();
        if (!isInvestigationPersonalDefendantCategory(cat)) {
            setEventDefendantIds([]);
            return;
        }
        if (isUnknownPerpetrator || defendantCount === 0) {
            setEventDefendantIds([]);
            return;
        }
        if (defendantCount === 1) {
            const soleId = String(defendants[0]?.id ?? '').trim();
            setEventDefendantIds(soleId ? [soleId] : []);
            return;
        }
        setEventDefendantIds((prev) =>
            prev.filter((id) => defendants.some((d) => d.id === id)),
        );
    }, [defendantCount, defendants, eventCategory, isInvestigation, isOpen, isUnknownPerpetrator]);

    const resolveSubmitDefendantIds = (category: string): string[] => {
        if (isInvestigation) {
            if (isInvestigationNonPersonalCategory(category) || isUnknownPerpetrator) return [];
            if (isInvestigationPersonalDefendantCategory(category) && defendantCount === 1) {
                const soleId = String(defendants[0]?.id ?? '').trim();
                return soleId ? [soleId] : [];
            }
        }
        return eventDefendantIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0);
    };

    const submit = () => {
        const cleanCategory = eventCategory.trim();
        const cleanDate = eventDate.trim();
        const cleanDesc = eventDescription.trim();
        const cleanNext = eventNextDate.trim();
        const appealedDecision = eventAppealedDecision.trim();
        const cleanTitle = isInvestigation
            ? resolveTimelineEventTitle(
                  cleanCategory,
                  cleanCategory === INVESTIGATION_TIMELINE_OTHER_CATEGORY ? eventCustomActionName : eventTitle,
              )
            : resolveTimelineEventTitle(cleanCategory, eventTitle);
        const isPostponement = isPostponementCategory(cleanCategory);
        const postponementReason = isPostponement ? eventPostponementReason.trim() : '';
        const isBail = isBailCategory(cleanCategory);
        const bailAmount = isBail ? eventBailAmount.trim() : '';
        const guarantorInfo = isBail ? eventGuarantorInfo.trim() : '';
        const isPsychHold = isPsychiatricHoldCategory(cleanCategory);
        const isPsychReport = isPsychiatricReportCategory(cleanCategory);
        const isExtension = isDetentionExtensionCategory(cleanCategory);
        const extensionDays = isExtension && eventExtensionDays.trim() ? Number(eventExtensionDays) : NaN;
        const isForfeiture = isBailForfeitureCategory(cleanCategory);
        const isInAbsentiaNotification = isInAbsentiaNotificationCategory(cleanCategory);
        let defendantIds = resolveSubmitDefendantIds(cleanCategory);
        const customTargetId =
            isCustomInvestigationCategory && eventCustomPersonalToggle && !isUnknownPerpetrator
                ? String(
                      defendantCount === 1
                          ? defendants[0]?.id ?? ''
                          : eventCustomTargetDefendantId,
                  ).trim()
                : '';
        if (isCustomInvestigationCategory && eventCustomPersonalToggle && customTargetId) {
            defendantIds = [customTargetId];
        }
        const targetDefendantId: string | null | undefined = isCustomInvestigationCategory
            ? eventCustomPersonalToggle && customTargetId
                ? customTargetId
                : null
            : undefined;

        if (!cleanCategory || !cleanDate || !cleanDesc) return;
        if (isCustomInvestigationCategory && !eventCustomActionName.trim()) return;
        if (
            isCustomInvestigationCategory &&
            eventCustomPersonalToggle &&
            !isUnknownPerpetrator &&
            defendantCount > 1 &&
            !customTargetId
        ) {
            return;
        }
        if (!isInvestigation && !eventTitle.trim()) return;
        if (cleanCategory === 'طعن تمييزي بقرار إعدادي' && !appealedDecision) return;
        if (requiresInvestigationDefendantPick && !defendantIds.length) return;
        if (isPostponement && !postponementReason) return;
        if (isInAbsentiaNotification && (!defendantIds.length || !eventNotifiedDate.trim() || !eventNotificationMethod.trim())) return;
        if ((isBail || isPsychHold || isPsychReport) && !defendantIds.length) return;
        if (isBail && (!bailAmount || !guarantorInfo)) return;
        if (
            isExtension &&
            !isInvestigation &&
            (!defendantIds.length || !Number.isFinite(extensionDays) || extensionDays <= 0)
        ) {
            return;
        }
        if (
            isInvestigation &&
            isInvestigationDetentionCategory(cleanCategory) &&
            eventExtensionDays.trim() &&
            (!Number.isFinite(extensionDays) || extensionDays <= 0)
        ) {
            return;
        }
        if (isForfeiture && !defendantIds.length) return;

        const isArrest = isDetentionArrestCategory(cleanCategory);
        const placement =
            isValidJuvenileDetentionPlacement(eventDetentionPlacement) ? eventDetentionPlacement : null;
        const juvenileTargets = defendantIds.length
            ? defendantIds.filter((partyId) => Boolean(actionParties.find((p) => p.id === partyId && p.isJuvenile)))
            : actionParties.filter((p) => p.isJuvenile).map((p) => p.id);
        if (isArrest && juvenileTargets.length > 0 && !placement) return;

        const isConvictionVerdict = cleanCategory === 'نطق بالقرار (إدانة)';
        const isJurisdictionTransfer = cleanCategory === 'قرار عدم اختصاص وإحالة لمحكمة أخرى';
        const transferredToStage = isJurisdictionTransfer ? eventTransferredToStage.trim() : '';
        const transferredToStageValue: CriminalCaseStage | null =
            transferredToStage && isCriminalCaseStage(transferredToStage) ? transferredToStage : null;
        const transferredStage: CriminalCaseStage | undefined = isJurisdictionTransfer
            ? transferredToStageValue ?? undefined
            : undefined;

        const suspendedExecution = isConvictionVerdict ? eventSuspendedExecution : false;
        const probationYears = suspendedExecution ? Number(eventProbationYears) : undefined;

        if (suspendedExecution && (!Number.isFinite(probationYears) || probationYears <= 0)) return;
        if (isJurisdictionTransfer && !transferredStage) return;

        const type: TimelineEvent['type'] = isInvestigation
            ? resolveInvestigationTimelineEventType(cleanCategory)
            : /حكم|قرار|إحالة/.test(cleanCategory)
              ? 'decision'
              : isCourtStage
                ? 'court_session'
                : 'investigation';

        const isCourtSessionType = type === 'court_session';
        const summonsStatusRaw = isCourtSessionType ? eventSummonsStatus.trim() : '';
        const summonsStatus = isCourtSessionType && isSummonsStatusValue(summonsStatusRaw) ? summonsStatusRaw : '';
        const summonsDate = isCourtSessionType ? eventSummonsDate.trim() : '';
        const summonsDocumentRef = isCourtSessionType ? eventSummonsDocumentRef.trim() : '';

        const requiresSocialWorker = isJuvenileTrial && type === 'court_session';
        if (requiresSocialWorker && !eventSocialWorkerPresent) return;
        if (isCourtSessionType && (!summonsStatus || !summonsDate || !summonsDocumentRef)) return;

        const event: TimelineEvent = {
            id: createId(),
            date: cleanDate,
            type,
            category: cleanCategory,
            title: cleanTitle,
            description: cleanDesc,
            nextDate: !isInvestigation && cleanNext ? cleanNext : undefined,
            defendantIds: defendantIds.length ? defendantIds : undefined,
            appealedDecision: appealedDecision ? appealedDecision : undefined,
            postponementReason: isPostponement ? postponementReason : undefined,
            guarantorDetails: isBail ? { bailAmount, guarantorInfo } : undefined,
            extensionDays:
                isExtension && Number.isFinite(extensionDays) && extensionDays > 0
                    ? Math.floor(extensionDays)
                    : undefined,
            socialWorkerPresent: requiresSocialWorker ? true : undefined,
            suspendedExecution: suspendedExecution ? true : undefined,
            probationYears: suspendedExecution ? probationYears : undefined,
            transferredToStage: transferredStage,
            notifiedDate: isInAbsentiaNotification ? eventNotifiedDate.trim() : undefined,
            notificationMethod: isInAbsentiaNotification ? eventNotificationMethod.trim() : undefined,
            summonsStatus: isCourtSessionType ? (summonsStatus as any) : undefined,
            summonsDate: isCourtSessionType ? summonsDate : undefined,
            summonsDocumentRef: isCourtSessionType ? summonsDocumentRef : undefined,
            detentionPlacement: placement ?? undefined,
            targetDefendantId,
        };

        try {
            addTimelineEvent(caseId, event);
            if (isJurisdictionTransfer && transferredStage) {
                updateCaseStage(caseId, transferredStage);
            }
        } catch {
            onError();
            return;
        }

        if (isCassationStage && cleanCategory === 'قرار نقض وإعادة المحاكمة') {
            window.alert('تم تسجيل النقض. يرجى تعديل مرحلة الدعوى للعودة لمحكمة الموضوع');
        }

        onClose();
    };

    const isCourtSessionType = (() => {
        const clean = String(eventCategory ?? '').trim();
        const type: TimelineEvent['type'] = /حكم|قرار|إحالة/.test(clean) ? 'decision' : isCourtStage ? 'court_session' : 'investigation';
        return type === 'court_session';
    })();

    const canSave =
        Boolean(eventCategory.trim()) &&
        Boolean(eventDate.trim()) &&
        Boolean(eventDescription.trim()) &&
        !(isCustomInvestigationCategory && !eventCustomActionName.trim()) &&
        !(
            isCustomInvestigationCategory &&
            eventCustomPersonalToggle &&
            !isUnknownPerpetrator &&
            defendantCount > 1 &&
            !eventCustomTargetDefendantId.trim()
        ) &&
        (!isInvestigation ? Boolean(eventTitle.trim()) : true) &&
        !(isJuvenileTrial && eventCategory.trim() && !/حكم|قرار|إحالة/.test(eventCategory) && !eventSocialWorkerPresent) &&
        !(eventCategory === 'نطق بالقرار (إدانة)' && eventSuspendedExecution && !eventProbationYears.trim()) &&
        !(isPostponementCategory(eventCategory) && !eventPostponementReason.trim()) &&
        !(
            isBailCategory(eventCategory) &&
            ((!isInvestigation && !eventDefendantIds.length) ||
                (requiresInvestigationDefendantPick && !eventDefendantIds.length) ||
                !eventBailAmount.trim() ||
                !eventGuarantorInfo.trim())
        ) &&
        !(requiresInvestigationDefendantPick && !eventDefendantIds.length) &&
        !(
            isDetentionExtensionCategory(eventCategory) &&
            !isInvestigation &&
            (!eventDefendantIds.length ||
                !Number.isFinite(Number(eventExtensionDays)) ||
                Number(eventExtensionDays) <= 0)
        ) &&
        !(
            isInvestigation &&
            isInvestigationDetentionCategory(eventCategory) &&
            eventExtensionDays.trim() &&
            (!Number.isFinite(Number(eventExtensionDays)) || Number(eventExtensionDays) <= 0)
        ) &&
        !(isBailForfeitureCategory(eventCategory) && !eventDefendantIds.length) &&
        !((isPsychiatricHoldCategory(eventCategory) || isPsychiatricReportCategory(eventCategory)) && !eventDefendantIds.length) &&
        !(eventCategory === 'قرار عدم اختصاص وإحالة لمحكمة أخرى' && !eventTransferredToStage.trim()) &&
        !(eventCategory === 'طعن تمييزي بقرار إعدادي' && !eventAppealedDecision.trim()) &&
        !(isInAbsentiaNotificationCategory(eventCategory) &&
            (!eventDefendantIds.length || !eventNotifiedDate.trim() || !eventNotificationMethod.trim())) &&
        !(isCourtSessionType && (!eventSummonsStatus.trim() || !eventSummonsDate.trim() || !eventSummonsDocumentRef.trim())) &&
        !(requiresJuvenilePlacement && !eventDetentionPlacement);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[221] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">{addTitle}</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">تصنيف الإجراء</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={eventCategory}
                            onChange={(e) => {
                                const next = e.target.value;
                                setEventCategory(next);
                                setEventSocialWorkerPresent(false);
                                if (!isPostponementCategory(next)) setEventPostponementReason('');
                                if (!isBailCategory(next)) {
                                    setEventBailAmount('');
                                    setEventGuarantorInfo('');
                                }
                                if (next !== INVESTIGATION_TIMELINE_OTHER_CATEGORY) {
                                    setEventCustomActionName('');
                                    setEventCustomPersonalToggle(false);
                                    setEventCustomTargetDefendantId('');
                                }
                                if (isInvestigation && !isInvestigationPersonalDefendantCategory(next)) {
                                    setEventDefendantIds([]);
                                }
                                if (!isDetentionExtensionCategory(next)) setEventExtensionDays('');
                                if (!isDetentionArrestCategory(next)) setEventDetentionPlacement('');
                                if (next !== 'نطق بالقرار (إدانة)') {
                                    setEventSuspendedExecution(false);
                                    setEventProbationYears('');
                                }
                                if (next !== 'قرار عدم اختصاص وإحالة لمحكمة أخرى') setEventTransferredToStage('');
                                if (!isInAbsentiaNotificationCategory(next)) {
                                    setEventNotifiedDate(new Date().toISOString().slice(0, 10));
                                    setEventNotificationMethod('');
                                }
                                if (!isCourtSessionType) {
                                    setEventSummonsStatus('');
                                    setEventSummonsDate('');
                                    setEventSummonsDocumentRef('');
                                }
                            }}
                        >
                            <option value="" className="bg-slate-900 text-white">
                                اختر...
                            </option>
                            {categoryOptions.map((opt) => (
                                <option key={opt} value={opt} className="bg-slate-900 text-white">
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isCustomInvestigationCategory ? (
                        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/30 p-3">
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    اسم الإجراء المخصص
                                </label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={eventCustomActionName}
                                    onChange={(e) => setEventCustomActionName(e.target.value)}
                                    placeholder="اكتب اسم الإجراء كما يظهر في التايم لاين"
                                />
                            </div>
                            <label className="flex items-center gap-2 rounded-lg border border-[#E6C673]/25 bg-[#E6C673]/5 px-3 py-2.5 text-white/90 text-sm font-black whitespace-normal break-words cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[#E6C673]"
                                    checked={eventCustomPersonalToggle}
                                    onChange={(e) => {
                                        const on = e.target.checked;
                                        setEventCustomPersonalToggle(on);
                                        if (!on) setEventCustomTargetDefendantId('');
                                    }}
                                />
                                📌 إجراء شخصي (يتعلق بطرف محدد في الدعوى)
                            </label>
                            {eventCustomPersonalToggle && !isUnknownPerpetrator && defendantCount > 1 ? (
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        اختر الطرف المستهدف بالإجراء (إجباري)
                                    </label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={eventCustomTargetDefendantId}
                                        onChange={(e) => setEventCustomTargetDefendantId(e.target.value)}
                                    >
                                        <option value="" className="bg-slate-900 text-white">
                                            اختر...
                                        </option>
                                        {defendants.map((d) => (
                                            <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                                                {d.fullName.trim() || '—'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {isJuvenileTrial && eventCategory.trim() && !/حكم|قرار|إحالة/.test(eventCategory) ? (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <label className="flex items-center gap-2 text-white/80 text-sm font-black whitespace-normal break-words">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[#E6C673]"
                                    checked={eventSocialWorkerPresent}
                                    onChange={(e) => setEventSocialWorkerPresent(e.target.checked)}
                                />
                                ☑️ تم حضور الباحث الاجتماعي (إلزامي)
                            </label>
                        </div>
                    ) : null}

                    {eventCategory === 'نطق بالقرار (إدانة)' ? (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <label className="flex items-center gap-2 text-white/80 text-sm font-bold whitespace-normal break-words">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[#E6C673]"
                                    checked={eventSuspendedExecution}
                                    onChange={(e) => {
                                        const next = e.target.checked;
                                        setEventSuspendedExecution(next);
                                        if (!next) setEventProbationYears('');
                                    }}
                                />
                                الحكم مشمول بإيقاف التنفيذ
                            </label>

                            {eventSuspendedExecution ? (
                                <div className="mt-3">
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        مدة فترة التجربة (بالسنوات)
                                    </label>
                                    <input
                                        inputMode="numeric"
                                        type="number"
                                        min={1}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={eventProbationYears}
                                        onChange={(e) => setEventProbationYears(e.target.value)}
                                    />
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {eventCategory === 'قرار عدم اختصاص وإحالة لمحكمة أخرى' ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">المحكمة المحال إليها:</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={eventTransferredToStage}
                                onChange={(e) => setEventTransferredToStage(e.target.value)}
                            >
                                <option value="" className="bg-slate-900 text-white">
                                    اختر...
                                </option>
                                <option value="محكمة الجنايات" className="bg-slate-900 text-white">
                                    محكمة الجنايات
                                </option>
                                <option value="محكمة الجنح" className="bg-slate-900 text-white">
                                    محكمة الجنح
                                </option>
                            </select>
                        </div>
                    ) : null}

                    {eventCategory === 'طعن تمييزي بقرار إعدادي' ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">القرار المطعون فيه</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={eventAppealedDecision}
                                onChange={(e) => setEventAppealedDecision(e.target.value)}
                                placeholder="مثال: قرار رفض الكفالة بتاريخ 2026-05-20"
                            />
                        </div>
                    ) : null}

                    {isInAbsentiaNotificationCategory(eventCategory) ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-3">
                            <div className="text-amber-200 font-black text-sm whitespace-normal break-words">
                                تبليغ رسمي بالحكم الغيابي (م 243)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">تاريخ التبليغ الفعلي</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={eventNotifiedDate}
                                        onChange={(e) => setEventNotifiedDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">طريقة التبليغ</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={eventNotificationMethod}
                                        onChange={(e) => setEventNotificationMethod(e.target.value)}
                                        placeholder="مثال: لصق / مواجهة / تبليغ أصولي"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {isCourtSessionType ? (
                        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 space-y-3">
                            <div className="text-sky-200 font-black text-sm whitespace-normal break-words">
                                موقف التبليغ بموعد الجلسة (م 143)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">حالة التبليغ</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={eventSummonsStatus}
                                        onChange={(e) => setEventSummonsStatus(e.target.value)}
                                    >
                                        <option value="" className="bg-slate-900 text-white">
                                            اختر...
                                        </option>
                                        <option value="served_valid" className="bg-slate-900 text-white">
                                            تم التبليغ رسمياً وصحيحاً
                                        </option>
                                        <option value="not_served_invalid" className="bg-slate-900 text-white">
                                            لم يتبلغ/تبليغ باطل
                                        </option>
                                        <option value="served_to_official" className="bg-slate-900 text-white">
                                            تبلغت الدائرة الرسمية
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">تاريخ التبليغ الفعلي</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={eventSummonsDate}
                                        onChange={(e) => setEventSummonsDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    مستند التبليغ (رقم ورقة التكليف بالحضور/محضر التبليغ)
                                </label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={eventSummonsDocumentRef}
                                    onChange={(e) => setEventSummonsDocumentRef(e.target.value)}
                                    placeholder="مثال: ورقة تكليف رقم 55/تبليغ في 2026-05-20"
                                />
                            </div>
                        </div>
                    ) : null}

                    {isPostponementCategory(eventCategory) ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">السبب الرئيسي للتأجيل</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={eventPostponementReason}
                                onChange={(e) => setEventPostponementReason(e.target.value)}
                            >
                                <option value="" className="bg-slate-900 text-white">
                                    اختر...
                                </option>
                                {postponementReasonOptions.map((opt) => (
                                    <option key={opt} value={opt} className="bg-slate-900 text-white">
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {isBailCategory(eventCategory) ? (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-3">
                            <div className="text-emerald-200 font-black text-xs whitespace-normal break-words">
                                بيانات الكفالة (كفالة أشخاص — إجباري)
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    مقدار الكفالة المالية
                                </label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={eventBailAmount}
                                    onChange={(e) => setEventBailAmount(e.target.value)}
                                    placeholder="مثال: 5,000,000 دينار"
                                />
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    معلومات الكفيل الضامن
                                </label>
                                <textarea
                                    className="w-full min-h-[88px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={eventGuarantorInfo}
                                    onChange={(e) => setEventGuarantorInfo(e.target.value)}
                                    placeholder='مثال: "الموظف فلان الفلاني - مديرية تربية القادسية"'
                                />
                            </div>
                        </div>
                    ) : null}

                    {requiresJuvenilePlacement ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                            <div className="text-amber-100 font-black text-xs whitespace-normal break-words">
                                مكان الإيداع/التوقيف (حدث — إجباري)
                            </div>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={eventDetentionPlacement}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setEventDetentionPlacement(isValidJuvenileDetentionPlacement(v) ? v : '');
                                }}
                            >
                                <option value="" className="bg-slate-900 text-white">
                                    اختر...
                                </option>
                                {INVESTIGATION_JUVENILE_DETENTION_PLACEMENT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {isDetentionExtensionCategory(eventCategory) ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-2">
                            <div className="text-red-200 font-black text-xs whitespace-normal break-words">
                                {isInvestigation && isInvestigationDetentionCategory(eventCategory)
                                    ? 'تمديد التوقيف (اختياري)'
                                    : 'تمديد التوقيف (إجباري)'}
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    عدد أيام التمديد (مثلاً: 15 يوماً)
                                </label>
                                <input
                                    inputMode="numeric"
                                    type="number"
                                    min={1}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={eventExtensionDays}
                                    onChange={(e) => setEventExtensionDays(e.target.value)}
                                    placeholder="15"
                                />
                            </div>
                        </div>
                    ) : null}

                    {showInvestigationDefendantPicker ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                المتهم المعني بالإجراء (إجباري)
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={eventDefendantIds[0] ?? ''}
                                onChange={(e) => {
                                    const next = e.target.value.trim();
                                    setEventDefendantIds(next ? [next] : []);
                                }}
                            >
                                <option value="" className="bg-slate-900 text-white">
                                    اختر المتهم...
                                </option>
                                {defendants.map((d) => (
                                    <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                                        {d.fullName.trim() || '—'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {!isInvestigation && !isUnknownPerpetrator ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                {isBailCategory(eventCategory) ||
                                isPsychiatricHoldCategory(eventCategory) ||
                                isPsychiatricReportCategory(eventCategory) ||
                                isDetentionExtensionCategory(eventCategory) ||
                                isBailForfeitureCategory(eventCategory)
                                    ? isMutualComplaint
                                        ? 'الطرف المستهدف بالإجراء: (إجباري)'
                                        : 'يخص المتهم: (إجباري)'
                                    : isMutualComplaint
                                      ? 'الطرف المستهدف بالإجراء: (اختياري)'
                                      : 'يخص المتهم: (اختياري)'}
                            </label>
                            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                                {actionParties.length ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {actionParties.map((party) => {
                                            const label = party.fullName.trim() || '—';
                                            const checked = eventDefendantIds.includes(party.id);
                                            const defendantRow =
                                                defendants.find((d) => d.id === party.id) ??
                                                (isMutualComplaint && party.source === 'complainant'
                                                    ? defendants.find(
                                                          (d) =>
                                                              d.fullName.trim() === party.fullName.trim() &&
                                                              party.fullName.trim().length > 0,
                                                      )
                                                    : undefined);
                                            const extensionWarning =
                                                isDetentionExtensionCategory(eventCategory) &&
                                                defendantRow &&
                                                defendantRow.status !== 'موقوف' &&
                                                defendantRow.status !== 'ملقى القبض عليه';
                                            return (
                                                <label
                                                    key={party.id}
                                                    className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/30 px-3 py-2 text-sm font-bold text-white/80"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 accent-[#E6C673]"
                                                        checked={checked}
                                                        onChange={() => {
                                                            setEventDefendantIds((prev) =>
                                                                prev.includes(party.id)
                                                                    ? prev.filter((x) => x !== party.id)
                                                                    : [...prev, party.id],
                                                            );
                                                        }}
                                                    />
                                                    <span className="whitespace-normal break-words">
                                                        {label}
                                                        {extensionWarning ? (
                                                            <span className="mr-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-200">
                                                                تنبيه: غير موقوف
                                                            </span>
                                                        ) : null}
                                                        {defendantRow?.status === 'psychiatric_eval' ? (
                                                            <span className="mr-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-200">
                                                                ⚠️ فحص عقلي
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-white/60 text-sm whitespace-normal break-words">—</div>
                                )}
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">تاريخ الإجراء</label>
                        <input
                            type="date"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                        />
                    </div>

                    {!isCustomInvestigationCategory ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                عنوان الإجراء
                                {isInvestigation ? ' (اختياري — يُعتمد التصنيف إن تُرك فارغاً)' : ''}
                            </label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={eventTitle}
                                onChange={(e) => setEventTitle(e.target.value)}
                            />
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">ملخص ما حدث</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[120px] resize-none"
                            value={eventDescription}
                            onChange={(e) => setEventDescription(e.target.value)}
                        />
                    </div>

                    {!isInvestigation ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                {nextDateLabel} (إن وجد)
                            </label>
                            <input
                                type="date"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={eventNextDate}
                                onChange={(e) => setEventNextDate(e.target.value)}
                            />
                        </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 bg-slate-800/50 text-white font-black py-2.5 text-sm hover:bg-slate-800 transition whitespace-normal break-words"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!canSave}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                        >
                            حفظ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

