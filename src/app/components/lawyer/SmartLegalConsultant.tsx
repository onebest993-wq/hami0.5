import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Wand2, Copy, FileText, Save, CheckCircle2, Sparkles, BrainCircuit, X } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import FileSaver from 'file-saver';
import { LegalAI } from './LegalAI_Coordinator';

interface FileItem {
    id: string;
    caseNo?: string;
    court?: string;
    parties?: Array<{ name: string }>;
}

interface SmartLegalConsultantProps {
    onClose: () => void;
    files?: FileItem[];
    onSaveToCase: (caseId: string, result: string) => void;
}

export const SmartLegalConsultant = ({ onClose, files, onSaveToCase }: SmartLegalConsultantProps) => {
    const [step, setStep] = useState<'input' | 'loading' | 'result'>('input');
    const [query, setQuery] = useState('');
    const [result, setResult] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    const handleDraft = async () => {
        if (!query.trim()) return SmartToast.error('يرجى كتابة تفاصيل العريضة أولاً');

        setStep('loading');
        try {
            const response = await LegalAI.analyzeCaseDescription(query);

            let draft = '';
            if (response.draftTemplate && typeof response.draftTemplate === 'function') {
                draft = response.draftTemplate({ body: query, ...response });
            } else if (response.text) {
                draft = response.text;
            } else {
                draft = `السيد قاضي محكمة الأحوال الشخصية المحترم\n\nالموضوع: عريضة دعوى\n\nتحية طيبة...\n\nموكلنا المدعي: [الاسم]\nالمدعى عليه: [الاسم]\n\nجهة الدعوى:\n${query}\n\nوبناءً على ما تقدم نطلب من عدالتكم دعوة المدعى عليه للمرافعة والحكم عليه وفق القانون.\n\nالأسباب الثبوتية:\n1. سائر البينات القانونية.\n2. [أضف أدلة أخرى]\n\nو. المدعي\nوكيله المحامي`;
            }

            setResult(draft);
            setStep('result');
        } catch {
            SmartToast.error('حدث خطأ أثناء الاتصال بالمستشار الذكي');
            setStep('input');
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(result);
            SmartToast.success('تم نسخ النص للحافظة');
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = result;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                SmartToast.success('تم نسخ النص للحافظة');
            } catch {
                SmartToast.error('فشل النسخ التلقائي');
            }
            document.body.removeChild(textArea);
        }
    };

    const handlePDF = () => {
        SmartToast.info('خدمة PDF غير متوفرة حالياً، يرجى استخدام النسخ أو Word');
    };

    const handleWord = () => {
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
        FileSaver.saveAs(blob, 'legal-petition.doc');
        SmartToast.success('تم تصدير ملف (نصي)');
    };

    const handleSaveSelection = (caseId: string) => {
        onSaveToCase(caseId, result);
        setShowSaveDialog(false);
        SmartToast.success('تم حفظ العريضة في إضبارة الدعوى بنجاح!');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#151822] flex flex-col font-sans" dir="rtl">

            <div className="h-16 flex items-center justify-between px-4 bg-transparent border-b border-white/5 relative z-10">
                <div className="flex-1 flex justify-start">
                    <button type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <ArrowRight className="text-white/70" size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-white">المستشار الذكي</h1>
                </div>

                <div className="flex-1 flex justify-end">
                    {step === 'result' && (
                        <button type="button" onClick={() => setStep('input')} className="text-sm text-[#E6C673] hover:underline">
                            جديد
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto relative w-full">

                {step === 'input' && (
                    <div className="p-6 max-w-2xl mx-auto flex flex-col h-full justify-center items-center">

                        <div className="mb-8 text-center">
                            <div className="w-16 h-16 bg-[#E6C673]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#E6C673]/20 shadow-[0_0_30px_rgba(230,198,115,0.1)]">
                                <BrainCircuit size={32} className="text-[#E6C673]" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">كيف يمكنني مساعدتك؟</h2>
                            <p className="text-white/40 text-sm leading-relaxed max-w-md mx-auto">
                                اكتب وقائع الدعوى وسأقوم بصياغة العريضة القانونية وتحديد المواد الحاكمة.
                            </p>
                        </div>

                        <div className="w-full bg-[#1A1E2E] border border-white/10 rounded-2xl p-1 shadow-lg focus-within:border-[#E6C673]/40 transition-colors">
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="اكتب تفاصيل الدعوى هنا..."
                                className="w-full bg-transparent text-white text-base placeholder-white/20 outline-none resize-none p-4 min-h-[180px] leading-relaxed text-right"
                                dir="rtl"
                            />
                        </div>

                        <div className="w-full mt-8">
                            <button type="button"
                                onClick={handleDraft}
                                className="w-full h-14 bg-[#E6C673] rounded-2xl shadow-[0_5px_15px_rgba(230,198,115,0.2)] flex items-center justify-center gap-3 hover:bg-[#d4b560] active:scale-[0.98] transition-all"
                            >
                                <Wand2 className="text-black" size={20} />
                                <span className="text-black font-bold text-lg">صياغة العريضة بالذكاء الاصطناعي</span>
                            </button>
                        </div>
                    </div>
                )}

                {step === 'loading' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#151822] z-20">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 rounded-full border-4 border-[#E6C673]/10 border-t-[#E6C673] animate-spin" />
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#E6C673]" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">جاري التحليل القانوني...</h3>
                        <p className="text-white/40 text-sm">مراجعة النصوص القانونية والسوابق</p>
                    </div>
                )}

                {step === 'result' && (
                    <div className="p-6 max-w-4xl mx-auto pb-32">
                        <div className="bg-[#1A1E2E] border border-white/10 p-8 rounded-2xl shadow-2xl min-h-[60vh] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E6C673]/5 blur-[60px] rounded-full pointer-events-none" />

                            <div className="relative z-10 font-serif text-lg leading-[2] text-white/90 whitespace-pre-wrap text-right" dir="rtl">
                                {result}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {step === 'result' && (
                <div className="h-24 bg-[#151822]/90 backdrop-blur-lg border-t border-white/5 px-6 flex items-center justify-between shrink-0 absolute bottom-0 left-0 right-0 z-30">
                    <div className="flex gap-4">
                        <button type="button" onClick={handleCopy} className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-colors group">
                            <div className="p-2 rounded-lg group-hover:bg-white/5">
                                <Copy size={18} />
                            </div>
                            <span className="text-[10px]">نسخ</span>
                        </button>
                        <button type="button" onClick={handleWord} className="flex flex-col items-center gap-1 text-white/40 hover:text-blue-400 transition-colors group">
                            <div className="p-2 rounded-lg group-hover:bg-blue-400/10">
                                <FileText size={18} />
                            </div>
                            <span className="text-[10px]">Word</span>
                        </button>
                    </div>

                    <button type="button"
                        onClick={() => setShowSaveDialog(true)}
                        className="px-6 py-3 bg-[#E6C673] hover:bg-[#d4b560] text-black rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <Save size={18} />
                        <span>حفظ في الإضبارة</span>
                    </button>
                </div>
            )}

            <AnimatePresence>
                {showSaveDialog && (
                    <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                        >
                            <div className="p-5 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">حفظ في المخزن الذكي</h3>
                                <button type="button" onClick={() => setShowSaveDialog(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-5">
                                <p className="text-white/60 text-sm mb-4">اختر الدعوى المراد حفظ العريضة فيها:</p>
                                <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pl-2">
                                    {files && files.length > 0 ? (
                                        files.map((file: FileItem) => (
                                            <button type="button"
                                                key={file.id}
                                                onClick={() => handleSaveSelection(file.id)}
                                                className="w-full p-3 bg-white/5 hover:bg-[#E6C673]/10 border border-white/5 hover:border-[#E6C673]/30 rounded-xl flex items-center justify-between transition-all group text-right"
                                            >
                                                <div className="flex flex-col items-start gap-0.5">
                                                    <span className="font-bold text-white text-sm group-hover:text-[#E6C673]">{file.caseNo || 'بدون رقم'}</span>
                                                    <span className="text-[11px] text-white/40">{file.parties?.[0]?.name} - {file.court}</span>
                                                </div>
                                                <CheckCircle2 className="text-white/10 group-hover:text-[#E6C673]" size={18} />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                                            لا توجد دعوى متاحة
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
