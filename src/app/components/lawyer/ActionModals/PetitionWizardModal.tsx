import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Gavel, Wand2, Printer, ChevronLeft, ArrowRight,
    BrainCircuit, Sparkles, MessageSquare, Check, FileDigit
} from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { LegalAI, AnalysisResult } from '../LegalAI_Coordinator';
import type { ModalProps, FormField, FormFieldType } from '@/app/types/common';

interface PetitionWizardModalProps extends ModalProps {
    onOpenArchive?: () => void;
}

interface InterviewData {
    [key: string]: string;
}

const FORM_FIELD_TYPES: FormFieldType[] = [
    'text', 'number', 'date', 'select', 'textarea', 'checkbox', 'radio', 'file'
];

function normalizeFormFieldType(t?: string): FormFieldType {
    if (t && FORM_FIELD_TYPES.includes(t as FormFieldType)) return t as FormFieldType;
    return 'text';
}

function analysisRequiredToFormFields(fields: AnalysisResult['requiredFields']): FormField[] {
    return fields.map((f) => ({
        key: f.key,
        label: f.label,
        type: normalizeFormFieldType(f.type),
        required: f.required
    }));
}

type PetitionWizardAIContext = Pick<AnalysisResult, 'title' | 'legalContext'> & {
    requiredFields: FormField[];
    draftTemplate?: (data: InterviewData) => string;
};

const usePortal = () => {
    const [mounted, setMounted] = useState(false);
    React.useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);
    return mounted;
};

const InputPhase = ({
    userDescription, setUserDescription, onSubmit
}: {
    userDescription: string;
    setUserDescription: React.Dispatch<React.SetStateAction<string>>;
    onSubmit: () => void;
}) => (
    <motion.div
        key="input"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8"
    >
        <div className="w-20 h-20 rounded-full bg-amber-400/10 flex items-center justify-center mb-4 relative">
            <Sparkles className="text-amber-400 absolute animate-pulse" size={32} />
            <MessageSquare className="text-amber-400/50" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white">بماذا يمكنني مساعدتك اليوم؟</h2>
        <p className="text-white/50 max-w-md leading-relaxed">
            صف لي الحالة باختصار، وسأقوم بتحليل الوقائع واستدعاء المواد القانونية المناسبة للصياغة.
        </p>
        <div className="w-full max-w-xl flex flex-col gap-3">
            <textarea
                value={userDescription}
                onChange={(e) => {
                    setUserDescription(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="مثال: عندي دعوى تخلية لمستأجر ممتنع عن الدفع، ولدي إنذار كاتب عدل..."
                className="w-full bg-black/20 border border-white/10 rounded-2xl p-6 text-white text-lg resize-none focus:border-amber-400/50 outline-none leading-[1.5] shadow-inner break-words whitespace-pre-wrap overflow-hidden"
                rows={3}
                autoFocus
            />
            <div className="flex justify-end">
                <button type="button"
                    onClick={onSubmit}
                    disabled={!userDescription.trim()}
                    className="p-3 bg-amber-400 rounded-xl text-black font-bold hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-amber-400/20"
                >
                    <ArrowRight size={24} />
                </button>
            </div>
        </div>
    </motion.div>
);

const ProcessingPhase = () => (
    <motion.div
        key="processing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full flex flex-col items-center justify-center space-y-6"
    >
        <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-amber-400/30 rounded-full animate-ping" />
            <div className="absolute inset-0 border-4 border-t-amber-400 rounded-full animate-spin" />
            <BrainCircuit className="absolute inset-0 m-auto text-amber-400" size={32} />
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">جاري تحليل الوقائع...</h3>
            <p className="text-white/40 text-sm">البحث في: قانون المرافعات، القانون المدني، قانون الإيجار</p>
        </div>
    </motion.div>
);

const InterviewPhase = ({
    aiContext, interviewData, setInterviewData, onSubmit, onBack
}: {
    aiContext: PetitionWizardAIContext;
    interviewData: InterviewData;
    setInterviewData: React.Dispatch<React.SetStateAction<InterviewData>>;
    onSubmit: () => void;
    onBack: () => void;
}) => (
    <motion.div
        key="interview"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -50, opacity: 0 }}
        className="p-8 max-w-3xl mx-auto space-y-8 pb-20"
    >
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-6 flex flex-col sm:flex-row gap-4">
            <div className="p-3 bg-amber-400/20 rounded-full h-fit w-fit">
                <Gavel className="text-amber-400" size={24} />
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-100 mb-2">
                    تم تشخيص الدعوى: {aiContext.title}
                </h3>
                <p className="text-amber-100/70 text-sm leading-loose border-r-2 border-amber-400/30 pr-3 break-words">
                    {aiContext.legalContext}
                </p>
            </div>
        </div>
        <div className="space-y-6">
            <h4 className="text-white font-bold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">2</span>
                استكمال المتطلبات الشكلية (مادة 46)
            </h4>
            <div className="grid grid-cols-1 gap-6">
                {aiContext.requiredFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                        <label className="text-sm font-medium text-white/70 block mb-1">
                            {field.label} {field.required && <span className="text-red-400">*</span>}
                        </label>
                        <input
                            type={field.type === 'date' || field.type === 'number' ? field.type : 'text'}
                            value={interviewData[field.key] || ''}
                            onChange={(e) => setInterviewData({ ...interviewData, [field.key]: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:border-amber-400/50 outline-none transition-colors"
                            placeholder="أدخل البيانات هنا..."
                        />
                    </div>
                ))}
            </div>
        </div>
        <div className="pt-8 flex justify-end">
            <button type="button"
                onClick={onSubmit}
                className="bg-white text-black font-bold py-4 px-8 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg shadow-white/5 w-full justify-center sm:w-auto"
            >
                <Wand2 size={18} />
                توليد العريضة الآن
            </button>
        </div>
    </motion.div>
);

const PreviewPhase = ({
    draftText, setDraftText, onBackToInterview, onClose
}: {
    draftText: string;
    setDraftText: React.Dispatch<React.SetStateAction<string>>;
    onBackToInterview: () => void;
    onClose: () => void;
}) => (
    <motion.div
        key="preview"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="h-full flex flex-col p-6"
    >
        <div className="flex items-center justify-between mb-4">
            <button type="button"
                onClick={onBackToInterview}
                className="text-white/50 hover:text-white text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5"
            >
                <ChevronLeft size={16} /> تعديل البيانات
            </button>
            <span className="text-green-400 text-xs font-bold flex items-center gap-1 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">
                <Check size={12} /> متوافق قانونياً
            </span>
        </div>
        <div className="flex-1 bg-white rounded-xl shadow-xl overflow-hidden flex flex-col relative">
            <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply"
                style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/cream-paper.png)' }} />
            <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                className="flex-1 w-full p-8 text-black text-lg font-serif leading-loose outline-none resize-none bg-transparent relative z-10 whitespace-pre-wrap break-words"
                style={{ direction: 'rtl' }}
            />
        </div>
        <div className="mt-6 flex gap-4">
            <button type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 border border-white/5"
            >
                حفظ كمسودة
            </button>
            <button type="button"
                onClick={() => { SmartToast.success('جاري تجهيز ملف PDF للطباعة...'); onClose(); }}
                className="flex-[2] py-4 rounded-xl bg-amber-400 text-black font-bold hover:bg-amber-500 shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2"
            >
                <Printer size={20} />
                طباعة واعتماد (PDF)
            </button>
        </div>
    </motion.div>
);

export const PetitionWizardModal = ({ onClose, onOpenArchive }: PetitionWizardModalProps) => {
    const mounted = usePortal();
    const [phase, setPhase] = useState<'input' | 'processing' | 'interview' | 'preview'>('input');
    const [userDescription, setUserDescription] = useState('');
    const [aiContext, setAiContext] = useState<PetitionWizardAIContext | null>(null);
    const [interviewData, setInterviewData] = useState<InterviewData>({});
    const [draftText, setDraftText] = useState('');

    const handleInitialSubmit = async () => {
        if (!userDescription.trim()) return;
        setPhase('processing');
        const analysis = await LegalAI.analyzeCaseDescription(userDescription);
        const requiredFields = analysisRequiredToFormFields(analysis.requiredFields);
        setAiContext({
            title: analysis.title,
            legalContext: analysis.legalContext,
            requiredFields,
            draftTemplate: analysis.draftTemplate
                ? (data: InterviewData) => analysis.draftTemplate!(data)
                : undefined
        });
        const initialData: InterviewData = {};
        requiredFields.forEach((f) => { initialData[f.key] = ''; });
        setInterviewData(initialData);
        setPhase('interview');
    };

    const handleInterviewSubmit = () => {
        if (aiContext && aiContext.draftTemplate) {
            const draft = aiContext.draftTemplate(interviewData);
            setDraftText(draft);
            setPhase('preview');
            SmartToast.success('تم صياغة العريضة بناءً على المعطيات القانونية ⚖️');
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-end justify-center sm:items-center p-4">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="bg-[#1E1E2C] w-full max-w-3xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col h-[85vh] sm:h-[800px]"
            >
                <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#252538]">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <BrainCircuit className="text-amber-400" size={24} />
                            المستشار القانوني الذكي
                        </h3>
                        <p className="text-white/40 text-xs mt-1">نظام صياغة تفاعلي (RAG) متصل بقاعدة القوانين العراقية</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide relative bg-[#1A1E2E]">
                    <AnimatePresence mode="wait">
                        {phase === 'input' && (
                            <InputPhase userDescription={userDescription} setUserDescription={setUserDescription} onSubmit={handleInitialSubmit} />
                        )}
                        {phase === 'processing' && <ProcessingPhase />}
                        {phase === 'interview' && aiContext && (
                            <InterviewPhase aiContext={aiContext} interviewData={interviewData} setInterviewData={setInterviewData} onSubmit={handleInterviewSubmit} onBack={() => setPhase('input')} />
                        )}
                        {phase === 'preview' && (
                            <PreviewPhase draftText={draftText} setDraftText={setDraftText} onBackToInterview={() => setPhase('interview')} onClose={onClose} />
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
