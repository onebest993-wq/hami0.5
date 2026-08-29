import React, { useMemo, useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { ClipboardList } from '@/app/components/ui/icons/ClipboardList';
import { History } from '@/app/components/ui/icons/History';
import { StickyNote } from '@/app/components/ui/icons/StickyNote';
import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import type { AdminWorkspacePanelProps } from './AdminWorkspacePanelProps';
import {
    AdminWorkspaceTabContent,
    type WorkspaceTab,
} from './AdminWorkspaceTabContent';
import {
    URGENT_DOSSIER_CARD,
    URGENT_DOSSIER_SECTION_TITLE,
} from './urgentDossierUi';

export type { AdminWorkspacePanelProps } from './AdminWorkspacePanelProps';

type WorkspaceVariant = 'card' | 'embedded' | 'dock';

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
        <AdminWorkspaceTabContent
            resolvedTab={resolvedTab}
            isIqrarContext={isIqrarContext}
            isFinalized={isFinalized}
            newFollowupTitle={newFollowupTitle}
            setNewFollowupTitle={setNewFollowupTitle}
            newFollowupDate={newFollowupDate}
            setNewFollowupDate={setNewFollowupDate}
            requestDateYmd={requestDateYmd}
            addFollowup={addFollowup}
            caseFollowups={caseFollowups}
            todayYmdValue={todayYmdValue}
            toggleFollowupCompleted={toggleFollowupCompleted}
            deleteFollowup={deleteFollowup}
            newEventText={newEventText}
            setNewEventText={setNewEventText}
            addManualEvent={addManualEvent}
            caseEventDayGroups={caseEventDayGroups}
            newNoteText={newNoteText}
            setNewNoteText={setNewNoteText}
            addCaseNote={addCaseNote}
            caseNotes={caseNotes}
            deleteCaseNote={deleteCaseNote}
            attachmentsError={attachmentsError}
            attachmentInputId={attachmentInputId}
            addAttachmentFile={addAttachmentFile}
            caseAttachments={caseAttachments}
            deleteAttachment={deleteAttachment}
        />
    );

    const tabBar = (
        <div
            className="flex gap-1 p-1 rounded-lg border border-white/10 bg-transparent"
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
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-bold min-h-[44px] touch-manipulation ${
                            isActive
                                ? 'bg-white/[0.12] text-white'
                                : 'text-white/45 hover:text-white/80 hover:bg-white/[0.05]'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden xs:inline sm:inline">{tab.label}</span>
                        {tab.count > 0 && (
                            <span
                                className={`tabular-nums text-[10px] ${
                                    isActive ? 'text-white' : 'text-white/45'
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
                <div className="max-w-5xl mx-auto px-3 pb-2 pointer-events-auto">
                    {dockOpen && (
                        <div
                            className="mb-2 rounded-xl border border-white/10 bg-[#0B1021] overflow-hidden"
                            role="tabpanel"
                        >
                            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
                                <div className="flex items-center gap-2 min-w-0">
                                    {activeTabMeta?.icon}
                                    <span className="text-sm font-bold text-white truncate">
                                        {activeTabMeta?.label}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDockOpen(false)}
                                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white touch-manipulation"
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
