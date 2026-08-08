import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase-client';
import { Fingerprint, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { CryptoService } from '@/app/services/CryptoService';
import logger from '@/app/utils/logger';
import { logAction } from '@/app/utils/auditLog';

const DEV_MODE = import.meta.env.DEV;

interface UserProfile {
    id?: string;
    email: string;
    name?: string;
    role?: string;
    authMethod?: string;
}

interface LawyerAuthProps {
    onLoginSuccess: (user: UserProfile) => void;
}

export const LawyerAuth = ({ onLoginSuccess }: LawyerAuthProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [biometricScanning, setBiometricScanning] = useState(false);
    const [showPrivacyHint, setShowPrivacyHint] = useState(false);
    const [webAuthnAvailable, setWebAuthnAvailable] = useState(false);

    useEffect(() => {
        setWebAuthnAvailable(false);
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);

        try {
            if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                await CryptoService.initialize(password);

                SmartToast.success('تم إنشاء الحساب بنجاح! يرجى تأكيد البريد الإلكتروني.');
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.user) {
                    await CryptoService.initialize(password);
                    await logAction('login_success', {
                        source: 'LawyerAuth',
                        email: data.user.email ?? email,
                        userId: data.user.id,
                    });

                    SmartToast.success('تم تسجيل الدخول بنجاح');
                    onLoginSuccess({
                        id: data.user.id,
                        email: data.user.email ?? email,
                    });
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تسجيل الدخول';
            SmartToast.error(errorMessage);
            logger.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        setBiometricScanning(true);

        try {
            if (DEV_MODE) {
                await CryptoService.initialize('DEV_SESSION_KEY');
                SmartToast.success('✅ دخول تطوير سريع - DEV MODE');
                onLoginSuccess({
                    id: 'dev-lawyer-001',
                    email: 'dev@hami.app',
                    authMethod: 'dev-mode',
                    name: 'مطور النظام'
                });
                setBiometricScanning(false);
                return;
            }

            SmartToast.error('البصمة البيومترية غير متاحة حالياً');
            setBiometricScanning(false);
        } catch (error) {
            logger.error('Biometric auth error:', error);
            SmartToast.error('فشل التحقق البيومتري');
        } finally {
            setBiometricScanning(false);
        }
    };

    const handleDevQuickLogin = async () => {
        setLoading(true);
        await CryptoService.initialize('DEV_SESSION_KEY');
        SmartToast.success('🚀 دخول فوري - وضع التطوير');
        onLoginSuccess({
            id: 'dev-lawyer-001',
            email: 'dev@hami.app',
            authMethod: 'dev-mode',
            name: 'مطور النظام'
        });
        setLoading(false);
    };

    const handleAlternativePrivacyLogin = async () => {
        SmartToast.info('هذه الميزة غير متاحة حالياً');
    };

    return (
        <div className="fixed inset-0 bg-[#0B1021] flex items-center justify-center p-4 z-[9999]">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#E6C673]/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#3B82F6]/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[#1A1E2E]/80 backdrop-blur-xl border border-[#E6C673]/20 rounded-3xl p-8 relative shadow-2xl"
            >
                {DEV_MODE && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute top-4 left-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        DEV MODE
                    </motion.div>
                )}

                <div className="flex flex-col items-center mb-8">
                    <div
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E6C673] to-[#B45309] flex items-center justify-center mb-4 shadow-lg shadow-[#E6C673]/20 cursor-pointer"
                        onDoubleClick={() => setShowPrivacyHint(!showPrivacyHint)}
                    >
                        <ShieldCheck size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">حامي</h1>
                    <p className="text-white/50 text-center text-sm">بوابة المحامي العراقي الذكية</p>

                    {showPrivacyHint && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 text-[10px] text-white/30 text-center px-4 py-2 bg-white/5 rounded-lg border border-white/10"
                        >
                            🔒 وضع الخصوصية المتقدم متاح
                        </motion.div>
                    )}
                </div>

                {DEV_MODE && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleDevQuickLogin}
                        className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all mb-6 shadow-lg shadow-green-500/20"
                    >
                        <span className="text-lg">🚀</span>
                        <span>دخول فوري للتطوير</span>
                        <ArrowRight size={20} />
                    </motion.button>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs text-[#E6C673] font-bold pr-2">البريد الإلكتروني</label>
                        <div className="relative">
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 bg-[#0B1021] border border-white/10 rounded-xl pr-12 pl-4 text-white focus:border-[#E6C673] focus:shadow-[0_0_15px_rgba(230,198,115,0.1)] outline-none transition-all"
                                placeholder="name@lawfirm.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-[#E6C673] font-bold pr-2">كلمة المرور</label>
                        <div className="relative">
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 bg-[#0B1021] border border-white/10 rounded-xl pr-12 pl-4 text-white focus:border-[#E6C673] focus:shadow-[0_0_15px_rgba(230,198,115,0.1)] outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#E6C673] hover:bg-[#D4B360] text-[#0B1021] font-bold rounded-xl flex items-center justify-center gap-2 transition-all mt-6"
                    >
                        {loading ? (
                            <span className="animate-pulse">جاري الاتصال...</span>
                        ) : (
                            <>
                                {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {(webAuthnAvailable || DEV_MODE) && (
                    <>
                        <div className="my-6 flex items-center gap-4">
                            <div className="h-[1px] bg-white/10 flex-1" />
                            <span className="text-white/30 text-xs">أو باستخدام</span>
                            <div className="h-[1px] bg-white/10 flex-1" />
                        </div>

                        <button type="button"
                            onClick={handleBiometricLogin}
                            disabled={biometricScanning}
                            className={`w-full h-14 border border-white/10 rounded-2xl flex items-center justify-center gap-3 transition-all ${
                                biometricScanning
                                    ? 'bg-[#E6C673]/10 border-[#E6C673] text-[#E6C673]'
                                    : DEV_MODE
                                        ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-400'
                                        : 'bg-white/5 hover:bg-white/10 text-white'
                            }`}
                        >
                            {biometricScanning ? (
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    <Fingerprint size={28} />
                                </motion.div>
                            ) : (
                                <Fingerprint size={24} className={DEV_MODE ? 'text-green-400' : 'text-white/70'} />
                            )}
                            <span className="font-bold">
                                {biometricScanning ? 'جاري مسح البصمة...' : DEV_MODE ? '🚀 الدخول بالبصمة (تطوير سريع)' : 'الدخول بالبصمة البيومترية'}
                            </span>
                        </button>
                    </>
                )}

                <div className="mt-6 text-center">
                    <button type="button"
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                        className="text-white/40 text-sm hover:text-[#E6C673] transition-colors"
                    >
                        {mode === 'login' ? 'ليس لديك حساب؟ إنشاء حساب' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
                    </button>
                </div>

                <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1A1E2E] px-3 py-1 rounded-full border border-white/10 text-[10px] text-green-500">
                    <ShieldCheck size={10} />
                    Secured by Supabase Auth
                </div>
            </motion.div>
        </div>
    );
};
