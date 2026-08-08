import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    User, Phone, Mail, Lock, Check, MapPin, Building2, FileText,
    Gavel, ShieldAlert, BadgeCheck, ArrowRight,
    ChevronLeft, ScanFace, Smartphone, Scale, Fingerprint,
    AlertTriangle, Crown, ShieldCheck, Hand, Key,
} from '@/app/components/ui/lucideIcons';
import { GlassCard } from '../SharedComponents';
import { EagleLogoPlaceholder } from '../../assets/logo-placeholders';
import { StackInputField } from './LawyerRegistration/components/StackInputField';
import { GlassGridSheet } from './LawyerRegistration/components/GlassGridSheet';
import { DocumentUploader } from './LawyerRegistration/components/DocumentUploader';
import { GoldButton } from '../SharedComponents';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import {
    IRAQI_PHONE_REGEX,
    PROVINCES,
    SPECIALIZATIONS,
    TRANSACTIONS,
    LAWYER_GRADES,
    TERMS_TITLE,
    TERMS_BODY,
    LAWYER_PLEDGE,
    type Step,
    type LawyerData
} from './LawyerRegistration/constants';

export const LawyerRegistration = ({ onBack, onComplete }: { onBack: () => void, onComplete: () => void }) => {
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [activeSheet, setActiveSheet] = useState<string | null>(null);
    const [devMode, setDevMode] = useState(false);
    const [showPinInput, setShowPinInput] = useState(false);

    const [termsScrolled, setTermsScrolled] = useState(false);
    const [biometricsEnabled, setBiometricsEnabled] = useState(false);

    const [data, setData] = useState<LawyerData>({
        fullName: '', email: '', phone: '', password: '', confirmPassword: '',
        lawyerGrade: '', officeName: '', officeAddress: '',
        workProvinces: [], specializations: [], transactions: [],
        idFront: null, idBack: null, syndicateId: null, ocrVerified: false,
        otpEmail: '', otpSms: '', isFaceMatched: false
    });

    const togglePinInput = () => {
        if (devMode) return;
        setShowPinInput(!showPinInput);
    };

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '5454') {
            activateDevMode();
            setShowPinInput(false);
        }
    };

    const activateDevMode = () => {
        setDevMode(true);
        setData({
            fullName: 'محامي تجريبي للنظام',
            email: 'dev_test@hami.app',
            phone: '07700005454',
            password: 'DevPass@5454',
            confirmPassword: 'DevPass@5454',
            lawyerGrade: LAWYER_GRADES[0],
            officeName: 'مكتب حامي للاختبار',
            officeAddress: 'بغداد - المنطقة الخضراء (QA)',
            workProvinces: ['بغداد', 'البصرة'],
            specializations: ['جنائي', 'أحوال شخصية'],
            transactions: ['توكيل عام', 'ترافع'],
            idFront: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            idBack: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            syndicateId: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            ocrVerified: true,
            otpEmail: '9021',
            otpSms: '123456',
            isFaceMatched: true
        });
        setTermsScrolled(true);
    };

    const handleSelection = (field: 'workProvinces' | 'specializations' | 'transactions', item: string) => {
        setData(prev => {
            const list = prev[field];
            if (item === 'ALL') return { ...prev, [field]: list.includes('ALL') ? [] : ['ALL'] };
            if (list.includes('ALL')) return { ...prev, [field]: [item] };
            return { ...prev, [field]: list.includes(item) ? list.filter(i => i !== item) : [...list, item] };
        });
    };

    const performOCRScan = () => {
        if (!data.idFront || !data.idBack) return;
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            if (devMode || (data.fullName && data.fullName.length >= 5)) {
                setData(prev => ({ ...prev, ocrVerified: true }));
            } else {
                SmartToast.error("فشل المطابقة الآلية: الاسم في الهوية لا يطابق الاسم المدخل.");
            }
        }, 1500);
    };

    const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 20) {
            setTermsScrolled(true);
        }
    };

    const openMap = async () => {
        const ok = await SmartDialog.confirm("فتح تطبيق الخرائط لتحديد الموقع؟");
        if (ok) {
            setTimeout(() => {
                setData({ ...data, officeAddress: "بغداد - الكرادة - شارع 62 (تم التحديد)" });
            }, 1000);
        }
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!data.fullName || !data.email || !data.password) {
                SmartToast.error("يرجى ملء كافة البيانات");
                return;
            }

            const nameParts = data.fullName.trim().split(/\s+/);
            const isNameArabic = /^[\u0600-\u06FF\s]+$/.test(data.fullName);

            if (nameParts.length < 3 || !isNameArabic) {
                SmartToast.error("الاسم غير مقبول: يجب إدخال الاسم الثلاثي كاملاً وبالأحرف العربية فقط.");
                return;
            }

            if (!IRAQI_PHONE_REGEX.test(data.phone)) {
                SmartToast.error("عذراً، الرقم غير معرف ضمن الشبكات العراقية المعتمدة (زين، آسيا، كورك).");
                return;
            }

            const domain = data.email.split('@')[1]?.toLowerCase();
            const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'hami.app'];
            if (!allowedDomains.includes(domain)) {
                SmartToast.error("نطاق البريد الإلكتروني غير مدعوم. يرجى استخدام (Gmail, Yahoo, Outlook, iCloud).");
                return;
            }

            if (data.password.length < 8) {
                SmartToast.error("كلمة المرور ضعيفة (يجب أن تكون 8 رموز على الأقل).");
                return;
            }
            if (data.password !== data.confirmPassword) {
                SmartToast.error("كلمات المرور غير متطابقة.");
                return;
            }
        }
        if (step === 2 && (!data.lawyerGrade || !data.officeName || data.specializations.length === 0)) {
            SmartToast.error("يرجى إكمال البيانات المهنية");
            return;
        }
        if (step === 3 && !data.ocrVerified) { performOCRScan(); return; }
        if (step === 4 && (data.otpEmail !== (devMode ? '9021' : 'REAL') || data.otpSms !== (devMode ? '123456' : 'REAL'))) {
            SmartToast.error("رمز التحقق غير صحيح");
            return;
        }

        if (step < 6) setStep(prev => (prev + 1) as Step);
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4 pt-2">
                        <div className="flex gap-3 items-start p-4 bg-orange-500/5 border border-orange-500/30 rounded-xl mb-2">
                            <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={20} />
                            <p className="text-xs text-orange-200/90 leading-relaxed font-medium">
                                يرجى التأكد من دقة المعلومات ومطابقتها للمستندات الرسمية لتجنب المشاكل التقنية والقانونية.
                            </p>
                        </div>
                        <StackInputField label="الاسم الثلاثي واللقب" icon={User} value={data.fullName} onChange={(e) => setData({ ...data, fullName: e.target.value })} showClear onClear={() => setData({ ...data, fullName: '' })} />
                        <StackInputField label="رقم الهاتف" icon={Phone} type="tel" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} showClear onClear={() => setData({ ...data, phone: '' })} />
                        <StackInputField label="البريد الإلكتروني" icon={Mail} type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} showClear onClear={() => setData({ ...data, email: '' })} />
                        <StackInputField label="كلمة المرور" icon={Lock} isPassword value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} />
                        <StackInputField label="تأكيد كلمة المرور" icon={Check} isPassword value={data.confirmPassword} onChange={(e) => setData({ ...data, confirmPassword: e.target.value })} />
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                        <button type="button" onClick={() => setActiveSheet('grade')} className="w-full text-right group">
                            <label className="text-sm text-[#D4AF37] mb-2 block font-bold group-hover:text-white transition-colors">درجة الصلاحية</label>
                            <div className="w-full p-4 rounded-xl border border-white/10 bg-white/5 flex justify-between items-center text-white group-hover:border-[#D4AF37]/50 transition">
                                <span>{data.lawyerGrade || 'اختر الصلاحية'}</span>
                                <ChevronLeft size={16} className="text-gray-400" />
                            </div>
                        </button>
                        <GlassCard className="p-5 space-y-4 border-[#D4AF37]/20 bg-[#001830]/40">
                            <StackInputField label="اسم المكتب" icon={Building2} value={data.officeName} onChange={(e) => setData({ ...data, officeName: e.target.value })} showClear onClear={() => setData({ ...data, officeName: '' })} />
                            <div onClick={openMap}>
                                <StackInputField label="الموقع / العنوان" icon={MapPin} value={data.officeAddress} readOnly className="cursor-pointer hover:bg-white/10" placeholder="اضغط لفتح الخرائط وتحديد الموقع..." />
                            </div>
                        </GlassCard>
                        <div className="space-y-4">
                            <button type="button" onClick={() => setActiveSheet('provinces')} className="w-full text-right group">
                                <label className="text-sm text-[#D4AF37] font-bold mb-2 block group-hover:text-white transition-colors">نطاق العمل الجغرافي</label>
                                <div className="min-h-[50px] p-3 rounded-xl border border-white/10 bg-black/20 flex flex-wrap gap-2 group-hover:border-[#D4AF37]/30 transition-all">
                                    {data.workProvinces.length > 0 ? (
                                        data.workProvinces.includes('ALL')
                                            ? <span className="bg-[#D4AF37] text-[#00102A] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Crown size={12} /> جميع المحافظات</span>
                                            : data.workProvinces.slice(0, 4).map(p => <span key={p} className="bg-[#001830] border border-[#D4AF37]/30 text-white text-xs px-3 py-1.5 rounded-lg">{p}</span>)
                                    ) : <span className="text-gray-500 text-xs py-1.5">اضغط للاختيار...</span>}
                                    {data.workProvinces.length > 4 && !data.workProvinces.includes('ALL') && <span className="text-gray-500 text-xs py-1.5">+{data.workProvinces.length - 4}</span>}
                                </div>
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setActiveSheet('specs')} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-[#D4AF37]/50 transition text-right">
                                    <div className="flex justify-between items-start mb-2"><Gavel className="text-[#D4AF37]" size={20} />{data.specializations.length > 0 && <BadgeCheck className="text-green-500" size={16} />}</div>
                                    <span className="text-sm font-bold text-white block">التخصصات</span>
                                    <span className="text-[10px] text-gray-400 block mt-1">{data.specializations.length} محدد</span>
                                </button>
                                <button type="button" onClick={() => setActiveSheet('trans')} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-[#D4AF37]/50 transition text-right">
                                    <div className="flex justify-between items-start mb-2"><FileText className="text-[#D4AF37]" size={20} />{data.transactions.length > 0 && <BadgeCheck className="text-green-500" size={16} />}</div>
                                    <span className="text-sm font-bold text-white block">المعاملات</span>
                                    <span className="text-[10px] text-gray-400 block mt-1">{data.transactions.length} محدد</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );

            case 3:
                return (
                    <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                        <DocumentUploader label="البطاقة الوطنية (الوجه الأمامي)" value={data.idFront} devMode={devMode} onUpload={(img: string) => setData({ ...data, idFront: img })} />
                        <DocumentUploader label="البطاقة الوطنية (الوجه الخلفي)" value={data.idBack} devMode={devMode} onUpload={(img: string) => setData({ ...data, idBack: img })} />
                        <DocumentUploader label="هوية النقابة (نافذة الصلاحية)" value={data.syndicateId} devMode={devMode} onUpload={(img: string) => setData({ ...data, syndicateId: img })} />
                        {data.ocrVerified ? (
                            <div className="flex items-center gap-2 justify-center text-green-400 bg-green-900/20 p-2 rounded-lg border border-green-500/20"><Check size={16} /> <span>تمت مطابقة البيانات بنجاح</span></div>
                        ) : (
                            <button type="button" onClick={performOCRScan} disabled={loading || !data.idFront} className="w-full py-3 bg-[#D4AF37]/10 border border-[#D4AF37] rounded-xl text-[#D4AF37] font-bold flex items-center justify-center gap-2 disabled:opacity-50">{loading ? 'جاري الفحص...' : 'بدء الفحص الآلي للمطابقة'}</button>
                        )}
                    </motion.div>
                );

            case 4:
                return (
                    <motion.div key="step4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                        <StackInputField label="رمز البريد (4 أرقام)" icon={Mail} value={data.otpEmail} onChange={(e) => setData({ ...data, otpEmail: e.target.value })} className="text-center tracking-[12px] font-mono text-xl" maxLength={4} placeholder="- - - -" />
                        <StackInputField label="رمز الرسائل (SMS)" icon={Smartphone} value={data.otpSms} onChange={(e) => setData({ ...data, otpSms: e.target.value })} className="text-center tracking-[8px] font-mono text-xl" maxLength={6} placeholder="- - - - - -" />
                        <div className="w-full h-[1px] bg-white/10 my-4" />
                        <div className="space-y-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><ScanFace className="text-[#D4AF37]" /> مطابقة الوجه (AI)</h3>
                            {data.isFaceMatched ? (
                                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-center text-green-400 gap-2"><Check size={20} strokeWidth={3} /><span className="font-bold">تمت المطابقة بنجاح</span></div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <button type="button" onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); setData(prev => ({ ...prev, isFaceMatched: true })); }, 1500); }} disabled={loading} className="w-24 h-24 rounded-full border-4 border-[#D4AF37] border-dashed flex items-center justify-center relative overflow-hidden group hover:bg-[#D4AF37]/5 transition-all"><ScanFace size={32} className="text-[#D4AF37]" /></button>
                                    <p className="text-[10px] text-gray-400 text-center">اضغط للمطابقة البيومترية</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                );

            case 5:
                return (
                    <motion.div key="step5" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto scrollbar-hide px-1 py-2">
                            <div onScroll={handleTermsScroll} className="bg-[#001020]/80 backdrop-blur-md border border-[#D4AF37]/30 rounded-2xl p-6 shadow-inner min-h-full">
                                <h3 className="text-[#D4AF37] font-bold text-lg mb-4 border-b border-[#D4AF37]/20 pb-2 text-center">{TERMS_TITLE}</h3>
                                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line space-y-4 pb-12">{TERMS_BODY}</div>
                            </div>
                        </div>
                        <div className="shrink-0 bg-[#000818] border-t-2 border-[#D4AF37] p-6 shadow-[0_-10px_50px_rgba(0,0,0,0.9)] z-20 relative mt-2">
                            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none"><Hand size={80} className="text-[#D4AF37]" /></div>
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 min-w-[24px]"><Hand className="text-[#D4AF37]" size={24} /></div>
                                    <div>
                                        <h4 className="text-[#D4AF37] font-bold text-sm mb-1">القسم القانوني الملزم</h4>
                                        <p className="text-white/90 font-medium text-xs leading-relaxed text-justify">{LAWYER_PLEDGE}</p>
                                    </div>
                                </div>
                                <div className={`transition-all duration-500 ${!termsScrolled ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                                    <GoldButton fullWidth onClick={handleNext} icon={Check}>
                                        {termsScrolled ? "أوافق وأتعهد (مفعل)" : "يرجى قراءة الشروط بالكامل أولاً..."}
                                    </GoldButton>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case 6:
                return (
                    <motion.div key="step6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center space-y-8 pt-10">
                        <div className="w-24 h-24 rounded-full bg-[#D4AF37]/10 border-2 border-[#D4AF37] flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.3)]"><Fingerprint size={48} className="text-[#D4AF37]" /></div>
                        <div className="text-center space-y-3"><h2 className="text-2xl font-bold text-white">تم إنشاء الحساب بنجاح</h2><p className="text-gray-400 text-sm max-w-xs mx-auto">هل ترغب بتفعيل الدخول السريع عبر بصمة الوجه أو الإصبع؟</p></div>
                        <GlassCard className="w-full p-6 border-[#D4AF37]/30">
                            <div className="flex items-center gap-4 mb-6"><div className="p-3 bg-[#001830] rounded-xl border border-white/10"><ScanFace className="text-[#D4AF37]" /></div><div><h4 className="font-bold text-white">تأمين الحساب (Biometrics)</h4><p className="text-[10px] text-gray-500">متوافق مع FaceID & TouchID</p></div></div>
                            {biometricsEnabled ? (
                                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-center gap-2 text-green-400"><ShieldCheck size={20} /><span className="font-bold text-sm">تم تفعيل الحماية البيومترية</span></div>
                            ) : (
                                <GoldButton fullWidth onClick={() => setBiometricsEnabled(true)} icon={Key}>تفعيل الدخول ببصمة الوجه</GoldButton>
                            )}
                        </GlassCard>
                        <button type="button" onClick={onComplete} className="text-gray-500 text-sm hover:text-white transition">تخطي والدخول للتطبيق</button>
                    </motion.div>
                );
        }
    };

    return (
        <div className="flex flex-col h-full relative z-10 text-right" dir="rtl">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <img src={EagleLogoPlaceholder} alt="Hami Logo" className="h-16 w-auto drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] object-contain select-none pointer-events-none" />
                    <div>
                        <h2 className="text-xl font-bold text-white">توثيق المحامي</h2>
                        <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`h-1 rounded-full transition-all ${i <= step ? 'w-6 bg-[#D4AF37]' : 'w-2 bg-white/10'}`} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 relative">
                    <AnimatePresence>
                        {showPinInput && !devMode && (
                            <motion.input
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 80, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                autoFocus type="password" maxLength={4} placeholder="PIN"
                                onChange={handlePinChange}
                                className="h-8 bg-[#00102A] border border-[#D4AF37] rounded-lg px-2 text-center text-[#D4AF37] text-sm outline-none placeholder-[#D4AF37]/30"
                            />
                        )}
                    </AnimatePresence>
                    <button type="button"
                        onClick={togglePinInput}
                        className={`p-2 rounded-full border transition-all duration-300 ${devMode ? 'bg-[#D4AF37] text-[#00102A] border-[#D4AF37]' : 'bg-transparent border-transparent text-[#D4AF37]/30 hover:text-[#D4AF37]'}`}
                        title={devMode ? "وضع المطور مفعل" : "بوابة المطور"}
                    >
                        {devMode ? <Check size={16} strokeWidth={3} /> : <ShieldCheck size={16} />}
                    </button>
                    {step < 6 && (
                        <button type="button" onClick={step === 1 ? onBack : () => setStep(prev => (prev - 1) as Step)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 border border-white/10"><ArrowRight className="text-white" size={20} /></button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-4 scrollbar-hide px-1">
                <AnimatePresence mode='wait'>
                    {renderStep()}
                </AnimatePresence>
            </div>

            {step < 5 && (
                <div className="bg-[#00102A] p-4 border-t border-white/5">
                    <GoldButton fullWidth onClick={handleNext} className="shadow-[0_0_30px_rgba(212,175,55,0.2)]">متابعة <ChevronLeft size={20} /></GoldButton>
                </div>
            )}

            <AnimatePresence>
                {activeSheet === 'grade' && (
                    <GlassGridSheet isOpen={true} onClose={() => setActiveSheet(null)} title="درجة الصلاحية" items={LAWYER_GRADES} selectedItems={data.lawyerGrade} singleSelect onToggle={(item: string) => { setData({ ...data, lawyerGrade: item }); setActiveSheet(null); }} icon={Scale} />
                )}
                {activeSheet === 'provinces' && (
                    <GlassGridSheet isOpen={true} onClose={() => setActiveSheet(null)} title="محافظات العمل" items={PROVINCES} selectedItems={data.workProvinces} onToggle={(item: string) => handleSelection('workProvinces', item)} allOptionLabel="جميع المحافظات" icon={MapPin} />
                )}
                {activeSheet === 'specs' && (
                    <GlassGridSheet isOpen={true} onClose={() => setActiveSheet(null)} title="التخصصات القضائية" items={SPECIALIZATIONS} selectedItems={data.specializations} onToggle={(item: string) => handleSelection('specializations', item)} allOptionLabel="جميع التخصصات" icon={Gavel} />
                )}
                {activeSheet === 'trans' && (
                    <GlassGridSheet isOpen={true} onClose={() => setActiveSheet(null)} title="أنواع المعاملات" items={TRANSACTIONS} selectedItems={data.transactions} onToggle={(item: string) => handleSelection('transactions', item)} allOptionLabel="جميع المعاملات" icon={FileText} />
                )}
            </AnimatePresence>
        </div>
    );
};
