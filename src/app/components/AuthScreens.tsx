import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, EyeOff, Mail, Lock, 
  Phone, CheckCircle, ArrowRight, ArrowLeft,
  Fingerprint, Scan
} from 'lucide-react';
import { PageWrapper, GlassCard, GoldButton, InputField } from './SharedComponents';
import { HamiLogoPlaceholder, EagleLogoPlaceholder } from '../assets/logo-placeholders';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { LawyerRegistration } from './lawyer/LawyerRegistration';

// 🚀 DEV MODE - Quick Login Flag
const DEV_MODE = import.meta.env.DEV;

interface AuthScreensProps {
  onLogin: () => void;
  onBack: () => void;
}

// --- Helper Components ---

interface PasswordFieldProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
}

// 1. Password Field with Toggle (Reused for Reset Flow)
const PasswordField = ({ label, value, onChange, placeholder }: PasswordFieldProps) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <InputField 
                label={label}
                icon={Lock}
                type={show ? "text" : "password"}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
            {/* Adjusted Eye Position for RTL */}
            <button 
                type="button"
                onClick={() => setShow(!show)}
                className="absolute left-4 top-[44px] -translate-y-1/2 text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors z-10 p-1"
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
};

// --- Sub-flows ---

// 1. Secure Recovery Flow (The Fortress)
const SecureRecoveryFlow = ({ onBack, onComplete }: { onBack: () => void, onComplete: () => void }) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Method, 2: OTP, 3: Biometric, 4: New Pass
    const [method, setMethod] = useState<'email' | 'sms' | null>(null);
    const [otp, setOtp] = useState('');
    const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    const handleSendCode = (selectedMethod: 'email' | 'sms') => {
        setMethod(selectedMethod);
        // Simulate API call
        setTimeout(() => setStep(2), 1000);
    };

    const verifyOtp = () => {
        if (otp === '123456') { // Dev OTP
            setStep(3);
        } else {
            SmartToast.error("الرمز غير صحيح");
        }
    };

    const triggerBiometricGate = () => {
        setBiometricStatus('scanning');
        setTimeout(() => {
            // Simulate Success
            setBiometricStatus('success');
            setTimeout(() => setStep(4), 1000);
        }, 2000);
    };

    const finalizeReset = () => {
        if (newPass !== confirmPass) {
            SmartToast.error("كلمات المرور غير متطابقة");
            return;
        }
        if (newPass.length < 8) {
            SmartToast.error("كلمة المرور ضعيفة");
            return;
        }
        onComplete();
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md"
        >
            <div className="text-center mb-6">
                <img src={HamiLogoPlaceholder} alt="Hami Logo" className="h-16 w-auto mx-auto mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]" />
                <h2 className="text-xl font-bold text-white">استعادة الحساب الآمنة</h2>
                <p className="text-xs text-gray-400">نظام حماية متعدد الطبقات</p>
            </div>

            <GlassCard className="p-6 space-y-6 border-[#D4AF37]/30">
                {/* Step 1: Choose Method */}
                {step === 1 && (
                    <div className="space-y-4">
                        <p className="text-sm text-white text-center mb-4">اختر وسيلة استلام رمز التحقق:</p>
                        <button type="button" 
                            onClick={() => handleSendCode('sms')}
                            className="w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] flex items-center justify-between transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#001830] rounded-full text-[#D4AF37] group-hover:scale-110 transition-transform"><Phone size={20} /></div>
                                <div className="text-right">
                                    <span className="block font-bold text-sm text-white">رقم الهاتف</span>
                                    <span className="text-[10px] text-gray-500">******5678</span>
                                </div>
                            </div>
                            <ArrowRight className="text-gray-500 group-hover:text-[#D4AF37]" size={16} />
                        </button>

                        <button type="button" 
                            onClick={() => handleSendCode('email')}
                            className="w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] flex items-center justify-between transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#001830] rounded-full text-[#D4AF37] group-hover:scale-110 transition-transform"><Mail size={20} /></div>
                                <div className="text-right">
                                    <span className="block font-bold text-sm text-white">البريد الإلكتروني</span>
                                    <span className="text-[10px] text-gray-500">user***@example.com</span>
                                </div>
                            </div>
                            <ArrowRight className="text-gray-500 group-hover:text-[#D4AF37]" size={16} />
                        </button>
                    </div>
                )}

                {/* Step 2: OTP */}
                {step === 2 && (
                    <div className="space-y-6 text-center">
                        <p className="text-sm text-gray-300">
                            أدخل الرمز المرسل إلى {method === 'sms' ? 'هاتفك' : 'بريدك'}
                        </p>
                        <InputField 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="text-center text-2xl tracking-[10px] font-mono"
                            placeholder="000000"
                            maxLength={6}
                        />
                        <GoldButton fullWidth onClick={verifyOtp}>تحقق ومتابعة</GoldButton>
                        <div className="text-xs text-gray-500">مطور: الرمز هو 123456</div>
                    </div>
                )}

                {/* Step 3: Biometric Gate */}
                {step === 3 && (
                    <div className="space-y-6 text-center py-4">
                        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                            {biometricStatus === 'scanning' && (
                                <motion.div 
                                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border-t-2 border-[#D4AF37]"
                                />
                            )}
                            <Scan size={48} className={`transition-colors duration-500 ${biometricStatus === 'success' ? 'text-green-400' : 'text-[#D4AF37]'}`} />
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="font-bold text-white">التحقق البيومتري مطلوب</h3>
                            <p className="text-xs text-gray-400 max-w-[200px] mx-auto">
                                لمنع انتحال الشخصية، يرجى تأكيد هويتك عبر بصمة الوجه أو الإصبع الخاصة بالجهاز.
                            </p>
                        </div>

                        {biometricStatus === 'idle' && (
                            <GoldButton fullWidth onClick={triggerBiometricGate} icon={Fingerprint}>
                                المصادقة الآن
                            </GoldButton>
                        )}
                        
                        {biometricStatus === 'success' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-green-400 text-sm font-bold flex items-center justify-center gap-2">
                                <CheckCircle size={16} /> تم تأكيد الهوية
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Step 4: Reset Password */}
                {step === 4 && (
                    <div className="space-y-4">
                        <p className="text-sm text-green-400 text-center font-bold mb-2">تم التحقق من هويتك بنجاح</p>
                        <PasswordField 
                            label="كلمة المرور الجديدة" 
                            value={newPass} 
                            onChange={(e) => setNewPass(e.target.value)} 
                        />
                        <PasswordField 
                            label="تأكيد كلمة المرور" 
                            value={confirmPass} 
                            onChange={(e) => setConfirmPass(e.target.value)} 
                        />
                        <GoldButton fullWidth onClick={finalizeReset}>حفظ وتحديث</GoldButton>
                    </div>
                )}

                <button type="button" onClick={onBack} className="w-full py-2 text-gray-500 hover:text-white text-xs flex items-center justify-center gap-1">
                    إلغاء والعودة
                </button>
            </GlassCard>
        </motion.div>
    );
};


// --- Main Screen ---
export const AuthScreens = React.memo(function AuthScreens({ onLogin, onBack }: AuthScreensProps) {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(true); 

  const handleEmailAuth = async () => {
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          if (view === 'login' && Math.random() > 0.8) {
             SmartToast.info("جهاز جديد: يرجى التقاط سيلفي للتحقق (Liveness Check)");
          }
          onLogin();
      }, 1000);
  };

  const handleBiometricLogin = () => {
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          onLogin();
      }, 800);
  };

  // Lawyer registration: dedicated security flow
  if (view === 'register') {
      return (
          <PageWrapper>
             <div className="h-screen flex flex-col pt-6 pb-2 px-4 relative bg-[#000510]">
                 <LawyerRegistration 
                    onBack={() => setView('login')} 
                    onComplete={() => {
                        setLoading(true);
                        setTimeout(() => {
                            setLoading(false);
                            onLogin();
                        }, 1500);
                    }} 
                 />
             </div>
          </PageWrapper>
      );
  }

  return (
    <PageWrapper>
      {/* Back Button */}
      <div className="absolute top-6 right-6 z-50">
        <button type="button" onClick={onBack} className="w-10 h-10 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37]/10 transition">
             <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
          
          <AnimatePresence mode='wait'>
            {view === 'forgot' ? (
                <SecureRecoveryFlow key="forgot" onBack={() => setView('login')} onComplete={() => setView('login')} />
            ) : (
                <motion.div 
                    key="auth"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full max-w-md -mt-32"
                >
                    <div className="text-center relative">
                        {/* Logo Replacement - Huge & Smartly Overlapped */}
                        <div className="relative z-0 mx-auto w-fit">
                            <img src={EagleLogoPlaceholder} alt="Hami Eagle Logo" className="h-[500px] w-auto -mb-40 drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]" />
                        </div>
                        
                        <div className="relative z-10">
                            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                                {view === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
                            </h1>
                            <p className="text-[#D4AF37] text-sm tracking-wide mb-8 bg-[#000510]/40 backdrop-blur-md px-4 py-1.5 rounded-full inline-block border border-[#D4AF37]/20 shadow-lg">
                                بوابة المحامين الرسمية
                            </p>
                        </div>
                    </div>

                    <GlassCard className="p-8 space-y-6 border-[#D4AF37]/30 relative z-10 backdrop-blur-xl bg-[#00102A]/70 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                        {/* 🚀 DEV MODE BADGE */}
                        {DEV_MODE && (
                            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-50">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                DEV MODE
                            </div>
                        )}

                        {/* 🚀 DEV MODE: Quick Login Button */}
                        {DEV_MODE && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => {
                                    SmartToast.success('🚀 دخول فوري - وضع التطوير');
                                    onLogin();
                                }}
                                className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/20"
                            >
                                <span className="text-lg">🚀</span>
                                <span>دخول فوري للتطوير</span>
                                <ArrowRight size={20} />
                            </motion.button>
                        )}

                        <InputField 
                            label="البريد الإلكتروني" 
                            icon={Mail} 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <PasswordField 
                            label="كلمة المرور" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                        
                        {view === 'login' && (
                            <div className="flex justify-between items-center">
                                {/* Biometric Login Option */}
                                {hasBiometrics && (
                                    <button type="button" 
                                        onClick={handleBiometricLogin}
                                        className={`flex items-center gap-1 transition-colors text-xs ${DEV_MODE ? 'text-green-400 hover:text-green-300 font-bold' : 'text-[#D4AF37] hover:text-white'}`}
                                        title="دخول سريع"
                                    >
                                        <Fingerprint size={16} /> {DEV_MODE ? '🚀 دخول بالبصمة (سريع)' : 'دخول بالبصمة'}
                                    </button>
                                )}
                                <button type="button" 
                                    onClick={() => setView('forgot')}
                                    className="text-xs text-[#D4AF37] hover:underline"
                                >
                                    نسيت كلمة المرور؟
                                </button>
                            </div>
                        )}

                        <GoldButton fullWidth onClick={handleEmailAuth} className="mt-4">
                            {loading ? 'جاري التحقق...' : (view === 'login' ? 'دخول آمن' : 'تسجيل حساب')}
                        </GoldButton>
                    </GlassCard>

                    <p className="text-center mt-6 text-gray-400 text-sm">
                        {view === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                        <button type="button" 
                            onClick={() => setView(view === 'login' ? 'register' : 'login')}
                            className="text-[#D4AF37] font-bold mr-2 hover:underline"
                        >
                            {view === 'login' ? 'ابدأ رحلة التوثيق' : 'سجل دخولك'}
                        </button>
                    </p>
                </motion.div>
            )}
          </AnimatePresence>
      </div>
    </PageWrapper>
  );
});