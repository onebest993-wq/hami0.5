import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Scale } from '@/app/components/ui/icons/Scale';
import { ScrollText } from '@/app/components/ui/icons/ScrollText';
import { X } from '@/app/components/ui/icons/X';
import type { TimelineEvent } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import {
    appendJudgeDecisionLine,
} from '../smartFile/judgeDecisionComposer';
import {
    addJudgeDecisionTemplate,
    loadJudgeDecisionTemplates,
    normalizeJudgeDecisionTemplate,
    persistJudgeDecisionTemplates,
    removeJudgeDecisionTemplate,
} from '../smartFile/judgeDecisionTemplates';
import {
    collectUniqueHearingDates,
    findCourtSessionRecordForDate,
    isCourtSessionRecord,
    isSessionHubFocusEvent,
    normalizeHearingYmd,
    sessionNumberForHearingDate,
    suggestCurrentHearingDate,
    suggestNextHearingDate,
    type SessionRecordFormData,
} from '../smartFile/sessionRecordEngine';
import { isPleadingHearingAppointment } from '../smartFile/timelineLegalDeadline';
import {
    type AttachmentShieldSummary,
    type FastTrackPetitionSummary,
    type OnAddFastTrackFn,
} from '../smartFile/requestTypes';
import { SmartRequestsPanel } from './SmartRequestsPanel';
import { PS_HERO_SESSION, PS_TOOLBAR_BTN } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
import { registerSmartFileInlineOverlay } from '../smartFile/smartFileInlineOverlayRegistry';
import { COMPACT_HUB_TRIGGER_GOLD } from '../smartFile/compactHubTrigger';
import { hubTheme } from './sessionHubGlassTheme';
import { SessionRecordForm } from './SessionRecordForm';
import { SessionHearingsRegister } from './SessionHearingsRegister';

export type { AttachmentShieldSummary, FastTrackPetitionSummary } from '../smartFile/requestTypes';

export interface SessionAndRequestsHubProps {
    timeline?: TimelineEvent[];
    firstHearingDate?: string | null;
    onSubmitSessionRecord?: (data: SessionRecordFormData & { id?: string }) => void;
    editingSessionRecord?: TimelineEvent | null;
    onCancelEditSessionRecord?: () => void;
    onEditSessionRecord?: (event: TimelineEvent) => void;
    onAddFastTrack?: OnAddFastTrackFn;
    petitions?: FastTrackPetitionSummary[];
    attachments?: AttachmentShieldSummary[];
    onEditPetition?: (petition: FastTrackPetitionSummary) => void;
    onEditAttachment?: (attachment: AttachmentShieldSummary) => void;
    onResolvePetition?: (petition: FastTrackPetitionSummary, status: 'accepted' | 'rejected') => void;
    readOnly?: boolean;
    /** مظهر إضبارة الأحوال الشخصية */
    visualVariant?: 'civil' | 'personal';
    /** تقسيم المحتوى — للتخطيط البنتو */
    compose?: 'full' | 'session-only' | 'requests-only';
    /** personal-pearl يستخدم ثيم اللؤلؤي */
    layoutMode?: 'default' | 'personal-pearl';
    /** زر محضر مضغوط في صف الأدوات */
    compactSessionTrigger?: boolean;
    /** بطاقة محضر بارزة — أحوال شخصية */
    heroSessionTrigger?: boolean;
}

function emptyForm(
    timeline: TimelineEvent[],
    firstHearingDate?: string | null,
): SessionRecordFormData {
    const date = suggestCurrentHearingDate(timeline, firstHearingDate);
    const dates = collectUniqueHearingDates(timeline, firstHearingDate);
    return {
        date,
        sessionNumber: String(sessionNumberForHearingDate(dates, date)),
        proceedings: '',
        judgeDecisions: '',
        nextHearingDate: suggestNextHearingDate(timeline, date),
    };
}

export const SessionAndRequestsHub = memo(function SessionAndRequestsHub({
    timeline = [],
    firstHearingDate = null,
    onSubmitSessionRecord,
    editingSessionRecord = null,
    onCancelEditSessionRecord,
    onEditSessionRecord,
    onAddFastTrack,
    petitions = [],
    attachments = [],
    onEditPetition,
    onEditAttachment,
    onResolvePetition,
    readOnly = false,
    visualVariant = 'civil',
    compose = 'full',
    layoutMode = 'default',
    compactSessionTrigger = false,
    heroSessionTrigger = false,
}: SessionAndRequestsHubProps) {
    const isPearl = visualVariant === 'personal' && layoutMode === 'personal-pearl';
    const T = hubTheme(visualVariant, layoutMode);
    const sessionHistory = useMemo(
        () =>
            timeline
                .filter((event) => isCourtSessionRecord(event))
                .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? ''))),
        [timeline],
    );

    const [panelOpen, setPanelOpen] = useState(false);
    const [hubMode, setHubMode] = useState<'compose' | 'register'>('compose');
    const [registerSessionId, setRegisterSessionId] = useState<string | undefined>(undefined);
    const [date, setDate] = useState(() => emptyForm(timeline, firstHearingDate).date);
    const [sessionNumber, setSessionNumber] = useState(
        () => emptyForm(timeline, firstHearingDate).sessionNumber,
    );
    const [proceedings, setProceedings] = useState('');
    const [judgeDecisions, setJudgeDecisions] = useState('');
    const [nextHearingDate, setNextHearingDate] = useState('');
    const [customTemplates, setCustomTemplates] = useState<string[]>(() => loadJudgeDecisionTemplates());
    const [templateDraft, setTemplateDraft] = useState('');
    const prevFocusIdRef = useRef<string | undefined>(undefined);

    const applyComposeForm = (next: SessionRecordFormData) => {
        setDate(next.date);
        setSessionNumber(next.sessionNumber);
        setProceedings(next.proceedings);
        setJudgeDecisions(next.judgeDecisions);
        setNextHearingDate(next.nextHearingDate);
    };

    const openCompose = () => {
        applyComposeForm(emptyForm(timeline, firstHearingDate));
        setHubMode('compose');
        setPanelOpen(true);
    };

    const openRegister = (session?: TimelineEvent | null) => {
        const target = session ?? sessionHistory[0] ?? null;
        setRegisterSessionId(target?.id);
        setHubMode('register');
        setPanelOpen(true);
    };

    useEffect(() => {
        const incoming = editingSessionRecord;
        const focusId = incoming?.id;

        if (!focusId || !incoming || !isSessionHubFocusEvent(incoming)) {
            prevFocusIdRef.current = focusId;
            return;
        }

        if (prevFocusIdRef.current === focusId) return;
        prevFocusIdRef.current = focusId;
        setPanelOpen(true);

        if (isCourtSessionRecord(incoming)) {
            setHubMode('register');
            setRegisterSessionId(incoming.id);
            return;
        }

        if (isPleadingHearingAppointment(incoming)) {
            const existing = findCourtSessionRecordForDate(timeline, incoming.date);
            if (existing) {
                setHubMode('register');
                setRegisterSessionId(existing.id);
                return;
            }
            const ymd = normalizeHearingYmd(incoming.date);
            const dates = collectUniqueHearingDates(timeline, firstHearingDate);
            applyComposeForm({
                date: ymd,
                sessionNumber: String(sessionNumberForHearingDate(dates, ymd)),
                proceedings: '',
                judgeDecisions: '',
                nextHearingDate: suggestNextHearingDate(timeline, ymd),
            });
            setHubMode('compose');
        }
    }, [editingSessionRecord, timeline, firstHearingDate]);

    const insertJudgeLine = (line: string) => {
        setJudgeDecisions((prev) => appendJudgeDecisionLine(prev, line));
    };

    const handleAddCustomTemplate = () => {
        const normalized = normalizeJudgeDecisionTemplate(templateDraft);
        if (!normalized) {
            SmartToast.error('أدخل نصاً للقالب');
            return;
        }
        const next = addJudgeDecisionTemplate(customTemplates, normalized);
        if (next.length === customTemplates.length) {
            SmartToast.error('القالب موجود مسبقاً أو طويل جداً');
            return;
        }
        setCustomTemplates(next);
        persistJudgeDecisionTemplates(next);
        setTemplateDraft('');
        SmartToast.success('تم حفظ القالب');
    };

    const handleRemoveCustomTemplate = (text: string) => {
        const next = removeJudgeDecisionTemplate(customTemplates, text);
        setCustomTemplates(next);
        persistJudgeDecisionTemplates(next);
    };

    const handleDateChange = (value: string) => {
        const ymd = normalizeHearingYmd(value) || value.slice(0, 10);
        const existing = findCourtSessionRecordForDate(timeline, ymd);
        if (existing) {
            onEditSessionRecord?.(existing);
            setHubMode('register');
            setRegisterSessionId(existing.id);
            return;
        }
        const dates = collectUniqueHearingDates(timeline, firstHearingDate);
        setDate(ymd);
        setSessionNumber(String(sessionNumberForHearingDate(dates, ymd)));
        setNextHearingDate(suggestNextHearingDate(timeline, ymd));
    };

    const canSubmit = Boolean(
        onSubmitSessionRecord
        && date
        && sessionNumber.trim()
        && proceedings.trim(),
    );

    const closePanel = () => {
        onCancelEditSessionRecord?.();
        prevFocusIdRef.current = undefined;
        setPanelOpen(false);
        setHubMode('compose');
    };

    const leaveRegister = () => {
        onCancelEditSessionRecord?.();
        prevFocusIdRef.current = undefined;
        if (readOnly) {
            setPanelOpen(false);
            return;
        }
        applyComposeForm(emptyForm(timeline, firstHearingDate));
        setHubMode('compose');
    };

    useEffect(() => {
        if (!panelOpen || typeof document === 'undefined') return;
        const unregister = registerSmartFileInlineOverlay();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closePanel();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            unregister();
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [panelOpen]);

    const handleSubmit = () => {
        if (!onSubmitSessionRecord || !canSubmit) return;
        const ymd = date.slice(0, 10);
        const existing = findCourtSessionRecordForDate(timeline, ymd);
        if (existing) {
            SmartToast.error('تاريخ مرافعة واحد = جلسة واحدة — هذا التاريخ مسجّل في السجل');
            onEditSessionRecord?.(existing);
            setHubMode('register');
            setRegisterSessionId(existing.id);
            return;
        }
        onSubmitSessionRecord({
            date: ymd,
            sessionNumber: sessionNumber.trim(),
            proceedings: proceedings.trim(),
            judgeDecisions: judgeDecisions.trim(),
            nextHearingDate: nextHearingDate.slice(0, 10),
            recordScope: 'court',
        });
        SmartToast.success('تم تسجيل محضر الدعوى');
        onCancelEditSessionRecord?.();
        prevFocusIdRef.current = undefined;
        applyComposeForm(emptyForm(timeline, firstHearingDate));
        setPanelOpen(false);
        setHubMode('compose');
    };

    const showRegisterInPanel = hubMode === 'register' || readOnly;
    const sessionPanel = panelOpen && (readOnly || onSubmitSessionRecord) ? createPortal(
        <div
            className={T.overlay}
            dir="rtl"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) closePanel();
            }}
            data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordPanel}
        >
            <div className={T.shell} onClick={(e) => e.stopPropagation()}>
                <div className={T.header}>
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className={`text-base font-bold truncate ${T.accentText}`}>
                            {showRegisterInPanel ? 'سجل جلسات المرافعة' : 'محضر الدعوى'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {!readOnly && sessionHistory.length > 0 && hubMode === 'compose' ? (
                            <button
                                type="button"
                                onClick={() => openRegister(sessionHistory[sessionHistory.length - 1])}
                                className="min-h-[44px] px-3 rounded-xl border border-white/[0.10] text-[11px] font-bold text-white/70 hover:bg-white/[0.05] touch-manipulation"
                            >
                                سجل الجلسات
                            </button>
                        ) : null}
                        <button
                            type="button"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordClose}
                            onClick={closePanel}
                            className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label="إغلاق"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {showRegisterInPanel ? (
                    <SessionHearingsRegister
                        T={T}
                        sessions={sessionHistory}
                        selectedId={registerSessionId}
                        onSelect={(event) => {
                            setRegisterSessionId(event.id);
                            onEditSessionRecord?.(event);
                        }}
                        onLeave={leaveRegister}
                    />
                ) : (
                    <SessionRecordForm
                        T={T}
                        visualVariant={visualVariant}
                        date={date}
                        onDateChange={handleDateChange}
                        sessionNumber={sessionNumber}
                        nextHearingDate={nextHearingDate}
                        setNextHearingDate={setNextHearingDate}
                        proceedings={proceedings}
                        setProceedings={setProceedings}
                        judgeDecisions={judgeDecisions}
                        setJudgeDecisions={setJudgeDecisions}
                        customTemplates={customTemplates}
                        templateDraft={templateDraft}
                        setTemplateDraft={setTemplateDraft}
                        onAddCustomTemplate={handleAddCustomTemplate}
                        onRemoveCustomTemplate={handleRemoveCustomTemplate}
                        onInsertJudgeLine={insertJudgeLine}
                    />
                )}

                {!showRegisterInPanel ? (
                    <div className={T.footerBar}>
                        <div className="max-w-[min(96vw,92rem)] w-full mx-auto">
                            <button
                                type="button"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordAdd}
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className={T.btn}
                            >
                                تسجيل المحضر
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>,
        document.body,
    ) : null;

    const openSessionTrigger = () => {
        if (readOnly) {
            openRegister(sessionHistory[sessionHistory.length - 1]);
            return;
        }
        onCancelEditSessionRecord?.();
        prevFocusIdRef.current = undefined;
        openCompose();
    };

    return (
        <div className={`${compose === 'requests-only' ? '' : 'mb-0'} print:hidden`} dir="rtl">
            {sessionPanel}

            {compose !== 'requests-only' && !readOnly && onSubmitSessionRecord ? (
                isPearl && heroSessionTrigger ? (
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordOpen}
                    onClick={openSessionTrigger}
                    className={PS_HERO_SESSION}
                >
                    <ScrollText size={15} className="shrink-0 text-white/55" strokeWidth={1.7} aria-hidden />
                    <span className="min-w-0 flex-1 text-right text-[12px] font-bold text-white/88">
                        محضر الجلسة
                    </span>
                </button>
                ) : isPearl ? (
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordOpen}
                    onClick={openSessionTrigger}
                    className={
                        compactSessionTrigger
                            ? `${PS_TOOLBAR_BTN} border-[#F0A8B4]/26 bg-[#F5C6D0]/[0.08]`
                            : `${T.trigger} w-full min-h-[3rem] px-2.5 py-2 flex items-center justify-end text-right`
                    }
                >
                    <ScrollText size={14} className="text-[#FFD4DC]/85 shrink-0" strokeWidth={1.6} aria-hidden />
                    <span className={`font-bold text-[10px] leading-none ${T.accentText}`}>محضر</span>
                </button>
                ) : (
                <div className="space-y-1.5 mb-0">
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordOpen}
                    onClick={openSessionTrigger}
                    className={
                        compactSessionTrigger && visualVariant === 'civil'
                            ? COMPACT_HUB_TRIGGER_GOLD
                            : `${T.trigger}`
                    }
                >
                    {visualVariant === 'personal' ? (
                        <>
                            <div className="w-11 h-11 rounded-2xl bg-[#E8DFD0]/10 border border-[#F7F4EE]/15 flex items-center justify-center shrink-0">
                                <Scale size={18} className={T.accentIcon} aria-hidden />
                            </div>
                            <div className="flex-1 text-right min-w-0">
                                <span className={`font-black text-sm block ${T.accentText}`}>محضر الجلسة</span>
                            </div>
                            <ChevronDown size={16} className="text-white/35 shrink-0" aria-hidden />
                        </>
                    ) : compactSessionTrigger ? (
                        <>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Scale size={14} className={T.accentIcon} aria-hidden />
                                <span className={`font-bold ${T.accentText} text-[11px] truncate`}>محضر الدعوى</span>
                            </div>
                            <ChevronDown size={14} className="text-white/35 shrink-0" aria-hidden />
                        </>
                    ) : (
                    <>
                    <div className="flex items-center gap-1.5">
                        <Scale size={14} className={T.accentIcon} aria-hidden />
                        <span className={`font-bold ${T.accentText} text-[11px]`}>محضر الدعوى</span>
                        <ChevronDown size={12} className="text-white/35" aria-hidden />
                    </div>
                    </>
                    )}
                </button>
                {sessionHistory.length > 0 ? (
                    <button
                        type="button"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionOpenRegister}
                        onClick={() => openRegister(sessionHistory[sessionHistory.length - 1])}
                        className="w-full min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[11px] font-bold text-white/65 hover:bg-white/[0.05] touch-manipulation"
                    >
                        سجل الجلسات ({sessionHistory.length})
                    </button>
                ) : null}
                </div>
                )
            ) : compose !== 'requests-only' && readOnly && sessionHistory.length > 0 ? (
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionOpenRegister}
                    onClick={() => openRegister(sessionHistory[sessionHistory.length - 1])}
                    className={`${T.trigger} mb-2`}
                >
                    <span className={`font-bold ${T.accentText} text-[11px]`}>سجل الجلسات</span>
                </button>
            ) : compose !== 'requests-only' && !readOnly && !onSubmitSessionRecord ? (
                <div className={`${isPearl ? 'min-h-[7.5rem] rounded-[1.25rem] border border-dashed border-[#E8DFD0]/15 bg-[#F7F4EE]/[0.03]' : 'min-h-[72px] rounded-xl border border-dashed border-white/10 bg-white/[0.02]'} mb-2`} />
            ) : null}

            {compose !== 'session-only' && (!readOnly || petitions.length > 0 || attachments.length > 0) ? (
            <SmartRequestsPanel
                petitions={petitions}
                attachments={attachments}
                onAddFastTrack={onAddFastTrack}
                onEditPetition={onEditPetition}
                onEditAttachment={onEditAttachment}
                onResolvePetition={onResolvePetition}
                readOnly={readOnly}
                visualVariant={visualVariant}
                embedMode={isPearl ? 'pearl-embed' : 'standalone'}
                dense={visualVariant === 'civil' && compose === 'requests-only'}
            />
            ) : null}
        </div>
    );
});
