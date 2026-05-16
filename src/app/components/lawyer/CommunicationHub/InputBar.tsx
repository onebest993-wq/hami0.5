import React from 'react';
import { Send, FileText, Mic, Camera, Zap } from 'lucide-react';
import type { InputBarProps } from './types';

export const InputBar = ({ input, setInput, isLoading, onSend, onFileSelect, onFileClick, fileInputRef }: InputBarProps) => (
    <div className="p-4 bg-[#111827] border-t border-white/5 relative z-20">
        <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={onFileSelect}
            accept="image/*,application/pdf"
        />

        <div className="relative flex items-end gap-1 bg-black/40 p-2 rounded-2xl border border-white/10 focus-within:border-[#E6C673] transition-colors">
            <div className="flex gap-1">
                <button type="button"
                    onClick={onFileClick}
                    disabled={isLoading}
                    className="p-3 text-white/40 hover:text-[#E6C673] hover:bg-white/5 rounded-xl transition-all disabled:opacity-50"
                    title="إرفاق ملف (PDF/صور)"
                >
                    <FileText size={20} />
                </button>
                <button type="button"
                    disabled={isLoading}
                    className="p-3 text-white/40 hover:text-[#E6C673] hover:bg-white/5 rounded-xl transition-all disabled:opacity-50"
                    title="تسجيل صوتي"
                >
                    <Mic size={20} />
                </button>
                <button type="button"
                    disabled={isLoading}
                    className="p-3 text-white/40 hover:text-[#E6C673] hover:bg-white/5 rounded-xl transition-all disabled:opacity-50"
                    title="مسح ضوئي"
                >
                    <Camera size={20} />
                </button>
            </div>

            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                placeholder="تحدث مع النواة القانونية (نص، صوت، أو صورة)..."
                className="flex-1 bg-transparent max-h-32 min-h-[50px] py-3 px-2 text-white text-sm outline-none resize-none"
            />
            <button type="button"
                onClick={onSend}
                disabled={isLoading || !input.trim()}
                className={`p-3 rounded-xl transition-all ${
                    input.trim() ? 'bg-[#E6C673] text-[#0B1021] hover:scale-105' : 'bg-white/5 text-white/20'
                }`}
            >
                {isLoading ? <Zap size={20} className="animate-pulse" /> : <Send size={20} />}
            </button>
        </div>
        <div className="text-center mt-2">
            <p className="text-[9px] text-white/20">
                ملاحظة: مخرجات حامي أداة مساعدة. راجع دائمًا النصوص القانونية الرسمية قبل الإجراء.
            </p>
        </div>
    </div>
);
