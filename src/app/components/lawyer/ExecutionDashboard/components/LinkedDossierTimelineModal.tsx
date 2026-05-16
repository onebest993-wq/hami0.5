import React, { useMemo } from 'react';
import { X, Clock, Calendar, FileText, User, Ban } from 'lucide-react';
import { storageCache } from '@/app/utils/storageCache';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';

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
    const { timelineEvents, hasLocalFile } = useMemo(() => {
        try {
            const cached = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
            const allFiles: any[] = Array.isArray(cached) ? cached : [];
            const linkedFile = allFiles.find((f: any) => String(f.id) === dossier.linkedId);
            if (linkedFile?.timelineEvents && Array.isArray(linkedFile.timelineEvents)) {
                return {
                    hasLocalFile: true,
                    timelineEvents: linkedFile.timelineEvents.slice().sort(
                    (a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime()
                    ),
                };
            }
            return { hasLocalFile: Boolean(linkedFile), timelineEvents: [] as any[] };
        } catch {
            return { hasLocalFile: false, timelineEvents: [] as any[] };
        }
    }, [dossier.linkedId]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-blue-400" />
                        <h3 className="text-base font-bold text-white">
                            السجل الزمني — إضبارة زميل
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
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
                                        className="rounded-lg border border-slate-600/40 bg-slate-900/40 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-900/60"
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
                        {timelineEvents.map((event: any, idx: number) => {
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
