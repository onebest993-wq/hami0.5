import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Save, FileText, Mic, StopCircle, ArrowRight } from '@/app/components/ui/lucideIcons';

type NotepadNote = {
    id: string | number;
    title?: string;
    body?: string;
    text?: string;
    date?: string;
    createdAt?: string;
    isPinned?: boolean;
};

type NotepadSaveNote = {
    id: string | number;
    title: string;
    body: string;
    date: string;
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
}

const mapStartMode = (m: NotepadModalProps['startMode']): 'list' | 'create' | 'voice' => {
    if (m === 'voice') return 'voice';
    if (m === 'add' || m === 'create') return 'create';
    return 'list';
};

export const NotepadModal = ({ isOpen, onClose, startMode, notes, onSave, onDelete, onConvert, theme, shapeClass }: NotepadModalProps) => {
    const [mode, setMode] = useState<'list' | 'create' | 'voice'>(() => mapStartMode(startMode));
    const [currentNote, setCurrentNote] = useState({ title: '', body: '', isPinned: false });
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        setMode(mapStartMode(startMode));
    }, [startMode]);

    const handleSave = () => {
        if (!currentNote.body) return;
        onSave({ 
            id: Date.now(), 
            title: currentNote.title || 'ملاحظة جديدة', 
            body: currentNote.body, 
            date: new Date().toLocaleDateString('ar-EG'),
            isPinned: currentNote.isPinned
        });
        setCurrentNote({ title: '', body: '', isPinned: false });
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
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0B1021]">
                    <div className="flex items-center gap-3">
                        <FileText className="text-[#E6C673]" />
                        <h2 className="text-xl font-bold text-white">المفكرة القانونية</h2>
                    </div>
                    <button type="button" onClick={onClose}><X className="text-white/50 hover:text-white" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {mode === 'list' ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <button type="button" 
                                onClick={() => setMode('create')}
                                className="w-full py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/50 hover:bg-white/5 flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus size={18} /> إضافة ملاحظة جديدة
                            </button>
                            
                            {notes.length === 0 && (
                                <div className="text-center py-10 text-white/30">لا توجد ملاحظات محفوظة</div>
                            )}

                            {notes.map((note) => (
                                <div key={note.id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-[#E6C673]/30 transition-all group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-white">{note.title || 'ملاحظة'}</h3>
                                        <span className="text-[10px] text-white/40">{note.date}</span>
                                    </div>
                                    <p className="text-white/70 text-sm line-clamp-3 leading-relaxed">{note.body}</p>
                                    
                                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 flex gap-2">
                                        <button type="button" onClick={() => onDelete(note.id)} className="p-1.5 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white">
                                            <Trash2 size={14} />
                                        </button>
                                        <button type="button"
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
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 p-6 flex flex-col gap-4">
                            <div className="flex items-center gap-2 mb-2">
                                <button type="button" onClick={() => setMode('list')} className="text-white/50 hover:text-white"><ArrowRight /></button>
                                <span className="text-white/50">رجوع للقائمة</span>
                            </div>
                            
                            <input 
                                type="text" 
                                placeholder="عنوان الملاحظة..." 
                                value={currentNote.title}
                                onChange={e => setCurrentNote({...currentNote, title: e.target.value})}
                                className="bg-transparent border-b border-white/10 text-xl font-bold text-white p-2 outline-none focus:border-[#E6C673]"
                            />
                            
                            <textarea 
                                placeholder="اكتب تفاصيل الملاحظة هنا..." 
                                value={currentNote.body}
                                onChange={e => setCurrentNote({...currentNote, body: e.target.value})}
                                className="flex-1 bg-white/5 rounded-xl p-4 text-white resize-none outline-none focus:ring-1 focus:ring-[#E6C673]/50"
                            />

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" 
                                    onClick={() => setIsRecording(!isRecording)}
                                    className={`p-3 rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white/50 hover:text-white'}`}
                                >
                                    {isRecording ? <StopCircle /> : <Mic />}
                                </button>
                                <button type="button" 
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
