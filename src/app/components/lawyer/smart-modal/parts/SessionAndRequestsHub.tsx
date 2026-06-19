import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, Gavel, Hash, PenLine, Plus, Scale, X } from 'lucide-react';
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
    computeNextSessionNumber,
    isSessionTimelineEvent,
    parseSessionRecordEvent,
    suggestCurrentHearingDate,
    suggestNextHearingDate,
    type SessionRecordFormData,
} from '../smartFile/sessionRecordEngine';
import {
    type AttachmentShieldSummary,
    type FastTrackPetitionSummary,
    type OnAddFastTrackFn,
} from '../smartFile/requestTypes';
import { SmartRequestsPanel } from './SmartRequestsPanel';
import { personalPearlHubTheme } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
import { PersonalStatusPearlTile } from '@/app/components/lawyer/personal-status/PersonalStatusMoroccanGlass';
import { personalHubTheme as legacyPersonalHubTheme } from '@/app/components/lawyer/personal-status/personalStatusDossierTheme';

export type { AttachmentShieldSummary, FastTrackPetitionSummary } from '../smartFile/requestTypes';

export interface SessionAndRequestsHubProps {
    timeline?: TimelineEvent[];
    onSubmitSessionRecord?: (data: SessionRecordFormData & { id?: string }) => void;
    editingSessionRecord?: TimelineEvent | null;
    onCancelEditSessionRecord?: () => void;
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
}

const GLASS_TRIGGER =
    'w-full min-h-[72px] px-3 rounded-xl border border-[#E6C673]/20 bg-[#0A0F1C]/40 backdrop-blur-md hover:bg-[#0A0F1C]/55 hover:border-[#E6C673]/35 flex flex-col items-center justify-center gap-1 transition-all text-center shadow-[0_4px_24px_rgba(0,0,0,0.25)]';
const GLASS_OVERLAY =
    'fixed inset-0 z-[150] bg-[#05060D]/75 backdrop-blur-md font-[\'Tajawal\']';
const GLASS_SHELL =
    'w-full h-full flex flex-col bg-[#0A0F1C]/92 backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]';
const GLASS_HEADER =
    'relative px-5 sm:px-8 py-4 border-b border-[#E6C673]/15 bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent flex justify-between items-center shrink-0';
const GLASS_BODY =
    'flex-1 min-h-0 overflow-y-auto scrollbar-hide px-5 sm:px-8 py-5 space-y-4 max-w-5xl w-full mx-auto';
const GLASS_FIELD =
    'w-full min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-[#E6C673]/30 focus:bg-white/[0.06] transition-all [color-scheme:dark]';
const GLASS_LABEL = 'text-xs font-bold text-white/50 mb-2 block';
const GLASS_SECTION =
    'rounded-2xl border border-[#E6C673]/15 bg-white/[0.02] backdrop-blur-sm p-4 sm:p-5';
const GLASS_BTN =
    'w-full max-w-5xl mx-auto py-3.5 rounded-xl bg-[#E6C673]/15 border border-[#E6C673]/30 text-[#E6C673] text-sm font-bold transition-all hover:bg-[#E6C673]/25 disabled:opacity-40 disabled:cursor-not-allowed shrink-0';

function hubTheme(variant: 'civil' | 'personal' = 'civil', layoutMode: 'default' | 'personal-pearl' = 'default') {
    if (variant === 'personal' && layoutMode === 'personal-pearl') return personalPearlHubTheme();
    if (variant === 'personal') return legacyPersonalHubTheme();
    return {
        trigger: GLASS_TRIGGER,
        overlay: GLASS_OVERLAY,
        shell: GLASS_SHELL,
        header: GLASS_HEADER,
        body: GLASS_BODY,
        field: GLASS_FIELD,
        label: GLASS_LABEL,
        section: GLASS_SECTION,
        btn: GLASS_BTN,
        accentText: 'text-[#E6C673]',
        accentIcon: 'text-[#E6C673]',
        footerBar: 'px-5 sm:px-8 py-4 border-t border-[#E6C673]/10 shrink-0 bg-[#0A0F1C]/80',
    };
}

function emptyForm(timeline: TimelineEvent[]): SessionRecordFormData {
    const date = suggestCurrentHearingDate(timeline);
    return {
        date,
        sessionNumber: String(computeNextSessionNumber(timeline)),
        proceedings: '',
        judgeDecisions: '',
        nextHearingDate: suggestNextHearingDate(timeline, date),
    };
}

export const SessionAndRequestsHub = ({
    timeline = [],
    onSubmitSessionRecord,
    editingSessionRecord = null,
    onCancelEditSessionRecord,
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
}: SessionAndRequestsHubProps) => {
    const isPearl = visualVariant === 'personal' && layoutMode === 'personal-pearl';
    const T = hubTheme(visualVariant, layoutMode);
    const isEditing = Boolean(editingSessionRecord?.id);
    const autoNextSession = useMemo(() => String(computeNextSessionNumber(timeline)), [timeline]);
    const autoHearingDate = useMemo(() => suggestCurrentHearingDate(timeline), [timeline]);

    const [panelOpen, setPanelOpen] = useState(false);
    const [date, setDate] = useState(autoHearingDate);
    const [sessionNumber, setSessionNumber] = useState(autoNextSession);
    const [proceedings, setProceedings] = useState('');
    const [judgeDecisions, setJudgeDecisions] = useState('');
    const [nextHearingDate, setNextHearingDate] = useState('');
    const [manualSessionNumber, setManualSessionNumber] = useState(false);
    const [manualNextHearingDate, setManualNextHearingDate] = useState(false);
    const [customTemplates, setCustomTemplates] = useState<string[]>(() => loadJudgeDecisionTemplates());
    const [templateDraft, setTemplateDraft] = useState('');
    const prevEditingIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (isEditing) setPanelOpen(true);
    }, [isEditing]);

    useEffect(() => {
        if (!panelOpen || typeof document === 'undefined') return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [panelOpen]);

    useEffect(() => {
        const editId = editingSessionRecord?.id;

        if (editId && editingSessionRecord && isSessionTimelineEvent(editingSessionRecord)) {
            if (prevEditingIdRef.current !== editId) {
                const parsed = parseSessionRecordEvent(editingSessionRecord);
                setDate(parsed.date);
                setSessionNumber(parsed.sessionNumber || autoNextSession);
                setProceedings(parsed.proceedings);
                setJudgeDecisions(parsed.judgeDecisions);
                setNextHearingDate(parsed.nextHearingDate);
                setManualSessionNumber(true);
                setManualNextHearingDate(Boolean(parsed.nextHearingDate));
            }
            prevEditingIdRef.current = editId;
            return;
        }

        if (prevEditingIdRef.current && !editId) {
            const fresh = emptyForm(timeline);
            setDate(fresh.date);
            setSessionNumber(fresh.sessionNumber);
            setProceedings('');
            setJudgeDecisions('');
            setNextHearingDate(fresh.nextHearingDate);
            setManualSessionNumber(false);
            setManualNextHearingDate(false);
        }

        prevEditingIdRef.current = editId;
    }, [editingSessionRecord, autoNextSession, timeline]);

    useEffect(() => {
        if (isEditing || manualSessionNumber) return;
        setSessionNumber(autoNextSession);
    }, [autoNextSession, isEditing, manualSessionNumber]);

    useEffect(() => {
        if (isEditing || manualSessionNumber) return;
        setDate(autoHearingDate);
    }, [autoHearingDate, isEditing, manualSessionNumber]);

    useEffect(() => {
        if (isEditing || manualNextHearingDate) return;
        setNextHearingDate(suggestNextHearingDate(timeline, date));
    }, [timeline, date, isEditing, manualNextHearingDate]);

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

    const canSubmit = Boolean(
        onSubmitSessionRecord
        && date
        && sessionNumber.trim()
        && proceedings.trim(),
    );

    const closePanel = () => {
        if (isEditing) {
            onCancelEditSessionRecord?.();
        }
        setPanelOpen(false);
    };

    const handleSubmit = () => {
        if (!onSubmitSessionRecord || !canSubmit) return;
        onSubmitSessionRecord({
            id: editingSessionRecord?.id,
            date: date.slice(0, 10),
            sessionNumber: sessionNumber.trim(),
            proceedings: proceedings.trim(),
            judgeDecisions: judgeDecisions.trim(),
            nextHearingDate: nextHearingDate.slice(0, 10),
            recordScope: 'court',
        });
        SmartToast.success(isEditing ? 'تم تحديث محضر الدعوى' : 'تم تسجيل محضر الدعوى');
        if (isEditing) {
            onCancelEditSessionRecord?.();
            setPanelOpen(false);
            return;
        }
        setProceedings('');
        setJudgeDecisions('');
        setManualSessionNumber(false);
        setManualNextHearingDate(false);
        setPanelOpen(false);
    };

    const sessionPanel = panelOpen && !readOnly && onSubmitSessionRecord ? createPortal(
        <div
            className={T.overlay}
            dir="rtl"
            data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordPanel}
        >
            <div className={T.shell}>
                <div className={T.header}>
                    <div className="flex items-center gap-3 min-w-0">
                        <Scale size={20} className={`${T.accentIcon} shrink-0`} aria-hidden />
                        <h3 className={`text-lg font-bold truncate ${T.accentText}`}>محضر الدعوى</h3>
                    </div>
                    <button
                        type="button"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordClose}
                        onClick={closePanel}
                        className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className={T.body}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="min-w-0">
                            <label className={T.label}>
                                <CalendarDays size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                                تاريخ المرافعة
                            </label>
                            <input
                                type="date"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordDate}
                                value={date.slice(0, 10)}
                                onChange={(e) => setDate(e.target.value)}
                                className={T.field}
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-2">
                                <label className={`${T.label} mb-0`}>
                                    <Hash size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                                    رقم الجلسة
                                </label>
                                <button
                                    type="button"
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordManualToggle}
                                    onClick={() => setManualSessionNumber((v) => !v)}
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors ${
                                        manualSessionNumber
                                            ? 'border-[#E6C673]/35 text-[#E6C673] bg-[#E6C673]/10'
                                            : 'border-white/10 text-white/35 hover:text-white/55'
                                    }`}
                                >
                                    {manualSessionNumber ? 'يدوي' : 'تلقائي'}
                                </button>
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordNumber}
                                value={sessionNumber}
                                readOnly={!manualSessionNumber}
                                onChange={(e) => setSessionNumber(e.target.value.replace(/\D/g, ''))}
                                className={`${T.field} ${!manualSessionNumber ? `${T.accentText} cursor-default` : ''}`}
                                placeholder="1"
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-2">
                                <label className={`${T.label} mb-0`}>
                                    <CalendarDays size={12} className="inline ml-1 text-emerald-400/70" aria-hidden />
                                    تاريخ المرافعة القادمة
                                </label>
                                <button
                                    type="button"
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordNextManualToggle}
                                    onClick={() => setManualNextHearingDate((v) => !v)}
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors ${
                                        manualNextHearingDate
                                            ? 'border-emerald-400/35 text-emerald-300 bg-emerald-500/10'
                                            : 'border-white/10 text-white/35 hover:text-white/55'
                                    }`}
                                >
                                    {manualNextHearingDate ? 'يدوي' : 'تلقائي'}
                                </button>
                            </div>
                            <input
                                type="date"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordNextDate}
                                value={nextHearingDate.slice(0, 10)}
                                readOnly={!manualNextHearingDate}
                                onChange={(e) => setNextHearingDate(e.target.value)}
                                className={`${T.field} ${!manualNextHearingDate && nextHearingDate ? 'text-emerald-300/90 cursor-default' : ''}`}
                            />
                            {!nextHearingDate && !manualNextHearingDate ? (
                                <p className="text-[10px] text-white/30 mt-2">لا يوجد موعد قادم — يمكن تحديده يدوياً</p>
                            ) : null}
                        </div>
                    </div>

                    <div className={T.section}>
                        <label className={T.label}>
                            <PenLine size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                            مجريات الدعوى
                        </label>
                        <textarea
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordProceedings}
                            value={proceedings}
                            onChange={(e) => setProceedings(e.target.value)}
                            rows={6}
                            placeholder="اكتب مجريات الجلسة والإجراءات التي تمت..."
                            className={`${T.field} min-h-[140px] sm:min-h-[180px] resize-none leading-relaxed`}
                        />
                    </div>

                    <div className={`${T.section} ${visualVariant === 'personal' ? '' : 'border-[#E6C673]/25 bg-gradient-to-b from-[#E6C673]/[0.05] to-transparent'}`}>
                        <label className={`${T.label} mb-3 ${T.accentText}`}>
                            <Gavel size={12} className="inline ml-1 text-[#E6C673]" aria-hidden />
                            قرارات القاضي والطلبات
                        </label>

                        <div className="space-y-3 mb-3">
                            <p className="text-[10px] font-bold text-white/45">
                                قوالبك اليدوية — اضغط للإدراج في النص
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={templateDraft}
                                    onChange={(e) => setTemplateDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCustomTemplate();
                                        }
                                    }}
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeTemplateInput}
                                    placeholder="مثال: تأجيل الدعوى لجلسة أخرى"
                                    className={`${T.field} flex-1 py-2 text-[11px]`}
                                />
                                <button
                                    type="button"
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeTemplateAdd}
                                    onClick={handleAddCustomTemplate}
                                    disabled={!normalizeJudgeDecisionTemplate(templateDraft)}
                                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/25 text-[#E6C673] text-[10px] font-bold hover:bg-[#E6C673]/20 transition-all disabled:opacity-40 shrink-0"
                                >
                                    <Plus size={12} aria-hidden />
                                    إضافة قالب
                                </button>
                            </div>
                            {customTemplates.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {customTemplates.map((snippet) => (
                                        <span
                                            key={snippet}
                                            className="inline-flex items-center max-w-full rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden"
                                        >
                                            <button
                                                type="button"
                                                data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeTemplateChip(snippet)}
                                                onClick={() => insertJudgeLine(snippet)}
                                                className="px-2 py-1 text-white/55 hover:text-white/80 hover:bg-[#E6C673]/[0.06] transition-all text-[9px] font-semibold truncate text-right"
                                                title={snippet}
                                            >
                                                {snippet}
                                            </button>
                                            <button
                                                type="button"
                                                data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeTemplateRemove(snippet)}
                                                onClick={() => handleRemoveCustomTemplate(snippet)}
                                                className="px-1.5 py-1 text-white/25 hover:text-rose-300 hover:bg-rose-500/10 border-r border-white/[0.06] transition-colors shrink-0"
                                                aria-label={`حذف القالب ${snippet}`}
                                            >
                                                <X size={10} aria-hidden />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-white/30">
                                    لم تُضف قوالب بعد — احفظ عباراتك المتكررة لتسريع كتابة المحضر
                                </p>
                            )}
                        </div>

                        <label className={T.label}>
                            <PenLine size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                            اكتب قرارات القاضي يدوياً
                        </label>
                        <textarea
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeDecisions}
                            value={judgeDecisions}
                            onChange={(e) => setJudgeDecisions(e.target.value)}
                            rows={8}
                            placeholder="اكتب قرارات وإجراءات القاضي في الجلسة بحرية..."
                            className={`${T.field} min-h-[140px] sm:min-h-[160px] resize-none leading-relaxed border-[#E6C673]/15 focus:border-[#E6C673]/35`}
                        />
                    </div>
                </div>

                <div className={T.footerBar}>
                    <button
                        type="button"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordAdd}
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={T.btn}
                    >
                        {isEditing ? 'حفظ التعديلات' : 'تسجيل المحضر'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    ) : null;

    return (
        <div className={`${compose === 'requests-only' ? '' : 'mb-0'} print:hidden`} dir="rtl">
            {sessionPanel}

            {compose !== 'requests-only' && !readOnly && onSubmitSessionRecord ? (
                isPearl ? (
                <PersonalStatusPearlTile
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordOpen}
                    onClick={() => setPanelOpen(true)}
                    className="w-full min-h-[3rem] px-2.5 py-2 flex items-center justify-end text-right"
                >
                    <span className={`font-black text-sm ${T.accentText}`}>محضر الجلسة</span>
                </PersonalStatusPearlTile>
                ) : (
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordOpen}
                    onClick={() => setPanelOpen(true)}
                    className={`${T.trigger} mb-2`}
                >
                    {visualVariant === 'personal' ? (
                        <>
                            <div className="w-11 h-11 rounded-2xl bg-[#E8DFD0]/10 border border-[#F7F4EE]/15 flex items-center justify-center shrink-0">
                                <Scale size={18} className={T.accentIcon} aria-hidden />
                            </div>
                            <div className="flex-1 text-right min-w-0">
                                <span className={`font-black text-sm block ${T.accentText}`}>محضر الجلسة</span>
                                <span className="text-[10px] text-white/40">مجريات المرافعة · قرارات القاضي</span>
                            </div>
                            <ChevronDown size={16} className="text-white/35 shrink-0" aria-hidden />
                        </>
                    ) : (
                    <>
                    <div className="flex items-center gap-1.5">
                        <Scale size={14} className={T.accentIcon} aria-hidden />
                        <span className={`font-bold ${T.accentText} text-[11px]`}>محضر الدعوى</span>
                        <ChevronDown size={12} className="text-white/35" aria-hidden />
                    </div>
                    <span className="text-white/35 text-[9px]">مجريات الجلسة · قرارات القاضي</span>
                    </>
                    )}
                </button>
                )
            ) : compose !== 'requests-only' && (readOnly || !onSubmitSessionRecord) ? (
                <div className={`${isPearl ? 'min-h-[7.5rem] rounded-[1.25rem] border border-dashed border-[#E8DFD0]/15 bg-[#F7F4EE]/[0.03]' : 'min-h-[72px] rounded-xl border border-dashed border-white/10 bg-white/[0.02]'} mb-2`} />
            ) : null}

            {compose !== 'session-only' ? (
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
            />
            ) : null}
        </div>
    );
};
