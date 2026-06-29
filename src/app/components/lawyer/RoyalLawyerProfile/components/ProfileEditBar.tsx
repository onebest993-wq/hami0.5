import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

export type ProfileEditBarProps = {
    isEditing: boolean;
    saving: boolean;
    savingSettings: boolean;
    onCancel: () => void;
    onSave: () => void;
};

export const ProfileEditBar = memo(function ProfileEditBar({
    isEditing,
    saving,
    savingSettings,
    onCancel,
    onSave,
}: ProfileEditBarProps) {
    const reduceMotion = useReduceMotion();
    return (
        <AnimatePresence>
            {isEditing ? (
                <motion.div
                    initial={reduceMotion ? false : { y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduceMotion ? undefined : { y: 100, opacity: 0 }}
                    transition={reduceMotion ? { duration: 0 } : undefined}
                    className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                >
                    <div className="max-w-lg mx-auto flex gap-3 p-2 rounded-[24px] bg-[#0A0F1C]/95 border border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.5)]">
                        <button
                            type="button"
                            data-testid="lawyer-profile-edit-cancel"
                            onClick={onCancel}
                            disabled={saving || savingSettings}
                            className="flex-1 py-3.5 rounded-2xl border border-white/15 text-sm font-bold text-white/80 hover:bg-white/5 transition-colors min-h-[48px]"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            data-testid="lawyer-profile-edit-save"
                            onClick={onSave}
                            disabled={saving || savingSettings}
                            className="flex-[1.2] py-3.5 rounded-2xl hami-profile-accent-btn-solid text-sm font-bold flex items-center justify-center gap-2 min-h-[48px]"
                        >
                            {saving || savingSettings ? (
                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <Check size={16} />
                            )}
                            حفظ التغييرات
                        </button>
                    </div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
});
