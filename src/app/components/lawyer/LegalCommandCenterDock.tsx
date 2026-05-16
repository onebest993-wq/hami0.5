import React, { useState, useRef, useEffect, Suspense } from 'react';
import { 
    Book, Scan, Mic, 
    Edit3, ListChecks, FolderOpen,
    Calendar as CalendarIcon,
    type LucideIcon,
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { motion } from 'motion/react';
import { NotebookModal } from './NotebookModal';
import {
    LazyScannerModal,
    LazySmartVaultModal,
    LazyVoiceRecorderModal,
} from '@/app/utils/lazyComponents';
import { LegalAI } from './LegalAI_Coordinator.tsx';

export type NoteType = 'text' | 'voice' | 'image' | 'schedule';
export interface Note {
    id: number;
    content: string;
    type: NoteType;
    date: Date;
}

interface LegalCommandCenterDockProps {
    onAddNote?: (note: Note) => void;
    clientPhone?: string;
    userId?: string;
    // New Props for Petition Wizard
    files?: Record<string, unknown>[];
    theme?: Record<string, unknown>;
    onOpenCalendar?: () => void;
    // Legacy props (kept for interface compatibility but ignored)
    onOpenAutoDraft?: () => void;
    onLaunchScanner?: () => void;
    onStartRecording?: () => void;
    onOpenNotebook?: () => void;
    /** Phase 28 — فتح ستارة مهام اليوم (الستارة الذكية) */
    onOpenFieldTasksSheet?: () => void;
    /** عدد المهام غير المنجزة اليوم (للنقطة على الأيقونة) */
    pendingFieldTasksCount?: number;
}

export const LegalCommandCenterDock: React.FC<LegalCommandCenterDockProps> = ({
    onAddNote,
    clientPhone: _clientPhone,
    userId,
    files: _files,
    theme: _theme,
    onOpenCalendar,
    onOpenAutoDraft: _onOpenAutoDraft,
    onOpenFieldTasksSheet,
    pendingFieldTasksCount = 0,
}) => {
    // Internal State for ALL Modals (Decoupled from Dashboard to prevent freezing)
    const [showNotebook, setShowNotebook] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showVault, setShowVault] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    
    // Existing Logic State
    const [quickNote, setQuickNote] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLongPress, setIsLongPress] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
    }, []);

    // Logic for AI Button (Alive Button) - Unified Royal Touch
    const AIButton = ({ icon: Icon, tooltip, onClick }: { icon: LucideIcon; tooltip: string; onClick: () => void }) => {
        return (
            <div className="group relative flex flex-col items-center">
                 <button type="button" 
                    onClick={onClick}
                    title={tooltip}
                    className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                        border active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.2)]
                    `}
                    style={{
                        background: 'linear-gradient(180deg, rgba(26, 33, 48, 0.6) 0%, rgba(5, 5, 5, 0.8) 100%)',
                        borderColor: 'rgba(212, 175, 55, 0.5)'
                    }}
                >
                    <Icon size={24} className="text-white opacity-100 group-hover:text-[#D4AF37] transition-colors" />
                </button>
                {/* Tooltip */}
                <span className="absolute -top-10 text-[10px] text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-[#D4AF37]/30 px-2 py-1 rounded-md pointer-events-none whitespace-nowrap shadow-lg z-50">
                    {tooltip}
                </span>
            </div>
        );
    };

    // Quick Note AI Processor (TEXT)
    const _aiProcessQuickNote = async (text: string) => {
        const cleanText = text.trim();
        if (!cleanText) return;
        
        // Use Central AI
        const analysis = await LegalAI.processInput(cleanText, 'text');
        
        // Process Actions
        if (analysis.actions.length > 0) {
            analysis.actions.forEach((action) => {
                if (action.type === 'calendar') {
                    if (onOpenCalendar) onOpenCalendar();
                    else SmartToast.info(action.label);
                    return;
                }
                if (action.type === 'doc') {
                    SmartToast.info(action.label);
                    return;
                }
                SmartToast.info(action.label);
            });
        }

        const isSchedule = cleanText.includes("موعد") || cleanText.includes("جلسة") || cleanText.includes("تذكير");
        
        if (onAddNote) {
            onAddNote({
                id: Date.now(),
                content: cleanText,
                type: isSchedule ? 'schedule' : 'text',
                date: new Date()
            });
            
            if (isSchedule) {
                SmartToast.success("تمت جدولة الموعد في التقويم 📅");
            } else {
                SmartToast.success("تم حفظ الملاحظة الذكية 📝");
            }
        }
        
        setQuickNote('');
    };

    // --- 1. RECORDING UX HANDLERS ---
    
    const handleTouchStart = () => {
        // Start Timer to detect Long Press
        timerRef.current = setTimeout(() => {
            setIsLongPress(true);
            setIsRecording(true);
            
            // Haptic Feedback
            if (navigator.vibrate) navigator.vibrate(100);
            
            SmartToast.show("جاري التسجيل... تحدث الآن 🎙️", { type: 'error', duration: Infinity, id: 'recording-toast' });
        }, 500); // 500ms threshold for long press
    };

    const handleTouchEnd = () => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (isLongPress) {
            // Long Press Logic: Stop & Process
            setIsLongPress(false);
            setIsRecording(false);
            SmartToast.dismiss('recording-toast');
            processAudioInput();
        } else {
            // Short Tap Logic: Open Modal
            setShowVoiceModal(true);
        }
    };

    // --- 2. AI BRAIN LOGIC (AUDIO) ---
    const processAudioInput = async () => {
        const loadingToast = SmartToast.loading("جاري معالجة الصوت بالذكاء الاصطناعي...");
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';
            const recorder = new MediaRecorder(stream, { mimeType });
            const audioChunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            const recordingPromise = new Promise<void>((resolve) => {
                recorder.onstop = () => resolve();
            });

            recorder.start(250);
            await new Promise(resolve => setTimeout(resolve, 3000));
            recorder.stop();
            stream.getTracks().forEach(t => t.stop());
            await recordingPromise;

            const audioBlob = new Blob(audioChunks, { type: mimeType });
            const analysis = await LegalAI.processInput(audioBlob, 'audio');
            
            setQuickNote(typeof analysis.text === 'string' ? analysis.text : '');
            SmartToast.dismiss(loadingToast);
            SmartToast.success("تم التفريغ النصي بنجاح ✅");
            
            analysis.actions.forEach((action) => {
                if (action.type === 'calendar') {
                    SmartToast.show("تم رصد موعد في التسجيل", {
                        description: action.label,
                        action: {
                            label: "إضافة",
                            onClick: () => SmartToast.success("تمت الإضافة للجدول الزمني")
                        },
                        duration: 5000,
                    });
                    return;
                }
                SmartToast.info(action.label);
            });

            if (analysis.summary && analysis.summary.length > 0) {
                SmartToast.show("ملخص التسجيل", {
                    description: analysis.summary.join('\n'),
                    duration: 6000
                });
            }
        } catch {
            SmartToast.dismiss(loadingToast);
            SmartToast.warning("⚠️ تعذر الوصول إلى المايكروفون. استخدم التسجيل من النافذة المنبثقة.");
        }
    };

    return (
        <div className="w-full flex justify-center items-center py-1 relative z-30 pb-4 mb-12">
            
            {/* The Dock Container */}
            <div className="bg-[#0F172A]/60 rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-5 pb-6 w-full border border-[#D4AF37] backdrop-blur-[30px]">
                <div className="flex flex-col gap-5">
                    
                    {/* 1. صف أدوات الذكاء الاصطناعي (الصف العلوي) */}
                    <div className="flex justify-evenly items-center w-full px-2">
                        <AIButton 
                            icon={Book} 
                            tooltip="المفكرة الكاملة" 
                            onClick={() => setShowNotebook(true)} 
                        />
                        <AIButton
                            icon={CalendarIcon}
                            tooltip="التقويم"
                            onClick={() => {
                                if (onOpenCalendar) onOpenCalendar();
                                else SmartToast.info('📅 فتح التقويم...');
                            }}
                        />
                        {/* Scanner FAB — محور الشريط السفلي */}
                        <div className="group relative flex flex-col items-center">
                            <button type="button" 
                                onClick={() => {
                                    SmartToast.info("📸 جاري فتح الكاميرا للمعالجة...");
                                    setShowScanner(true);
                                }}
                                title="الماسح الضوئي"
                                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 border-2 active:scale-90 shadow-[0_4px_25px_rgba(212,175,55,0.4)]"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.1) 100%)',
                                    borderColor: '#D4AF37'
                                }}
                            >
                                <Scan size={26} className="text-[#D4AF37]" />
                            </button>
                            <span className="absolute -top-10 text-[10px] text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-[#D4AF37]/30 px-2 py-1 rounded-md pointer-events-none whitespace-nowrap shadow-lg z-50">
                                الماسح الضوئي
                            </span>
                        </div>
                        <AIButton icon={FolderOpen} tooltip="مخزن الملفات الذكي" onClick={() => setShowVault(true)} />
                        {/* مهام اليوم — أقصى اليمين: يفتح الستارة الذكية */}
                        <div className="group relative flex flex-col items-center">
                            <button
                                type="button"
                                onClick={() => {
                                    if (onOpenFieldTasksSheet) onOpenFieldTasksSheet();
                                    else SmartToast.info('مهام اليوم');
                                }}
                                title="مهام اليوم الميدانية"
                                className={`
                                    relative w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-300 border-2 active:scale-95
                                    ${
                                        pendingFieldTasksCount > 0
                                            ? 'shadow-[0_0_22px_rgba(230,198,115,0.5)] ring-2 ring-[#E6C673]/70 border-[#E6C673]'
                                            : 'border-[#D4AF37]/80 shadow-[0_4px_18px_rgba(212,175,55,0.22)]'
                                    }
                                `}
                                style={{
                                    background: 'linear-gradient(180deg, rgba(212,175,55,0.22) 0%, rgba(26, 33, 48, 0.7) 100%)',
                                }}
                            >
                                <ListChecks size={26} className="text-white group-hover:text-[#E6C673] transition-colors" />
                                {pendingFieldTasksCount > 0 ? (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[10px] h-2.5 px-0.5 rounded-full bg-red-500 border-2 border-[#0B1021] shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse" />
                                ) : null}
                            </button>
                            <span className="absolute -top-10 text-[10px] text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-[#D4AF37]/30 px-2 py-1 rounded-md pointer-events-none whitespace-nowrap shadow-lg z-50">
                                مهام اليوم الميدانية
                            </span>
                        </div>
                    </div>

                    {/* 2. حقل الملاحظة السريعة + زر المايكروفون المدمج (الصف السفلي) */}
                    <form
                        className="relative group"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void _aiProcessQuickNote(quickNote);
                        }}
                    >
                        <div className="relative group">
                        <div 
                            className={`flex items-center rounded-[20px] border px-4 py-1 transition-all duration-300 shadow-inner ${isRecording ? 'border-red-500/50' : ''}`}
                            style={{
                                background: isRecording ? 'rgba(239, 68, 68, 0.05)' : 'linear-gradient(180deg, rgba(26, 33, 48, 0.6) 0%, rgba(5, 5, 5, 0.8) 100%)',
                                borderColor: isRecording ? 'rgba(239, 68, 68, 0.5)' : '#D4AF37',
                                borderWidth: '1px'
                            }}
                        >
                            {/* Animated Icon Logic */}
                            {isRecording ? (
                                <div className="flex items-center gap-1 ml-2">
                                    {[1,2,3].map(i => (
                                        <motion.div 
                                            key={i}
                                            animate={{ height: [10, 25, 10] }}
                                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                            className="w-1 bg-[#D4AF37] rounded-full"
                                            style={{ height: 15 }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Edit3 className="text-[#D4AF37] opacity-70 ml-2" size={20} />
                            )}
                            
                            <input 
                                type="text"
                                name="nlp-task"
                                value={quickNote}
                                onChange={(e) => setQuickNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                placeholder={isRecording ? "جاري الاستماع..." : "اكتب ملاحظة أو سجل صوتياً..."}
                                className="flex-1 bg-transparent border-none outline-none text-white text-sm py-3 placeholder-white/70 font-medium"
                                style={{ direction: 'rtl' }}
                                disabled={isRecording}
                            />
                            
                            {/* Integrated Voice Recorder Button (Dual Action) */}
                            <div 
                                onMouseDown={handleTouchStart}
                                onMouseUp={handleTouchEnd}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                className="cursor-pointer"
                            >
                                <div className={`
                                    mr-1 p-2 rounded-full transition-all duration-300
                                    ${isRecording ? 'bg-[#D4AF37] scale-125 shadow-[0_0_15px_rgba(212,175,55,0.5)]' : 'bg-transparent hover:bg-white/5'}
                                `}>
                                    <Mic 
                                        size={20} 
                                        className={`transition-colors ${isRecording ? 'text-black' : 'text-[#D4AF37]'}`} 
                                    />
                                </div>
                            </div>
                        </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 px-1 text-right leading-relaxed">
                            مثال: غداً مراجعة قلم البداءة لتسديد الرسوم...
                        </p>
                    </form>

                </div>
            </div>

            {/* Modals */}
            <div className="z-50">
                {showVault && (
                    <Suspense fallback={null}>
                        <LazySmartVaultModal onClose={() => setShowVault(false)} currentUserId={userId} />
                    </Suspense>
                )}
                {showVoiceModal && (
                    <Suspense fallback={null}>
                        <LazyVoiceRecorderModal onClose={() => setShowVoiceModal(false)} />
                    </Suspense>
                )}
                
                {/* Localized Modals to prevent Dashboard Freeze */}
                {showNotebook && <NotebookModal onClose={() => setShowNotebook(false)} />}
                {showScanner && (
                    <Suspense fallback={null}>
                        <LazyScannerModal onClose={() => setShowScanner(false)} userId={userId || ''} />
                    </Suspense>
                )}
            </div>
        </div>
    );
};
