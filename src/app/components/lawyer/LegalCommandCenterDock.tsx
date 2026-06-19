import React, { useState, Suspense, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
    Book,
    Mic,
    Edit3,
    ListChecks,
    FolderOpen,
    Calendar as CalendarIcon,
    type LucideIcon,
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    LazySmartVaultModal,
    LazyVoiceRecorderModal,
} from '@/app/components/lawyer/commandCenterDockLazy';
import {
    HAMI_DISMISS_OVERLAYS_EVENT,
    dismissTransientOverlays,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';
import type { CommandCenterNote as Note } from './commandCenterTypes';
import { HOME_DOCK_SHELL, HOME_NOTE_FIELD, HOME_NOTE_INPUT } from './dashboard/lawyerHomeTheme';

interface LegalCommandCenterDockProps {
    onAddNote?: (note: Note) => void;
    userId?: string;
    onOpenCalendar?: () => void;
    onOpenFullNotepad?: () => void;
    onOpenFieldTasksSheet?: () => void;
    pendingFieldTasksCount?: number;
}

type DockItemProps = {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    active?: boolean;
    badge?: boolean;
    reduceMotion: boolean;
};

function DockItem({ icon: Icon, label, onClick, active, badge, reduceMotion }: DockItemProps) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            title={label}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            whileTap={{ scale: 0.94, opacity: 0.88 }}
            className="relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-0.5"
        >
            <div className="relative flex flex-col items-center">
                <div
                    className="relative flex items-center justify-center w-11 h-11 rounded-[1rem] transition-colors duration-200"
                    style={{
                        background: active
                            ? 'color-mix(in srgb, var(--hami-primary, #E6C673) 12%, rgba(255,255,255,0.04))'
                            : 'rgba(255,255,255,0.04)',
                        border: active
                            ? '1px solid color-mix(in srgb, var(--hami-primary, #E6C673) 32%, transparent)'
                            : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: active
                            ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 16px color-mix(in srgb, var(--hami-primary, #E6C673) 12%, transparent)'
                            : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                >
                    <Icon
                        size={18}
                        strokeWidth={active ? 2 : 1.65}
                        className={active ? 'hami-home-accent-text' : 'text-white/82'}
                    />
                    {badge ? (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#060608]" aria-hidden />
                    ) : null}
                </div>
                {active ? (
                    <span
                        className="mt-1 w-4 h-[2px] rounded-full hami-home-accent-text bg-[var(--hami-primary,#E6C673)]"
                        aria-hidden
                    />
                ) : (
                    <span className="mt-1 h-[2px]" aria-hidden />
                )}
            </div>
            <span
                className={`text-[9px] font-semibold leading-tight tracking-wide truncate max-w-full px-0.5 mt-0.5 ${
                    active ? 'hami-home-accent-text' : 'text-white/55'
                }`}
            >
                {label}
            </span>
        </motion.button>
    );
}

export const LegalCommandCenterDock: React.FC<LegalCommandCenterDockProps> = ({
    onAddNote,
    userId,
    onOpenCalendar,
    onOpenFullNotepad,
    onOpenFieldTasksSheet,
    pendingFieldTasksCount = 0,
}) => {
    const reduceMotion = useReducedMotion() ?? false;
    const [showVault, setShowVault] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [quickNote, setQuickNote] = useState('');
    const [noteOpen, setNoteOpen] = useState(false);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except !== 'vault') setShowVault(false);
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    const requireSignedIn = (feature: string): boolean => {
        if (userId?.trim()) return true;
        SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${feature}`);
        return false;
    };

    const openVoiceModal = () => {
        if (!requireSignedIn('التسجيل الصوتي')) return;
        setShowVoiceModal(true);
    };

    const saveQuickNote = (text: string) => {
        const cleanText = text.trim();
        if (!cleanText || !onAddNote) return;

        const isSchedule =
            cleanText.includes('موعد') || cleanText.includes('جلسة') || cleanText.includes('تذكير');

        onAddNote({
            id: Date.now(),
            content: cleanText,
            type: isSchedule ? 'schedule' : 'text',
            date: new Date(),
        });

        SmartToast.success(isSchedule ? 'تمت جدولة الموعد في التقويم 📅' : 'تم حفظ الملاحظة 📝');
        setQuickNote('');
        setNoteOpen(false);
    };

    return (
        <>
            <motion.div
                className="fixed bottom-[6.25rem] inset-x-0 z-50 px-5 pointer-events-none pb-[max(0px,env(safe-area-inset-bottom))]"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 28, delay: 0.35 }}
            >
                <div className="max-w-[440px] mx-auto pointer-events-auto">
                    <AnimatePresence mode="wait">
                        {noteOpen ? (
                            <motion.form
                                key="note"
                                initial={{ opacity: 0, y: 12, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: 8, height: 0 }}
                                transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                                className="mb-2.5"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    saveQuickNote(quickNote);
                                }}
                            >
                                <div className={HOME_NOTE_FIELD}>
                                    <Edit3 className="text-[#E6C673]/75 shrink-0" size={17} />
                                    <input
                                        type="text"
                                        name="nlp-task"
                                        autoFocus
                                        value={quickNote}
                                        onChange={(e) => setQuickNote(e.target.value)}
                                        placeholder="ملاحظة أو موعد..."
                                        className={HOME_NOTE_INPUT}
                                        style={{ direction: 'rtl' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={openVoiceModal}
                                        className="shrink-0 p-1.5 rounded-lg text-[#E6C673]/80 hover:bg-white/[0.05] active:scale-95 transition-colors"
                                    >
                                        <Mic size={17} />
                                    </button>
                                </div>
                            </motion.form>
                        ) : null}
                    </AnimatePresence>

                    <div className={`${HOME_DOCK_SHELL} px-2.5 pt-2.5 pb-3`}>
                        <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none" aria-hidden />
                        <div className="relative flex items-end justify-between gap-0.5">
                            <DockItem
                                icon={Book}
                                label="المفكرة"
                                reduceMotion={reduceMotion}
                                onClick={() => {
                                    if (onOpenFullNotepad) onOpenFullNotepad();
                                    else SmartToast.info('المفكرة الكاملة');
                                }}
                            />
                            <DockItem
                                icon={CalendarIcon}
                                label="التقويم"
                                reduceMotion={reduceMotion}
                                onClick={() => {
                                    if (onOpenCalendar) onOpenCalendar();
                                    else SmartToast.info('📅 فتح التقويم...');
                                }}
                            />
                            <DockItem
                                icon={FolderOpen}
                                label="المخزن"
                                active
                                reduceMotion={reduceMotion}
                                onClick={() => {
                                    if (!requireSignedIn('مخزن الملفات')) return;
                                    dismissTransientOverlays('vault');
                                    setShowVault(true);
                                }}
                            />
                            <DockItem
                                icon={ListChecks}
                                label="مهام"
                                badge={pendingFieldTasksCount > 0}
                                reduceMotion={reduceMotion}
                                onClick={() => {
                                    if (onOpenFieldTasksSheet) onOpenFieldTasksSheet();
                                    else SmartToast.info('مهام اليوم');
                                }}
                            />
                            <DockItem
                                icon={Edit3}
                                label="ملاحظة"
                                reduceMotion={reduceMotion}
                                onClick={() => setNoteOpen((v) => !v)}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

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
            </div>
        </>
    );
};
