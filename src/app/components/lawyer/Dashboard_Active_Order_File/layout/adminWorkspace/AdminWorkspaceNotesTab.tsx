import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { formatDateTimeText } from '../../utils/formatters';
import type { AdminWorkspacePanelProps } from '../AdminWorkspacePanelProps';
import { URGENT_DOSSIER_BTN_PRIMARY, URGENT_DOSSIER_INPUT } from '../urgentDossierUi';
import { AdminWorkspaceEmptyState } from './AdminWorkspaceEmptyState';

export type AdminWorkspaceNotesTabProps = Pick<
    AdminWorkspacePanelProps,
    'isFinalized' | 'newNoteText' | 'setNewNoteText' | 'addCaseNote' | 'caseNotes' | 'deleteCaseNote'
>;

export function AdminWorkspaceNotesTab({
    isFinalized,
    newNoteText,
    setNewNoteText,
    addCaseNote,
    caseNotes,
    deleteCaseNote,
}: AdminWorkspaceNotesTabProps) {
    return (
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
                    <AdminWorkspaceEmptyState text="لا توجد ملاحظات" />
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
    );
}
