import React from 'react';
import { motion } from 'motion/react';
import { X, FileText, BotMessageSquare, Sparkles, Cpu } from '@/app/components/ui/lucideIcons';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { formatFileSize } from '@/app/components/lawyer/hooks/useSmartVault';

interface AISummarySheetProps {
    doc: SmartVaultDoc;
    onClose: () => void;
}

export const AISummarySheet: React.FC<AISummarySheetProps> = ({ doc, onClose }) => (
    <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed top-0 left-0 w-full h-full z-[99999] flex justify-end bg-black/40"
        onClick={onClose}
    >
        <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-lg">الملخص الذكي</h3>
                <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/5"><X size={18} className="text-white/60" /></button>
            </div>
            <div className="flex items-center gap-3 mb-6 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <FileText size={18} className="text-amber-400" />
                </div>
                <div>
                    <h4 className="text-white font-semibold text-sm">{doc.title}</h4>
                    <p className="text-white/40 text-[10px]">{formatFileSize(doc.fileSize || 0)}</p>
                </div>
            </div>
            {doc.aiSummary ? (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Cpu size={14} className="text-purple-400" />
                        <span className="text-purple-400 text-xs font-medium">تحليل الذكاء الاصطناعي</span>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{doc.aiSummary}</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 py-12">
                    <BotMessageSquare size={40} className="text-amber-400/40" />
                    <p className="text-white/40 text-sm">لم يتم إنشاء ملخص ذكي لهذا الملف بعد</p>
                    <button type="button" className="mt-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-bold flex items-center gap-1.5">
                        <Sparkles size={12} />
                        إنشاء ملخص ذكي
                    </button>
                </div>
            )}
        </div>
    </motion.div>
);
