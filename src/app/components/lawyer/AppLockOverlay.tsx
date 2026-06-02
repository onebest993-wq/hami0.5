import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Fingerprint, Lock, LogOut } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface AppLockOverlayProps {
    requiresBiometric: boolean;
    unlocking: boolean;
    onUnlockBiometric: () => Promise<boolean>;
    onUnlockContinue: () => void;
    onLogout?: () => void;
}

export const AppLockOverlay: React.FC<AppLockOverlayProps> = ({
    requiresBiometric,
    unlocking,
    onUnlockBiometric,
    onUnlockContinue,
    onLogout,
}) => {
    const [attempting, setAttempting] = useState(false);
    const busy = unlocking || attempting;

    const handleBiometric = async () => {
        setAttempting(true);
        try {
            const ok = await onUnlockBiometric();
            if (!ok) SmartToast.warning('تعذر التحقق البيومتري — حاول مرة أخرى');
        } finally {
            setAttempting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[#05060D]/95 backdrop-blur-xl px-6"
            role="dialog"
            aria-modal="true"
            aria-label="شاشة القفل"
        >
            <motion.div
                initial={{ scale: 0.96, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-sm text-center"
            >
                <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity }}
                    className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#E6C673]/10 border border-[#E6C673]/30 flex items-center justify-center"
                >
                    {requiresBiometric ? (
                        <Fingerprint size={36} className="text-[#E6C673]" />
                    ) : (
                        <Lock size={32} className="text-[#E6C673]" />
                    )}
                </motion.div>

                <h2 className="text-xl font-bold text-white mb-2">الجلسة مقفلة</h2>
                <p className="text-sm text-white/50 mb-8 leading-relaxed">
                    {requiresBiometric
                        ? 'لحماية بيانات الموكلين، يلزم التحقق البيومتري للمتابعة.'
                        : 'انتهت مدة الخمول. اضغط متابعة للعودة إلى المكتب.'}
                </p>

                {requiresBiometric ? (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={handleBiometric}
                        className="w-full h-12 rounded-2xl bg-[#E6C673] text-[#0A0F1C] font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        <Fingerprint size={18} />
                        {busy ? 'جاري التحقق...' : 'فتح بالبصمة / Face ID'}
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onUnlockContinue}
                        className="w-full h-12 rounded-2xl bg-[#E6C673] text-[#0A0F1C] font-bold text-sm disabled:opacity-60"
                    >
                        متابعة العمل
                    </button>
                )}

                {onLogout && (
                    <button
                        type="button"
                        onClick={onLogout}
                        className="mt-6 inline-flex items-center gap-2 text-white/40 text-xs hover:text-white/70 transition"
                    >
                        <LogOut size={14} />
                        تسجيل الخروج
                    </button>
                )}
            </motion.div>
        </motion.div>
    );
};
