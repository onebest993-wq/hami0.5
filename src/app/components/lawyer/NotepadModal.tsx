import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Save, FileText, ArrowRight, Pin, Mic, Trash2 } from 'lucide-react';
import { isVoiceNote } from '@/app/components/lawyer/dashboard/notepadNoteUtils';
import { VoiceNoteAudio } from '@/app/components/lawyer/dashboard/VoiceNoteAudio';

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
    type?: string;
    transcript?: string;
};

type NotepadSaveNote = {
    id: string | number;
    title: string;
    body: string;
    date: string;
    apptDate?: string;
    reminder_at?: string;
    isPinned: boolean;
    type?: string;
};

interface NotepadModalProps {
    isOpen: boolean;
    onClose: () => void;
    startMode: 'list' | 'create';
    notes: NotepadNote[];
    onSave: (note: NotepadSaveNote) => void;
    onDelete: (id: string | number) => void;
    onConvert?: (note: { text: string }) => void;
    shapeClass?: string;
    focusNoteId?: string;
}

const PEARL_SHELL =
    'relative overflow-hidden flex flex-col h-[70vh] rounded-[22px] border border-[#E6C673]/18 ' +
    'bg-[#0a0a0c]/88 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)]';

const PEARL_HEADER =
    'relative px-5 py-4 flex justify-between items-center border-b border-white/[0.08] ' +
    'bg-gradient-to-l from-white/[0.07] via-white/[0.03] to-transparent';

const PEARL_INPUT =
    'w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white ' +
    'placeholder:text-white/35 outline-none transition-all ' +
    'focus:border-[#E6C673]/40 focus:bg-white/[0.09] focus:ring-1 focus:ring-[#E6C673]/15';

const PEARL_BTN_GOLD =
    'px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ' +
    'bg-[#E6C673]/18 border border-[#E6C673]/35 text-[#E6C673] hover:bg-[#E6C673]/26';

const PEARL_CARD =
    'w-full text-right rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md ' +
    'p-4 transition-all hover:border-[#E6C673]/25 hover:bg-white/[0.07]';

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
    const [mode, setMode] = useState<'list' | 'create'>(() =>
        startMode === 'create' ? 'create' : 'list',
    );
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editingIsVoice, setEditingIsVoice] = useState(false);
    const [currentNote, setCurrentNote] = useState({
        title: '',
        body: '',
        isPinned: false,
    });

    useEffect(() => {
        setMode(startMode === 'create' ? 'create' : 'list');
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
        setEditingIsVoice(false);
        setCurrentNote({ title: '', body: '', isPinned: false });
        setMode('create');
    };

    const openEdit = (note: NotepadNote) => {
        const body = note.body || note.text || '';
        setEditingId(note.id);
        setEditingIsVoice(isVoiceNote(note));
        setCurrentNote({
            title: note.title || '',
            body,
            isPinned: Boolean(note.isPinned),
        });
        setMode('create');
    };

    const handleSave = () => {
        if (editingIsVoice) {
            if (!currentNote.body.trim()) return;
        } else if (!currentNote.body.trim()) {
            return;
        }
        onSave({
            id: editingId ?? Date.now(),
            title: currentNote.title.trim() || (editingIsVoice ? 'تسجيل صوتي' : 'ملاحظة جديدة'),
            body: currentNote.body.trim(),
            date: new Date().toLocaleDateString('ar-EG'),
            isPinned: currentNote.isPinned,
            ...(editingIsVoice ? { type: 'voice' } : {}),
        });
        setCurrentNote({ title: '', body: '', isPinned: false });
        setEditingId(null);
        setEditingIsVoice(false);
        setMode('list');
    };

    const handleDelete = () => {
        if (editingId == null) return;
        onDelete(editingId);
        setCurrentNote({ title: '', body: '', isPinned: false });
        setEditingId(null);
        setEditingIsVoice(false);
        setMode('list');
    };

    if (!isOpen) return null;

    const shellClass = shapeClass ? `${PEARL_SHELL} ${shapeClass}` : PEARL_SHELL;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#050508]/75 backdrop-blur-md"
            dir="rtl"
        >
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]"
                aria-hidden
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                className={`w-full max-w-2xl ${shellClass}`}
            >
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.08] to-transparent"
                    aria-hidden
                />

                <div className={PEARL_HEADER}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-[#E6C673]/20 flex items-center justify-center">
                            <FileText className="text-[#E6C673]" size={18} />
                        </div>
                        <h2 className="text-lg font-bold text-white/95">المفكرة القانونية</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] text-white/50 hover:text-white hover:border-[#E6C673]/30 transition-colors flex items-center justify-center"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col relative z-[1]">
                    {mode === 'list' ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <button
                                type="button"
                                onClick={openCreate}
                                className="w-full py-3 rounded-xl border border-dashed border-[#E6C673]/25 text-white/45 hover:text-[#E6C673] hover:border-[#E6C673]/45 hover:bg-white/[0.04] flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus size={18} /> إضافة ملاحظة جديدة
                            </button>

                            {notes.length === 0 && (
                                <div className="text-center py-10 text-white/30 text-sm">لا توجد ملاحظات محفوظة</div>
                            )}

                            {notes.map((note) => {
                                const voice = isVoiceNote(note);
                                const previewBody = note.body || note.text || '';
                                return (
                                <button
                                    type="button"
                                    key={note.id}
                                    data-note-id={String(note.id)}
                                    onClick={() => openEdit(note)}
                                    className={`${PEARL_CARD} group relative ${
                                        focusNoteId && String(note.id) === focusNoteId
                                            ? 'border-[#E6C673]/45 ring-1 ring-[#E6C673]/20'
                                            : ''
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {voice ? (
                                                <Mic size={12} className="text-[#E6C673] shrink-0" aria-hidden />
                                            ) : note.isPinned ? (
                                                <Pin size={12} className="text-[#E6C673] shrink-0" />
                                            ) : null}
                                            <h3 className="font-bold text-white/90 truncate">{note.title || 'ملاحظة'}</h3>
                                        </div>
                                        <span className="text-[10px] text-white/35 shrink-0">{note.date}</span>
                                    </div>
                                    {voice ? (
                                        <div
                                            className="mt-1 space-y-2"
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        >
                                            {note.transcript ? (
                                                <p className="text-white/55 text-xs line-clamp-2">{note.transcript}</p>
                                            ) : null}
                                            <VoiceNoteAudio body={previewBody} />
                                        </div>
                                    ) : (
                                        <p className="text-white/60 text-sm line-clamp-3 leading-relaxed">
                                            {previewBody}
                                        </p>
                                    )}
                                </button>
                            );})}
                        </div>
                    ) : (
                        <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('list');
                                    setEditingId(null);
                                }}
                                className="inline-flex items-center gap-2 text-white/45 hover:text-white/80 text-sm transition-colors w-fit"
                            >
                                <ArrowRight size={16} />
                                {editingId ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
                            </button>

                            <input
                                type="text"
                                placeholder="عنوان الملاحظة..."
                                value={currentNote.title}
                                onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                                className={`${PEARL_INPUT} text-lg font-bold`}
                            />

                            {!editingIsVoice ? (
                                <textarea
                                    placeholder="اكتب تفاصيل الملاحظة هنا..."
                                    value={currentNote.body}
                                    onChange={(e) => setCurrentNote({ ...currentNote, body: e.target.value })}
                                    className={`${PEARL_INPUT} flex-1 min-h-[160px] resize-none leading-relaxed`}
                                />
                            ) : (
                                <div className={`${PEARL_INPUT} p-4 space-y-2 flex-1`}>
                                    <p className="text-xs text-white/45">تسجيل صوتي — يمكنك تغيير العنوان أو التثبيت</p>
                                    <VoiceNoteAudio body={currentNote.body} preload="metadata" className="w-full" />
                                </div>
                            )}

                            <button
                                type="button"
                                role="switch"
                                aria-checked={currentNote.isPinned}
                                onClick={() =>
                                    setCurrentNote({ ...currentNote, isPinned: !currentNote.isPinned })
                                }
                                className={`flex items-center justify-between gap-3 w-full rounded-xl px-4 py-3 border transition-all ${
                                    currentNote.isPinned
                                        ? 'bg-[#E6C673]/10 border-[#E6C673]/35 shadow-[0_0_20px_rgba(230,198,115,0.08)]'
                                        : 'bg-white/[0.04] border-white/[0.10] hover:border-white/[0.16]'
                                }`}
                            >
                                <span className="flex items-center gap-2 text-sm font-medium text-white/80">
                                    <Pin
                                        size={15}
                                        className={currentNote.isPinned ? 'text-[#E6C673]' : 'text-white/35'}
                                    />
                                    تثبيت الملاحظة
                                </span>
                                <span
                                    className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
                                        currentNote.isPinned ? 'bg-[#E6C673]/70' : 'bg-white/15'
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
                                            currentNote.isPinned ? 'right-0.5' : 'left-0.5'
                                        }`}
                                    />
                                </span>
                            </button>

                            <div className="flex justify-between pt-1 gap-2">
                                {editingId != null ? (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 text-red-300/90 border border-red-400/25 bg-red-500/10 hover:bg-red-500/15 transition-all"
                                    >
                                        <Trash2 size={16} /> حذف
                                    </button>
                                ) : (
                                    <span />
                                )}
                                <button type="button" onClick={handleSave} className={PEARL_BTN_GOLD}>
                                    <Save size={17} /> حفظ
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
