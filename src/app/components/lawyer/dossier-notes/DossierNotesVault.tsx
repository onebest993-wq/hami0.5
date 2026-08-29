import React from 'react';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Pin } from '@/app/components/ui/icons/Pin';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { DossierNoteContext } from '@/app/services/dossier-notes/smartLawLinker';
import { DossierNoteBodyPreview } from './DossierNoteBodyPreview';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import {
    REPO_CARD,
    REPO_CARD_HEADING,
    REPO_CARD_ICON_BTN,
    REPO_CARD_ICON_BTN_ACTIVE,
    REPO_CARD_TIMESTAMP,
    REPO_NOTE_ROW,
} from '@/app/components/lawyer/SmartRepository/smartRepositoryTheme';

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
    /** @deprecated — التصميم موحّد عبر repo و execution */
    variant?: 'repo' | 'execution';
    renderNoteExtra?: (note: DossierVaultNote) => React.ReactNode;
    testId?: string;
    lawContext?: DossierNoteContext;
    flowContent?: boolean;
};

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
    renderNoteExtra,
    testId = 'dossier-notes-vault',
    lawContext,
}: DossierNotesVaultProps) {
    return (
        <div className="space-y-2" data-testid={testId} dir="rtl">
            <p className={REPO_CARD_HEADING}>
                {heading}
                {notes.length > 0 ? ` (${notes.length})` : ''}
            </p>
            <div className={`${REPO_CARD} max-h-[min(66vh,620px)] overflow-y-auto space-y-2`}>
                {notes.length === 0 ? (
                    <p className="text-[11px] text-white/40 text-center py-3">{emptyLabel}</p>
                ) : (
                    notes.map((note) => (
                        <div
                            key={note.id}
                            className={`group/note-row flex items-start gap-2 text-right ${REPO_NOTE_ROW}`}
                            dir="rtl"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-white text-xs font-semibold break-words">{note.title}</p>
                                {note.date ? (
                                    <p className={`${REPO_CARD_TIMESTAMP} mt-0.5`}>
                                        {formatVaultNoteDate(note.date)}
                                    </p>
                                ) : null}
                                <DossierNoteBodyPreview body={note.body} className="mt-0.5" lawContext={lawContext} />
                            </div>
                            {renderNoteExtra?.(note)}
                            <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/note-row:opacity-100 sm:group-focus-within/note-row:opacity-100 transition-opacity duration-150">
                                {onTogglePin ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTogglePin(note.id);
                                        }}
                                        className={note.pinned ? REPO_CARD_ICON_BTN_ACTIVE : REPO_CARD_ICON_BTN}
                                        title={note.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                        data-testid={`dossier-note-pin-${note.id}`}
                                        aria-label={note.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                        aria-pressed={Boolean(note.pinned)}
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
                                        className={REPO_CARD_ICON_BTN}
                                        title="تعديل"
                                        data-testid={`dossier-note-edit-${note.id}`}
                                        aria-label="تعديل"
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
                                        className={`${REPO_CARD_ICON_BTN} hover:text-red-400 hover:border-red-400/25`}
                                        title="حذف"
                                        data-testid={`dossier-note-delete-${note.id}`}
                                        aria-label="حذف"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
