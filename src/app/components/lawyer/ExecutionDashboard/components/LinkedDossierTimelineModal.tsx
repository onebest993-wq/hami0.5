import React, { useMemo } from 'react';
import { X } from '@/app/components/ui/icons/X';
import { Clock } from '@/app/components/ui/icons/Clock';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { FileText } from '@/app/components/ui/icons/FileText';
import { User } from '@/app/components/ui/icons/User';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_EDIT_SHELL_MAX,
    EXEC_MODAL_TOUCH_TARGET,
} from '../executionModalMobileShell';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

interface LinkedDossierTimelineModalProps {
    dossier: {
        linkedId: string;
        type: 'own' | 'colleague';
        directorate?: string;
        fileNumber?: string;
        fileYear?: string;
        linkToken?: string;
    };
    onClose: () => void;
}

type LinkedTimelineEvent = TimelineEvent & { createdAt?: string };

type StoredExecutionFileLite = Pick<ExecutionFile, 'id'> & {
    timelineEvents?: LinkedTimelineEvent[];
};

function isStoredExecutionFileLite(value: unknown): value is StoredExecutionFileLite {
    return Boolean(value) && typeof value === 'object' && 'id' in (value as object);
}

const timelineTypeIcon: Record<string, React.ReactNode> = {
    system: <Calendar size={14} />,
    decision: <FileText size={14} />,
    action: <User size={14} />,
};

const timelineTypeColor: Record<string, string> = {
    system: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
    decision: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
    action: 'border-blue-500/30 bg-blue-950/20 text-blue-300',
};

export function LinkedDossierTimelineModal({ dossier, onClose }: LinkedDossierTimelineModalProps) {
    useBodyScrollLock(true);

    const { timelineEvents, hasLocalFile } = useMemo(() => {
        try {
            const cached = loadExecutionFilesRaw();
            const allFiles: StoredExecutionFileLite[] = Array.isArray(cached)
                ? cached.filter(isStoredExecutionFileLite)
                : [];
            const linkedFile = allFiles.find((f) => String(f.id) === dossier.linkedId);
            if (linkedFile?.timelineEvents && Array.isArray(linkedFile.timelineEvents)) {
                return {
                    hasLocalFile: true,
                    timelineEvents: linkedFile.timelineEvents.slice().sort(
                        (a, b) =>
                            new Date(b.createdAt || b.date || 0).getTime() -
                            new Date(a.createdAt || a.date || 0).getTime()
                    ),
                };
            }
            return { hasLocalFile: Boolean(linkedFile), timelineEvents: [] as LinkedTimelineEvent[] };
        } catch {
            return { hasLocalFile: false, timelineEvents: [] as LinkedTimelineEvent[] };
        }
    }, [dossier.linkedId]);

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            onClick={onClose}
            role="presentation"
        >
            <div
                className={`w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-lg ${EXEC_MODAL_EDIT_SHELL_MAX}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-blue-400" />
                        <h3 className="text-base font-bold text-white">
                            السجل الزمني — إضبارة زميل
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mb-4 rounded-lg bg-blue-950/30 border border-blue-500/20 px-3 py-2 text-xs text-blue-300/80">
                    {dossier.fileNumber || '---'} / {dossier.fileYear || '---'} — {dossier.directorate || '---'}
                    <span className="mr-2 text-[9px] text-yellow-400/70">(إضبارة زميل — قراءة فقط)</span>
                </div>

                {timelineEvents.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
                        <Clock size={32} className="text-slate-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-300">
                            {hasLocalFile ? 'لا توجد أحداث في السجل الزمني لهذه الإضبارة' : 'لا يمكن عرض سجل هذه الإضبارة على هذا الجهاز'}
                        </p>
                        {dossier.linkToken ? (
                            <div className="mt-3 space-y-2">
                                <p className="text-[10px] text-slate-500">رمز الربط:</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="rounded-lg border border-slate-600/40 bg-slate-950/30 px-2 py-1 text-[10px] font-mono text-slate-200">
                                        {dossier.linkToken}
                                    </span>
                                    <button
                                        type="button"
                                        className={`rounded-lg border border-slate-600/40 bg-slate-900/40 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-900/60 ${EXEC_MODAL_TOUCH_TARGET}`}
                                        onClick={() => {
                                            navigator.clipboard.writeText(dossier.linkToken || '').catch(() => {});
                                        }}
                                    >
                                        نسخ
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500">قدّم هذا الرمز للزميل لتمكين الربط عنده.</p>
                            </div>
                        ) : (
                            <p className="mt-1 text-[10px] text-slate-500">قد لا تكون الإضبارة متاحة للمشاهدة حالياً</p>
                        )}
                    </div>
                ) : (
                    <div className="relative space-y-2">
                        {timelineEvents.map((event, idx) => {
                            const icon = timelineTypeIcon[event.type] || <Calendar size={14} />;
                            const color = timelineTypeColor[event.type] || timelineTypeColor.system;
                            return (
                                <div key={event.id || idx} className={`flex items-start gap-3 rounded-lg border p-3 ${color}`}>
                                    <div className="mt-0.5 shrink-0">
                                        {icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold">{event.title}</p>
                                        {event.description && (
                                            <p className="mt-0.5 text-[10px] opacity-80">{event.description}</p>
                                        )}
                                        <p className="mt-1 text-[9px] opacity-50">{event.date || event.createdAt?.split('T')[0] || ''}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
