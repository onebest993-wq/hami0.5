import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, Mic, Plus, Save, Book, ChevronDown, Eraser, Edit3 } from 'lucide-react';
import { notesVault, Note } from '@/app/data/NotesVault';

export const NotebookModal = ({ onClose }: { onClose: () => void }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [search, setSearch] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [editText, setEditText] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setNotes(notesVault.getNotes());
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const filteredNotes = notes.filter(n => String(n.content || '').toLowerCase().includes(search.toLowerCase()));

    const handleDelete = (id: string) => {
        notesVault.deleteNote(id);
        setNotes(notesVault.getNotes());
    };

    const handleSaveNewNote = () => {
        if (!newNoteText.trim()) return;
        notesVault.addNote(newNoteText, 'text');
        setNotes(notesVault.getNotes());
        setNewNoteText('');
        setIsCreating(false);
    };

    const handleStartEdit = (note: Note) => {
        setEditingNote(note);
        setEditText(note.content);
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (!editingNote || !editText.trim()) return;
        notesVault.updateNote(editingNote.id, { content: editText });
        setNotes(notesVault.getNotes());
        setIsEditing(false);
        setEditingNote(null);
        setEditText('');
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingNote(null);
        setEditText('');
    };

    if (!mounted) return null;

    const renderEditor = (title: string, value: string, onChange: (v: string) => void, onSave: () => void, onCancel: () => void) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col h-full"
        >
            <div className="pb-4 mb-2 border-b border-white/5 flex items-center justify-between px-6 pt-4">
                <h3 className="text-sm font-bold text-white/70">{title}</h3>
                <button type="button" onClick={onCancel} className="text-white/50 hover:text-white text-xs">إلغاء</button>
            </div>
            <div className="px-6 flex-1 flex flex-col pb-6">
                <textarea
                    className="flex-1 bg-white/5 rounded-xl p-4 text-white text-base resize-none outline-none placeholder-white/20 leading-relaxed border border-white/5 focus:border-[#E6C673]/50 transition-colors"
                    placeholder="اكتب ملاحظاتك القانونية هنا..."
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoFocus
                />
                <div className="pt-4 flex justify-end">
                    <button type="button"
                        onClick={onSave}
                        className="bg-[#E6C673] hover:bg-[#D4B360] text-black font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all w-full justify-center sm:w-auto"
                    >
                        <Save size={18} />
                        حفظ
                    </button>
                </div>
            </div>
        </motion.div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center pointer-events-auto">
            <AnimatePresence>
                <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                />

                <motion.div
                    key="sheet"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="bg-[#1A1E2E] w-full max-w-3xl h-[80vh] sm:h-[85vh] rounded-t-3xl border-t border-[#E6C673]/20 shadow-2xl flex flex-col pointer-events-auto overflow-hidden relative z-10"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#131620]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#E6C673]/10 rounded-lg text-[#E6C673]">
                                <Book size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">المفكرة القانونية</h3>
                                <p className="text-white/40 text-[10px]">مساحة التدوين السريع</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setIsCreating(true)} className="w-8 h-8 rounded-full bg-[#E6C673] flex items-center justify-center text-black hover:scale-110 transition-transform">
                                <Plus size={18} />
                            </button>
                            <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
                                <ChevronDown size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col h-full relative overflow-hidden">
                        {isCreating ? (
                            renderEditor('إضافة ملاحظة جديدة', newNoteText, setNewNoteText, handleSaveNewNote, () => { setIsCreating(false); setNewNoteText(''); })
                        ) : isEditing ? (
                            renderEditor('تعديل الملاحظة', editText, setEditText, handleSaveEdit, handleCancelEdit)
                        ) : (
                            <div className="flex flex-col h-full pb-20">
                                {/* Search */}
                                <div className="px-6 pt-4 mb-4">
                                    <div className="relative">
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="بحث في الملاحظات..."
                                            className="w-full bg-[#131620] border border-white/10 rounded-xl pr-12 pl-4 py-3 text-white focus:border-[#E6C673] outline-none placeholder:text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Notes List */}
                                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
                                    {filteredNotes.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-3">
                                            {filteredNotes.map(note => (
                                                <motion.div
                                                    key={note.id}
                                                    layout
                                                    onClick={() => handleStartEdit(note)}
                                                    className="bg-[#131620] p-4 rounded-xl border border-white/5 hover:border-[#E6C673]/30 transition-colors group relative flex flex-col gap-2 min-h-[100px] cursor-pointer"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-full shrink-0 ${note.type === 'voice' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                            {note.type === 'voice' ? <Mic size={18} /> : <FileText size={18} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap break-words line-clamp-3">{note.content}</p>
                                                            <span className="text-[10px] text-white/30 mt-2 block font-mono">
                                                                {new Date(note.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleStartEdit(note); }}
                                                            className="p-2 text-white/40 hover:text-[#E6C673] hover:bg-white/5 rounded-lg transition-all"
                                                            title="تعديل الملاحظة"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                                            className="p-2 text-white/40 hover:text-red-500 hover:bg-white/5 rounded-lg transition-all"
                                                            title="مسح الملاحظة"
                                                        >
                                                            <Eraser size={16} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-white/20 pb-20">
                                            <FileText size={48} className="mb-4 opacity-30" />
                                            <p className="text-sm">لا توجد ملاحظات</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>,
        document.body
    );
};
