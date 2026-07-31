/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🗑️ Execution Trash Modal - سلة مهملات الإضبارة
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * مكون عرض وإدارة العناصر المحذوفة في الإضبارة
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import React from 'react';
import { X, Trash2, CheckCircle } from 'lucide-react';
import type { TimelineEvent } from '@/app/types/execution';
import type { ExecutionFile } from '@/app/types/execution';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_TOUCH_TARGET,
    EXEC_MODAL_TRASH_SHELL_MAX,
} from '../executionModalMobileShell';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionTrashModalProps {
    /** حالة ظهور النافذة */
    visible: boolean;
    /** أحداث السجل المحذوفة */
    trashedTimelineEvents: TimelineEvent[];
    /** الملاحظات المحذوفة */
    trashedCaseNotes: NonNullable<ExecutionFile['caseNotesLog']>;
    /** المهام المحذوفة */
    trashedCaseTasks: NonNullable<ExecutionFile['caseTasksPending']>;
    /** دالة إغلاق النافذة */
    onClose: () => void;
    /** دالة استرجاع حدث سجل */
    onRestoreTimelineEvent: (id: string, trashedAt: string) => void;
    /** دالة حذف نهائي لحدث سجل */
    onPermanentDeleteTimeline: (id: string) => void;
    /** دالة استرجاع ملاحظة */
    onRestoreCaseNote: (id: string, trashedAt: string) => void;
    /** دالة حذف نهائي لملاحظة */
    onPermanentDeleteCaseNote: (id: string) => void;
    /** دالة استرجاع مهمة */
    onRestoreCaseTask: (id: string, trashedAt: string) => void;
    /** دالة حذف نهائي لمهمة */
    onPermanentDeleteCaseTask: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * نافذة سلة مهملات الإضبارة
 */
export const ExecutionTrashModal: React.FC<ExecutionTrashModalProps> = ({
    visible,
    trashedTimelineEvents,
    trashedCaseNotes,
    trashedCaseTasks,
    onClose,
    onRestoreTimelineEvent,
    onPermanentDeleteTimeline,
    onRestoreCaseNote,
    onPermanentDeleteCaseNote,
    onRestoreCaseTask,
    onPermanentDeleteCaseTask,
}) => {
    useBodyScrollLock(visible);

    if (!visible) return null;

    const hasTrashedItems = 
        trashedTimelineEvents.length > 0 || 
        trashedCaseNotes.length > 0 || 
        trashedCaseTasks.length > 0;

    return (
        <div
            className={`fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            dir="rtl"
            onClick={onClose}
            role="presentation"
        >
            <div
                className={`flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0B1120] shadow-2xl shadow-black/50 ${EXEC_MODAL_TRASH_SHELL_MAX}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="سلة مهملات الإضبارة"
            >
                {/* Header */}
                <div
                    className={`sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-l from-slate-950/90 to-[#0B1120] p-3 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <h3 className="flex flex-row-reverse items-center gap-2 text-sm font-bold text-slate-100">
                        <Trash2 size={16} className="text-slate-300" />
                        سلة مهملات الإضبارة
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 shrink-0 opacity-0"
                        aria-hidden="true"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-3">
                    <p className="mb-4 text-[11px] leading-relaxed text-slate-400">
                        العناصر هنا محذوفة من العرض فقط. «الحذف النهائي» لا يمكن التراجع عنه.
                    </p>

                    {/* Trashed Timeline Events */}
                    {trashedTimelineEvents.length > 0 && (
                        <div className="mb-4 space-y-2">
                            <p className="text-[11px] font-black text-slate-200">السجل الزمني</p>
                            {trashedTimelineEvents.map((event) => (
                                <TrashedItemCard
                                    key={event.id}
                                    title={event.title}
                                    onRestore={() => onRestoreTimelineEvent(String(event.id), String(event.trashedAt || ''))}
                                    onPermanentDelete={() => onPermanentDeleteTimeline(String(event.id))}
                                />
                            ))}
                        </div>
                    )}

                    {/* Trashed Case Notes */}
                    {trashedCaseNotes.length > 0 && (
                        <div className="mb-4 space-y-2">
                            <p className="text-[11px] font-black text-slate-200">ملاحظات</p>
                            {trashedCaseNotes.map((note) => (
                                <TrashedItemCard
                                    key={note.id}
                                    title={note.title}
                                    onRestore={() => onRestoreCaseNote(String(note.id), String(note.trashedAt || ''))}
                                    onPermanentDelete={() => onPermanentDeleteCaseNote(String(note.id))}
                                />
                            ))}
                        </div>
                    )}

                    {/* Trashed Case Tasks */}
                    {trashedCaseTasks.length > 0 && (
                        <div className="mb-2 space-y-2">
                            <p className="text-[11px] font-black text-slate-200">مهام</p>
                            {trashedCaseTasks.map((task) => (
                                <TrashedItemCard
                                    key={task.id}
                                    title={task.title}
                                    onRestore={() => onRestoreCaseTask(String(task.id), String(task.trashedAt || ''))}
                                    onPermanentDelete={() => onPermanentDeleteCaseTask(String(task.id))}
                                />
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!hasTrashedItems && (
                        <p className="py-10 text-center text-sm text-slate-500">السلة فارغة</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface TrashedItemCardProps {
    title: string;
    onRestore: () => void;
    onPermanentDelete: () => void;
}

const TrashedItemCard: React.FC<TrashedItemCardProps> = ({
    title,
    onRestore,
    onPermanentDelete,
}) => {
    return (
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold text-white line-clamp-2">{title}</p>
            <div className="flex flex-wrap justify-end gap-2">
                <button
                    type="button"
                    onClick={onRestore}
                    className={`${EXEC_MODAL_TOUCH_TARGET} inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-950/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200 hover:bg-emerald-950/20`}
                >
                    <CheckCircle size={12} className="opacity-90" />
                    استرجاع
                </button>
                <button
                    type="button"
                    onClick={onPermanentDelete}
                    className={`${EXEC_MODAL_TOUCH_TARGET} rounded-lg border border-rose-500/25 bg-rose-950/10 px-2.5 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-950/20`}
                >
                    حذف نهائي
                </button>
            </div>
        </div>
    );
};