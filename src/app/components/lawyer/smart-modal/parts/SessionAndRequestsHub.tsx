import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, Gavel, Hash, PenLine, Plus, Scale, X } from '@/app/components/ui/lucideIcons';
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
    isOpponentProceedingsEvent,
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
import { personalPearlHubTheme, PS_HERO_SESSION, PS_TOOLBAR_BTN } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
import { personalHubTheme as legacyPersonalHubTheme } from '@/app/components/lawyer/personal-status/personalStatusDossierTheme';
import { registerSmartFileInlineOverlay } from '../smartFile/smartFileInlineOverlayRegistry';
import { COMPACT_HUB_TRIGGER_GOLD } from '../smartFile/compactHubTrigger';

export type { AttachmentShieldSummary, FastTrackPetitionSummary } from '../smartFile/requestTypes';

export interface SessionAndRequestsHubProps {
    timeline?: TimelineEvent[];
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

const GLASS_TRIGGER =
    'w-full min-h-[72px] px-3 rounded-xl border border-[#E6C673]/20 bg-[#0A0F1C]/40 backdrop-blur-md hover:bg-[#0A0F1C]/55 hover:border-[#E6C673]/35 flex flex-col items-center justify-center gap-1 transition-all text-center shadow-[0_4px_24px_rgba(0,0,0,0.25)]';
const GLASS_OVERLAY = 'fixed inset-0 z-[260] bg-[#020309]/96 backdrop-blur-lg font-[\'Tajawal\'] pointer-events-auto';
const GLASS_SHELL =
    'w-full h-full flex flex-col bg-[#070B14] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]';
const GLASS_HEADER =
    'relative px-5 sm:px-8 py-4 border-b border-[#E6C673]/14 bg-[linear-gradient(180deg,rgba(18,24,38,0.98),rgba(10,15,28,0.98))] flex justify-between items-center shrink-0';
const GLASS_BODY =
    'flex-1 min-h-0 overflow-y-auto scrollbar-hide px-5 sm:px-8 lg:px-10 py-5 space-y-5 max-w-[min(96vw,92rem)] w-full mx-auto bg-[#070B14]';
const GLASS_FIELD =
    'w-full min-w-0 bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-[#E6C673]/30 focus:bg-white/[0.07] transition-all [color-scheme:dark]';
const GLASS_LABEL = 'text-xs font-bold text-white/50 mb-2 block';
const GLASS_SECTION =
    'rounded-[24px] border border-[#E6C673]/14 bg-[linear-gradient(180deg,rgba(17,22,35,0.96),rgba(10,15,28,0.98))] p-4 sm:p-6';
const GLASS_BTN =
    'w-full py-3.5 rounded-xl bg-[#E6C673]/15 border border-[#E6C673]/30 text-[#E6C673] text-sm font-bold transition-all hover:bg-[#E6C673]/25 disabled:opacity-40 disabled:cursor-not-allowed shrink-0';

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
        footerBar: 'px-5 sm:px-8 lg:px-10 py-4 border-t border-[#E6C673]/10 shrink-0 bg-[linear-gradient(180deg,rgba(10,15,28,0.985),rgba(7,10,18,0.995))]',
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

export const SessionAndRequestsHub = memo(function SessionAndRequestsHub({
    timeline = [],
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
    const isEditing = Boolean(editingSessionRecord?.id);
    const autoNextSession = useMemo(() => String(computeNextSessionNumber(timeline)), [timeline]);
    const autoHearingDate = useMemo(() => suggestCurrentHearingDate(timeline), [timeline]);
    const sessionHistory = useMemo(
        () =>
            timeline
                .filter((event) => isSessionTimelineEvent(event) && !isOpponentProceedingsEvent(event))
                .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))),
        [timeline],
    );

    const [panelOpen, setPanelOpen] = useState(false);
    const [date, setDate] = useState(autoHearingDate);
    const [sessionNumber, setSessionNumber] = useState(autoNextSession);
    const [proceedings, setProceedings] = useState('');
    const [judgeDecisions, setJudgeDecisions] = useState('');
    const [nextHearingDate, setNextHearingDate] = useState('');
    const [customTemplates, setCustomTemplates] = useState<string[]>(() => loadJudgeDecisionTemplates());
    const [templateDraft, setTemplateDraft] = useState('');
    const prevEditingIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (isEditing) setPanelOpen(true);
    }, [isEditing]);

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
        }

        prevEditingIdRef.current = editId;
    }, [editingSessionRecord, autoNextSession, timeline]);

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

    useEffect(() => {
        if (!panelOpen || typeof document === 'undefined') return;
        const unregister = registerSmartFileInlineOverlay();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                if (isEditing) {
                    onCancelEditSessionRecord?.();
                }
                setPanelOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            unregister();
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [panelOpen, isEditing, onCancelEditSessionRecord]);

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
        const fresh = emptyForm(timeline);
        setSessionNumber(fresh.sessionNumber);
        setDate(fresh.date);
        setNextHearingDate(fresh.nextHearingDate);
        setPanelOpen(false);
    };

    const readOnlySessionView =
        readOnly
        && editingSessionRecord
        && isSessionTimelineEvent(editingSessionRecord)
        && !isOpponentProceedingsEvent(editingSessionRecord)
            ? parseSessionRecordEvent(editingSessionRecord)
            : null;

    const readOnlySessionPanel = readOnlySessionView
        ? createPortal(
              <div
                  className={T.overlay}
                  dir="rtl"
                  role="dialog"
                  aria-modal="true"
                  onClick={(e) => {
                      if (e.target === e.currentTarget) onCancelEditSessionRecord?.();
                  }}
              >
                  <div className={T.shell} onClick={(e) => e.stopPropagation()}>
                      <div className={T.header}>
                          <div className="flex items-center gap-3 min-w-0">
                              <Scale size={20} className="text-sky-300 shrink-0" aria-hidden />
                              <h3 className="text-lg font-bold truncate text-sky-200">
                                  محضر الجلسة — للاطلاع
                              </h3>
                          </div>
                          <button
                              type="button"
                              onClick={() => onCancelEditSessionRecord?.()}
                              className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                              aria-label="إغلاق"
                          >
                              <X size={18} />
                          </button>
                      </div>
                      <div className={`${T.body} space-y-4`}>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                              <div>
                                  <p className={T.label}>تاريخ المرافعة</p>
                                  <p className="text-white/85 tabular-nums">{readOnlySessionView.date?.slice(0, 10) || '—'}</p>
                              </div>
                              <div>
                                  <p className={T.label}>رقم الجلسة</p>
                                  <p className="text-white/85">{readOnlySessionView.sessionNumber || '—'}</p>
                              </div>
                              <div>
                                  <p className={T.label}>المرافعة القادمة</p>
                                  <p className="text-white/85 tabular-nums">
                                      {readOnlySessionView.nextHearingDate?.slice(0, 10) || '—'}
                                  </p>
                              </div>
                          </div>
                          <div className={T.section}>
                              <p className={T.label}>مجريات الدعوى</p>
                              <p className="text-sm text-white/75 whitespace-pre-line leading-relaxed">
                                  {readOnlySessionView.proceedings || '—'}
                              </p>
                          </div>
                          {readOnlySessionView.judgeDecisions ? (
                              <div className={T.section}>
                                  <p className={T.label}>قرارات القاضي والطلبات</p>
                                  <p className="text-sm text-white/75 whitespace-pre-line leading-relaxed">
                                      {readOnlySessionView.judgeDecisions}
                                  </p>
                              </div>
                          ) : null}
                      </div>
                  </div>
              </div>,
              document.body,
          )
        : null;

    const sessionPanel = panelOpen && !readOnly && onSubmitSessionRecord ? createPortal(
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-start">
                        <div className="min-w-0 flex flex-col">
                            <div className="mb-2 flex h-8 items-center">
                                <label className={`${T.label} mb-0`}>
                                    <CalendarDays size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                                    تاريخ المرافعة
                                </label>
                            </div>
                            <input
                                type="date"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordDate}
                                value={date.slice(0, 10)}
                                onChange={(e) => setDate(e.target.value)}
                                className={T.field}
                            />
                            <div className="mt-2 min-h-[1.25rem]" aria-hidden />
                        </div>
                        <div className="min-w-0 flex flex-col">
                            <div className="mb-2 flex h-8 items-center">
                                <label className={`${T.label} mb-0`}>
                                    <Hash size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                                    رقم الجلسة
                                </label>
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordNumber}
                                value={sessionNumber}
                                onChange={(e) => setSessionNumber(e.target.value.replace(/\D/g, ''))}
                                className={T.field}
                                placeholder="1"
                            />
                            <div className="mt-2 min-h-[1.25rem]" aria-hidden />
                        </div>
                        <div className="min-w-0 flex flex-col">
                            <div className="mb-2 flex h-8 items-center">
                                <label className={`${T.label} mb-0`}>
                                    <CalendarDays size={12} className="inline ml-1 text-emerald-400/70" aria-hidden />
                                    تاريخ المرافعة القادمة
                                </label>
                            </div>
                            <input
                                type="date"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordNextDate}
                                value={nextHearingDate.slice(0, 10)}
                                onChange={(e) => setNextHearingDate(e.target.value)}
                                className={T.field}
                            />
                            <div className="mt-2 min-h-[1.25rem]" aria-hidden />
                        </div>
                    </div>

                    {sessionHistory.length > 0 ? (
                        <div className={`${T.section} space-y-2`}>
                            <p className="text-[11px] font-black text-[#E6C673]/85">سجل المحاضر السابقة</p>
                            <div className="space-y-1.5 max-h-[min(28vh,220px)] overflow-y-auto pr-1">
                                {sessionHistory.map((record) => {
                                    const parsed = parseSessionRecordEvent(record);
                                    const isActive = editingSessionRecord?.id === record.id;
                                    return (
                                        <button
                                            key={record.id}
                                            type="button"
                                            onClick={() => {
                                                onEditSessionRecord?.(record);
                                                setPanelOpen(true);
                                            }}
                                            className={`w-full text-right rounded-xl border px-3 py-2.5 transition-colors ${
                                                isActive
                                                    ? 'border-[#E6C673]/35 bg-[#E6C673]/10'
                                                    : 'border-white/[0.08] bg-white/[0.03] hover:border-[#E6C673]/22 hover:bg-white/[0.05]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] font-bold text-white/85 truncate">
                                                    {record.title || `محضر الجلسة ${parsed.sessionNumber}`}
                                                </span>
                                                <span className="shrink-0 text-[10px] text-white/35 tabular-nums">
                                                    {String(record.date ?? '').slice(0, 10)}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

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
                    <div className="max-w-[min(96vw,92rem)] w-full mx-auto">
                        <div className="rounded-[24px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
                </div>
            </div>
        </div>,
        document.body,
    ) : null;

    return (
        <div className={`${compose === 'requests-only' ? '' : 'mb-0'} print:hidden`} dir="rtl">
            {sessionPanel}
            {readOnlySessionPanel}

            {compose !== 'requests-only' && !readOnly && onSubmitSessionRecord ? (
                isPearl && heroSessionTrigger ? (
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordOpen}
                    onClick={() => setPanelOpen(true)}
                    className={PS_HERO_SESSION}
                >
                    <div
                        className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#F0A8B4]/15 blur-2xl"
                        aria-hidden
                    />
                    <span className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#F0A8B4]/35 bg-[#F5C6D0]/[0.18] shadow-[inset_0_1px_0_rgba(255,220,228,0.30)]">
                        <Scale size={18} className="text-[#FFD4DC]" aria-hidden />
                    </span>
                    <div className="relative z-[1] min-w-0 flex-1 text-right">
                        <span className="block text-[8px] font-black tracking-[0.18em] text-[#FFD4DC]/75 uppercase">
                            الجلسة
                        </span>
                        <span className="block text-[13px] font-black text-[#FFFEF9] leading-tight">
                            محضر الجلسة
                        </span>
                    </div>
                    <ChevronDown size={15} className="relative z-[1] shrink-0 text-white/35" aria-hidden />
                </button>
                ) : isPearl ? (
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordOpen}
                    onClick={() => setPanelOpen(true)}
                    className={
                        compactSessionTrigger
                            ? `${PS_TOOLBAR_BTN} border-[#F0A8B4]/26 bg-[#F5C6D0]/[0.08]`
                            : `${T.trigger} w-full min-h-[3rem] px-2.5 py-2 flex items-center justify-end text-right`
                    }
                >
                    <Scale size={14} className="text-[#FFD4DC]/85 shrink-0" aria-hidden />
                    <span className={`font-bold text-[8px] leading-none ${T.accentText}`}>محضر</span>
                </button>
                ) : (
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordOpen}
                    onClick={() => setPanelOpen(true)}
                    className={
                        compactSessionTrigger && visualVariant === 'civil'
                            ? COMPACT_HUB_TRIGGER_GOLD
                            : `${T.trigger} mb-2`
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
                                <Scale size={14} className={T.accentIcon} shrink-0 aria-hidden />
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
                )
            ) : compose !== 'requests-only' && readOnly && sessionHistory.length > 0 ? (
                <div className={`${T.section} mb-2 space-y-2`}>
                    <p className="text-[11px] font-black text-sky-200/85">محاضر الجلسات — للاطلاع</p>
                    <div className="space-y-1.5 max-h-[min(32vh,260px)] overflow-y-auto pr-1">
                        {sessionHistory.map((record) => {
                                const parsed = parseSessionRecordEvent(record);
                                const isActive = editingSessionRecord?.id === record.id;
                                return (
                                    <button
                                        key={record.id}
                                        type="button"
                                        onClick={() => onEditSessionRecord?.(record)}
                                        className={`w-full text-right rounded-xl border px-3 py-2.5 transition-colors ${
                                            isActive
                                                ? 'border-sky-400/35 bg-sky-400/10'
                                                : 'border-white/[0.08] bg-white/[0.03] hover:border-sky-400/22 hover:bg-white/[0.05]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-bold text-white/85 truncate">
                                                {record.title || `محضر الجلسة ${parsed.sessionNumber}`}
                                            </span>
                                            <span className="shrink-0 text-[10px] text-white/35 tabular-nums">
                                                {String(record.date ?? '').slice(0, 10)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>
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
