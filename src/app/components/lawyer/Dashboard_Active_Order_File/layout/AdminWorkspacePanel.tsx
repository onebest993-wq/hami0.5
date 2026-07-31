import React, { useMemo, useState } from 'react';
import { ChevronDown, ClipboardList, History, StickyNote, Paperclip, Plus } from 'lucide-react';
import { ValidationBanner } from '../components/ValidationBanner';
import { DatePickerField } from '../components/DatePickerField';
import { formatDateText, formatDateTimeText, formatTimeText, eventKindMeta } from '../utils/formatters';
import type { AdminWorkspacePanelProps } from './AdminWorkspacePanelProps';
import {
    URGENT_DOSSIER_BTN_GHOST,
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_CARD,
    URGENT_DOSSIER_INPUT,
    URGENT_DOSSIER_SECTION_TITLE,
} from './urgentDossierUi';

export type { AdminWorkspacePanelProps } from './AdminWorkspacePanelProps';

type WorkspaceTab = 'tasks' | 'events' | 'notes' | 'attachments';
type WorkspaceVariant = 'card' | 'embedded' | 'dock';

function EmptyState({ text }: { text: string }) {
    return (
        <div className="text-white/40 text-xs py-3 text-center border border-dashed border-white/10 rounded-lg bg-black/10">
            {text}
        </div>
    );
}

export function AdminWorkspacePanel({
    variant = 'card',
    isIqrarContext,
    isFinalized,
    newFollowupTitle,
    setNewFollowupTitle,
    newFollowupDate,
    setNewFollowupDate,
    requestDateYmd,
    addFollowup,
    caseFollowups,
    todayYmdValue,
    toggleFollowupCompleted,
    deleteFollowup,
    caseEvents,
    newEventText,
    setNewEventText,
    addManualEvent,
    caseEventDayGroups,
    newNoteText,
    setNewNoteText,
    addCaseNote,
    caseNotes,
    deleteCaseNote,
    attachmentsError,
    attachmentInputId,
    addAttachmentFile,
    caseAttachments,
    deleteAttachment,
}: AdminWorkspacePanelProps & { variant?: WorkspaceVariant; embedded?: boolean }) {
    const tabs = useMemo(() => {
        const list: Array<{
            id: WorkspaceTab;
            label: string;
            icon: React.ReactNode;
            count: number;
        }> = [];

        if (!isIqrarContext) {
            list.push({
                id: 'tasks',
                label: 'مهام',
                icon: <ClipboardList size={15} aria-hidden />,
                count: caseFollowups.length,
            });
            list.push({
                id: 'events',
                label: 'أحداث',
                icon: <History size={15} aria-hidden />,
                count: caseEvents.length,
            });
        }
        list.push({
            id: 'notes',
            label: 'ملاحظات',
            icon: <StickyNote size={15} aria-hidden />,
            count: caseNotes.length,
        });
        list.push({
            id: 'attachments',
            label: 'مرفقات',
            icon: <Paperclip size={15} aria-hidden />,
            count: caseAttachments.length,
        });
        return list;
    }, [
        isIqrarContext,
        caseFollowups.length,
        caseEvents.length,
        caseNotes.length,
        caseAttachments.length,
    ]);

    const defaultTab: WorkspaceTab = isIqrarContext ? 'notes' : 'tasks';
    const [activeTab, setActiveTab] = useState<WorkspaceTab>(defaultTab);
    const [dockOpen, setDockOpen] = useState(false);

    const resolvedTab = tabs.some((t) => t.id === activeTab) ? activeTab : defaultTab;
    const activeTabMeta = tabs.find((t) => t.id === resolvedTab);

    const handleTabClick = (tabId: WorkspaceTab) => {
        if (variant === 'dock') {
            if (dockOpen && resolvedTab === tabId) {
                setDockOpen(false);
            } else {
                setActiveTab(tabId);
                setDockOpen(true);
            }
        } else {
            setActiveTab(tabId);
        }
    };

    const tabContent = (
        <>
            {resolvedTab === 'tasks' && !isIqrarContext && (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={newFollowupTitle}
                            onChange={(e) => setNewFollowupTitle(e.target.value)}
                            disabled={isFinalized}
                            placeholder="عنوان المهمة..."
                            className={URGENT_DOSSIER_INPUT}
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                            <DatePickerField
                                value={newFollowupDate || ''}
                                onValueChange={(v) => setNewFollowupDate(v)}
                                min={requestDateYmd || undefined}
                                disabled={isFinalized}
                                inputClassName={`flex-1 ${URGENT_DOSSIER_INPUT}`}
                            />
                            <button
                                type="button"
                                onClick={addFollowup}
                                disabled={
                                    isFinalized ||
                                    (!!requestDateYmd && !!newFollowupDate && newFollowupDate < requestDateYmd)
                                }
                                className={`${URGENT_DOSSIER_BTN_PRIMARY} sm:min-w-[7rem]`}
                            >
                                <Plus size={16} aria-hidden />
                                إضافة
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                        {caseFollowups.length === 0 ? (
                            <EmptyState text="لا توجد مهام" />
                        ) : (
                            caseFollowups.map((f) => (
                                <div
                                    key={f.id}
                                    className={`bg-black/20 border rounded-lg p-2.5 ${
                                        !f.completed && f.date && f.date < todayYmdValue
                                            ? 'border-red-500/30'
                                            : 'border-white/10'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <label className="flex items-start gap-2.5 cursor-pointer min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={f.completed}
                                                onChange={() => toggleFollowupCompleted(f.id)}
                                                disabled={isFinalized}
                                                className="mt-0.5 accent-[#E6C673] w-4 h-4 shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <div
                                                    className={`text-sm font-bold break-words ${
                                                        f.completed ? 'text-white/50 line-through' : 'text-white'
                                                    }`}
                                                >
                                                    {f.title}
                                                </div>
                                                <div
                                                    className={`text-xs mt-0.5 ${
                                                        !f.completed && f.date && f.date < todayYmdValue
                                                            ? 'text-red-300'
                                                            : 'text-white/60'
                                                    }`}
                                                >
                                                    الاستحقاق: {formatDateText(f.date)}
                                                </div>
                                            </div>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => deleteFollowup(f.id)}
                                            disabled={isFinalized}
                                            className="text-red-300 hover:text-red-200 text-xs font-bold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {resolvedTab === 'events' && !isIqrarContext && (
                <div className="space-y-3">
                    {!isFinalized && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={newEventText}
                                onChange={(e) => setNewEventText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') addManualEvent();
                                }}
                                placeholder="إضافة ملاحظة إجرائية يدوياً..."
                                className={`flex-1 ${URGENT_DOSSIER_INPUT}`}
                            />
                            <button type="button" onClick={addManualEvent} className={URGENT_DOSSIER_BTN_PRIMARY}>
                                <Plus size={16} aria-hidden />
                                إضافة
                            </button>
                        </div>
                    )}
                    <div className="max-h-[min(24rem,45vh)] overflow-y-auto pr-1">
                        {caseEventDayGroups.length === 0 ? (
                            <EmptyState text="لا توجد أحداث مسجّلة بعد" />
                        ) : (
                            caseEventDayGroups.map((group) => (
                                <div key={group.dayKey} className="mb-4 last:mb-0">
                                    <div className="sticky top-0 z-10 py-1 bg-[#0B1021]/90 backdrop-blur-sm">
                                        <div className="text-[#E6C673] text-xs font-extrabold tracking-wide">
                                            {group.dayLabel}
                                        </div>
                                    </div>
                                    <div className="relative mt-2 mr-2 border-r border-white/15 pr-4 space-y-3">
                                        {group.events.map((ev) => {
                                            const meta = eventKindMeta(ev.kind);
                                            return (
                                                <div key={ev.id} className="relative">
                                                    <span
                                                        className={`absolute -right-[19px] top-2 w-2 h-2 rounded-full ring-4 ring-[#0B1021] ${meta.dot}`}
                                                        aria-hidden
                                                    />
                                                    <div className="bg-black/25 border border-white/10 rounded-lg p-2.5">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span
                                                                className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold ${meta.badge}`}
                                                            >
                                                                {meta.label}
                                                            </span>
                                                            <span className="text-white/45 text-[10px] shrink-0 tabular-nums">
                                                                {formatTimeText(ev.createdAt) ||
                                                                    formatDateTimeText(ev.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-white/90 text-sm leading-relaxed mt-1.5">
                                                            {ev.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {resolvedTab === 'notes' && (
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            disabled={isFinalized}
                            placeholder="اكتب ملاحظة..."
                            className={`flex-1 ${URGENT_DOSSIER_INPUT}`}
                        />
                        <button
                            type="button"
                            onClick={addCaseNote}
                            disabled={isFinalized}
                            className={URGENT_DOSSIER_BTN_PRIMARY}
                        >
                            <Plus size={16} aria-hidden />
                            إضافة
                        </button>
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                        {caseNotes.length === 0 ? (
                            <EmptyState text="لا توجد ملاحظات" />
                        ) : (
                            caseNotes.map((n) => (
                                <div key={n.id} className="bg-black/20 border border-white/10 rounded-lg p-2.5">
                                    <div className="text-white/90 text-sm leading-relaxed break-words">{n.text}</div>
                                    <div className="mt-1.5 flex items-center justify-between text-white/45 text-[11px]">
                                        <span>{formatDateTimeText(n.createdAt)}</span>
                                        <button
                                            type="button"
                                            onClick={() => deleteCaseNote(n.id)}
                                            disabled={isFinalized}
                                            className="text-red-300 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {resolvedTab === 'attachments' && (
                <div className="space-y-3">
                    {!!attachmentsError ? <ValidationBanner text={attachmentsError} /> : null}
                    <input
                        id={attachmentInputId}
                        type="file"
                        accept="image/*,application/pdf"
                        disabled={isFinalized}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) addAttachmentFile(file);
                            e.currentTarget.value = '';
                        }}
                        className="hidden"
                    />
                    <label
                        htmlFor={attachmentInputId}
                        className={`${URGENT_DOSSIER_BTN_GHOST} w-full sm:w-auto ${
                            isFinalized ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                        }`}
                    >
                        <Paperclip size={16} aria-hidden />
                        ارفع مستنداً
                    </label>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                        {caseAttachments.length === 0 ? (
                            <EmptyState text="لا توجد مرفقات" />
                        ) : (
                            caseAttachments.map((a) => (
                                <div key={a.id} className="bg-black/20 border border-white/10 rounded-lg p-2.5">
                                    <div className="text-white text-sm break-all">
                                        {a.url ? (
                                            <a
                                                href={a.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="underline decoration-white/30 hover:decoration-white"
                                            >
                                                {a.name}
                                            </a>
                                        ) : (
                                            a.name
                                        )}
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between text-white/40 text-xs">
                                        <span>{formatDateText(a.createdAt)}</span>
                                        <button
                                            type="button"
                                            onClick={() => deleteAttachment(a.id)}
                                            disabled={isFinalized}
                                            className="text-red-300 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );

    const tabBar = (
        <div
            className={`flex gap-1 p-1 rounded-xl border border-white/[0.08] bg-white/[0.03] ${
                variant === 'dock' ? 'shadow-[0_-12px_40px_rgba(0,0,0,0.45)]' : ''
            }`}
            role="tablist"
            aria-label="مساحة العمل"
        >
            {tabs.map((tab) => {
                const isActive = resolvedTab === tab.id && (variant !== 'dock' || dockOpen);
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-bold transition-all min-h-[44px] touch-manipulation ${
                            isActive
                                ? 'bg-[#E6C673]/16 border border-[#E6C673]/35 text-[#F5F0E6] shadow-[inset_0_1px_0_rgba(230,198,115,0.2)]'
                                : 'border border-transparent text-white/45 hover:text-white/80 hover:bg-white/[0.05]'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden xs:inline sm:inline">{tab.label}</span>
                        {tab.count > 0 && (
                            <span
                                className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
                                    isActive ? 'bg-[#E6C673]/25 text-[#F5F0E6]' : 'bg-white/10 text-white/55'
                                }`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );

    if (variant === 'dock') {
        return (
            <div
                className="fixed bottom-0 left-0 right-0 z-[210] pointer-events-none"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="max-w-5xl mx-auto px-4 pb-2 pointer-events-auto">
                    {dockOpen && (
                        <div
                            className="mb-2 rounded-2xl border border-white/[0.1] bg-[#0B1021]/97 backdrop-blur-xl shadow-2xl overflow-hidden"
                            role="tabpanel"
                        >
                            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.06]">
                                <div className="flex items-center gap-2 min-w-0">
                                    {activeTabMeta?.icon}
                                    <span className="text-sm font-extrabold text-white truncate">
                                        {activeTabMeta?.label}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDockOpen(false)}
                                    className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-colors touch-manipulation"
                                    aria-label="إغلاق"
                                >
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                            <div className="p-3 max-h-[min(50vh,420px)] overflow-y-auto overscroll-y-contain">
                                {tabContent}
                            </div>
                        </div>
                    )}
                    {tabBar}
                </div>
            </div>
        );
    }

    const shellClass = variant === 'embedded' ? '' : `${URGENT_DOSSIER_CARD} p-4`;

    return (
        <div className={shellClass}>
            <h2 className={URGENT_DOSSIER_SECTION_TITLE}>مساحة العمل</h2>
            <div className="mt-3">{tabBar}</div>
            <div className="mt-3" role="tabpanel">{tabContent}</div>
        </div>
    );
}
