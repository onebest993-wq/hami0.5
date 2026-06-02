import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Save, FileText, Mic, StopCircle, ArrowRight, Calendar } from 'lucide-react';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildNoteWorkspacePin } from '@/app/workspace/workspacePinBuilders';

type NotepadNote = {
    id: string | number;
    title?: string;
    body?: string;
    text?: string;
    date?: string;
    apptDate?: string;
    reminder_at?: string;
    createdAt?: string;
    isPinned?: boolean;
};

export type NotepadSaveNote = {
    id: string | number;
    title: string;
    body: string;
    date: string;
    apptDate?: string;
    reminder_at?: string;
    isPinned: boolean;
};

interface NotepadModalProps {
    isOpen: boolean;
    onClose: () => void;
    startMode: 'view' | 'add' | 'list' | 'create' | 'voice';
    notes: NotepadNote[];
    onSave: (note: NotepadSaveNote) => void;
    onDelete: (id: string | number) => void;
    onConvert?: (note: { text: string }) => void;
    theme?: Record<string, unknown>;
    shapeClass?: string;
    files?: Record<string, unknown>[];
    focusNoteId?: string;
}

const mapStartMode = (m: NotepadModalProps['startMode']): 'list' | 'create' | 'voice' => {
    if (m === 'voice') return 'voice';
    if (m === 'add' || m === 'create') return 'create';
    return 'list';
};

function noteApptYmd(note: NotepadNote): string {
    const raw = note.apptDate ?? note.reminder_at ?? '';
    const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
}

export const NotepadModal = ({
    isOpen,
    onClose,
    startMode,
    notes,
    onSave,
    onDelete,
    onConvert,
    shapeClass,
    focusNoteId,
}: NotepadModalProps) => {
    const [mode, setMode] = useState<'list' | 'create' | 'voice'>(() => mapStartMode(startMode));
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [currentNote, setCurrentNote] = useState({
        title: '',
        body: '',
        apptDate: '',
        isPinned: false,
    });
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        setMode(mapStartMode(startMode));
    }, [startMode]);

    useEffect(() => {
        if (!isOpen || !focusNoteId) return;
        const t = window.setTimeout(() => {
            const el = document.querySelector(`[data-note-id="${CSS.escape(focusNoteId)}"]`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
        return () => window.clearTimeout(t);
    }, [isOpen, focusNoteId, notes]);

    const openCreate = () => {
        setEditingId(null);
        setCurrentNote({ title: '', body: '', apptDate: '', isPinned: false });
        setMode('create');
    };

    const openEdit = (note: NotepadNote) => {
        setEditingId(note.id);
        setCurrentNote({
            title: note.title || '',
            body: note.body || note.text || '',
            apptDate: noteApptYmd(note),
            isPinned: Boolean(note.isPinned),
        });
        setMode('create');
    };

    const handleSave = () => {
        if (!currentNote.body.trim()) return;
        const appt = currentNote.apptDate.trim();
        onSave({
            id: editingId ?? Date.now(),
            title: currentNote.title.trim() || 'ملاحظة جديدة',
            body: currentNote.body.trim(),
            date: new Date().toLocaleDateString('ar-EG'),
            apptDate: appt || undefined,
            reminder_at: appt || undefined,
            isPinned: currentNote.isPinned,
        });
        setCurrentNote({ title: '', body: '', apptDate: '', isPinned: false });
        setEditingId(null);
        setMode('list');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-2xl bg-[#1A1E2E] border border-white/10 ${shapeClass} overflow-hidden flex flex-col h-[70vh]`}
            >
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0B1021]">
                    <div className="flex items-center gap-3">
                        <FileText className="text-[#E6C673]" />
                        <h2 className="text-xl font-bold text-white">المفكرة القانونية</h2>
                    </div>
                    <button type="button" onClick={onClose}>
                        <X className="text-white/50 hover:text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {mode === 'list' ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <button
                                type="button"
                                onClick={openCreate}
                                className="w-full py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/50 hover:bg-white/5 flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus size={18} /> إضافة ملاحظة جديدة
                            </button>

                            {notes.length === 0 && (
                                <div className="text-center py-10 text-white/30">لا توجد ملاحظات محفوظة</div>
                            )}

                            {notes.map((note) => {
                                const appt = noteApptYmd(note);
                                return (
                                    <button
                                        type="button"
                                        key={note.id}
                                        data-note-id={String(note.id)}
                                        onClick={() => openEdit(note)}
                                        className={`w-full text-right bg-white/5 p-4 rounded-xl border transition-all group relative ${
                                            focusNoteId && String(note.id) === focusNoteId
                                                ? 'border-[#E6C673]/60 ring-1 ring-[#E6C673]/30'
                                                : 'border-white/5 hover:border-[#E6C673]/30'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <h3 className="font-bold text-white">{note.title || 'ملاحظة'}</h3>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-[10px] text-white/40">{note.date}</span>
                                                {appt ? (
                                                    <span className="text-[10px] text-[#E6C673] flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {appt}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                        <p className="text-white/70 text-sm line-clamp-3 leading-relaxed">
                                            {note.body || note.text}
                                        </p>

                                        <div
                                            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 flex gap-2 items-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {(() => {
                                                const pin = buildNoteWorkspacePin(note);
                                                return pin ? (
                                                    <WorkspacePinButton item={pin} className="!w-7 !h-7" size={14} />
                                                ) : null;
                                            })()}
                                            <button
                                                type="button"
                                                onClick={() => onDelete(note.id)}
                                                className="p-1.5 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const text = note.body || note.text || '';
                                                    onConvert?.({ text });
                                                }}
                                                className="p-1.5 rounded-full bg-[#E6C673]/20 text-[#E6C673] hover:bg-[#E6C673] hover:text-black"
                                                title="تحويل لقضية"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('list');
                                        setEditingId(null);
                                    }}
                                    className="text-white/50 hover:text-white"
                                >
                                    <ArrowRight />
                                </button>
                                <span className="text-white/50">
                                    {editingId ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
                                </span>
                            </div>

                            <input
                                type="text"
                                placeholder="عنوان الملاحظة..."
                                value={currentNote.title}
                                onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                                className="bg-transparent border-b border-white/10 text-xl font-bold text-white p-2 outline-none focus:border-[#E6C673]"
                            />

                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-white/50 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-[#E6C673]" />
                                    موعد / تذكير في التقويم (اختياري)
                                </span>
                                <input
                                    type="date"
                                    value={currentNote.apptDate}
                                    onChange={(e) =>
                                        setCurrentNote({ ...currentNote, apptDate: e.target.value })
                                    }
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E6C673]/50"
                                />
                            </label>

                            <textarea
                                placeholder="اكتب تفاصيل الملاحظة هنا..."
                                value={currentNote.body}
                                onChange={(e) => setCurrentNote({ ...currentNote, body: e.target.value })}
                                className="flex-1 min-h-[120px] bg-white/5 rounded-xl p-4 text-white resize-none outline-none focus:ring-1 focus:ring-[#E6C673]/50"
                            />

                            <label className="flex items-center gap-2 text-sm text-white/70">
                                <input
                                    type="checkbox"
                                    checked={currentNote.isPinned}
                                    onChange={(e) =>
                                        setCurrentNote({ ...currentNote, isPinned: e.target.checked })
                                    }
                                    className="rounded border-white/20"
                                />
                                تثبيت الملاحظة
                            </label>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRecording(!isRecording)}
                                    className={`p-3 rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white/50 hover:text-white'}`}
                                >
                                    {isRecording ? <StopCircle /> : <Mic />}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-[#E6C673] text-[#0B1021] font-bold rounded-xl hover:bg-[#D4B360] flex items-center gap-2"
                                >
                                    <Save size={18} /> حفظ
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
