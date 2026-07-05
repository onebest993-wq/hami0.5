import React from 'react';
import { Pencil, Pin, Trash2 } from 'lucide-react';
import type { DossierNoteContext } from '@/app/services/dossier-notes/smartLawLinker';
import { DossierNoteBodyPreview } from './DossierNoteBodyPreview';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';

export type DossierVaultNote = {
    id: string;
    title: string;
    body: string;
    date?: string;
    pinned?: boolean;
};

type DossierNotesVaultProps = {
    notes: DossierVaultNote[];
    onEdit?: (note: DossierVaultNote) => void;
    onDelete?: (id: string) => void;
    onTogglePin?: (id: string) => void;
    emptyLabel?: string;
    heading?: string;
    variant?: 'repo' | 'execution';
    renderNoteExtra?: (note: DossierVaultNote) => React.ReactNode;
    testId?: string;
    lawContext?: DossierNoteContext;
};

const variantStyles = {
    repo: {
        shell: 'rounded-2xl border border-[#E6C673]/18 bg-[#0A0F1C]/40 p-3',
        heading: 'text-xs font-bold text-[#E6C673]/90',
        row: 'rounded-xl border border-white/[0.06] bg-white/[0.02] p-3',
        title: 'text-white text-xs font-semibold break-words',
        date: 'text-[10px] text-white/35 font-mono tabular-nums',
        pinActive: 'border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673]',
        pinIdle: 'border-white/10 text-white/45 hover:bg-white/5',
        delete: 'border-rose-500/25 text-rose-300 hover:bg-rose-950/40',
        edit: 'border-[#E6C673]/28 text-[#E6C673]/90 hover:bg-[#E6C673]/10',
        empty: 'text-[11px] text-white/40 text-center py-3',
    },
    execution: {
        shell: 'rounded-2xl border border-amber-500/15 bg-[#0A0F1C]/35 p-3',
        heading: 'text-xs font-bold text-amber-300/90',
        row: 'rounded-xl border border-slate-700/30 bg-white/[0.02] p-3',
        title: 'text-white text-xs font-semibold break-words',
        date: 'text-[10px] text-slate-400 font-mono tabular-nums',
        pinActive: 'border-amber-400/35 bg-amber-500/15 text-amber-200',
        pinIdle: 'border-white/10 text-slate-400 hover:bg-white/5',
        delete: 'border-rose-500/25 text-rose-300 hover:bg-rose-950/40',
        edit: 'border-amber-400/30 text-amber-100 hover:bg-amber-900/30',
        empty: 'text-[11px] text-slate-500 text-center py-3',
    },
} as const;

function formatVaultNoteDate(raw?: string): string | null {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    const d = s.includes('T') ? new Date(s) : parseLocalNotificationDate(s);
    if (Number.isNaN(d.getTime())) return s;
    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(d);
    } catch {
        return d.toLocaleString('ar-IQ');
    }
}

export function DossierNotesVault({
    notes,
    onEdit,
    onDelete,
    onTogglePin,
    emptyLabel = 'لا توجد ملاحظات محفوظة بعد.',
    heading = 'مخزن الملاحظات',
    variant = 'repo',
    renderNoteExtra,
    testId = 'dossier-notes-vault',
    lawContext,
}: DossierNotesVaultProps) {
    const s = variantStyles[variant];

    return (
        <div className="space-y-2" data-testid={testId} dir="rtl">
            <p className={`${s.heading} text-right`}>
                {heading}
                {notes.length > 0 ? ` (${notes.length})` : ''}
            </p>
            <div className={`${s.shell} min-h-[min(46vh,380px)] max-h-[min(66vh,620px)] overflow-y-auto space-y-2`}>
                {notes.length === 0 ? (
                    <p className={s.empty}>{emptyLabel}</p>
                ) : (
                    notes.map((note) => (
                        <div
                            key={note.id}
                            className={`flex items-start gap-2 text-right ${s.row}`}
                            dir="rtl"
                        >
                            <div className="min-w-0 flex-1">
                                <p className={s.title}>{note.title}</p>
                                {note.date ? (
                                    <p className={`${s.date} mt-0.5`}>{formatVaultNoteDate(note.date)}</p>
                                ) : null}
                                <DossierNoteBodyPreview body={note.body} className="mt-0.5" lawContext={lawContext} />
                            </div>
                            {renderNoteExtra?.(note)}
                            {onTogglePin ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePin(note.id);
                                    }}
                                    className={`shrink-0 rounded-lg border p-1 transition-all ${
                                        note.pinned ? s.pinActive : s.pinIdle
                                    }`}
                                    title={note.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                    data-testid={`dossier-note-pin-${note.id}`}
                                >
                                    <Pin size={14} className={note.pinned ? 'fill-current' : undefined} />
                                </button>
                            ) : null}
                            {onEdit ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(note);
                                    }}
                                    className={`shrink-0 rounded-lg border p-1 transition-all ${s.edit}`}
                                    title="تعديل"
                                    data-testid={`dossier-note-edit-${note.id}`}
                                >
                                    <Pencil size={14} />
                                </button>
                            ) : null}
                            {onDelete ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(note.id);
                                    }}
                                    className={`shrink-0 rounded-lg border p-1 transition-all ${s.delete}`}
                                    title="حذف"
                                    data-testid={`dossier-note-delete-${note.id}`}
                                >
                                    <Trash2 size={14} />
                                </button>
                            ) : null}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
