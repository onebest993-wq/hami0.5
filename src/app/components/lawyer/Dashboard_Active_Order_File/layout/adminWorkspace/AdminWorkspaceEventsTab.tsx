import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { formatDateTimeText, formatTimeText, eventKindMeta } from '../../utils/formatters';
import type { AdminWorkspacePanelProps } from '../AdminWorkspacePanelProps';
import { URGENT_DOSSIER_BTN_PRIMARY, URGENT_DOSSIER_INPUT } from '../urgentDossierUi';
import { AdminWorkspaceEmptyState } from './AdminWorkspaceEmptyState';

export type AdminWorkspaceEventsTabProps = Pick<
    AdminWorkspacePanelProps,
    'isFinalized' | 'newEventText' | 'setNewEventText' | 'addManualEvent' | 'caseEventDayGroups'
>;

export function AdminWorkspaceEventsTab({
    isFinalized,
    newEventText,
    setNewEventText,
    addManualEvent,
    caseEventDayGroups,
}: AdminWorkspaceEventsTabProps) {
    return (
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
                    <AdminWorkspaceEmptyState text="لا توجد أحداث مسجّلة بعد" />
                ) : (
                    caseEventDayGroups.map((group) => (
                        <div key={group.dayKey} className="mb-4 last:mb-0">
                            <div className="sticky top-0 z-10 py-1 bg-[#0B1021]">
                                <div className="text-white/55 text-xs font-bold">
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
    );
}
