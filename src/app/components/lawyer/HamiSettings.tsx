import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Settings, X, Search, Moon, Sun, Bell, BellOff, 
    Type, LayoutGrid, List, Smartphone, Eye, 
    EyeOff, FileText, Zap, Brain, Database, 
    FileSpreadsheet, Archive, MessageCircle, Bug,
    ChevronRight, Lock, Shield, Fingerprint,
    Image as ImageIcon, Move, GripVertical, Check,
    Crown, Sparkles, Trophy, Volume2, VolumeX, Palette
} from 'lucide-react';
import { useAppTheme } from '@/app/context/AppContext';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SectionHeader, SettingCard, SettingRow, Toggle } from './HamiSettings/settings-ui';
import { EXTENDED_THEMES, SECTIONS_ORDER_DEFAULT } from './HamiSettings/config';
import type { HamiSettingsProps, LucideIcon } from '@/app/types/common';

export const HamiSettings = ({ onClose, onOpenArchive, currentTheme, onThemeChange, settingsState, setSettingsState }: HamiSettingsProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sectionOrder, setSectionOrder] = useState(SECTIONS_ORDER_DEFAULT);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setSettingsState((prev) => ({ ...prev, wallpaper: imageUrl }));
            document.body.style.backgroundImage = `url(${imageUrl})`;
            document.body.style.backgroundSize = 'cover';
        }
    };

    const handleAlphaChange = (val: number) => {
        setSettingsState((prev) => ({ ...prev, glassOpacity: val }));
        document.documentElement.style.setProperty('--glass-opacity', val.toString());
    };

    useEffect(() => {
        if (settingsState.privacyBlur) {
            const handleBlur = () => document.body.style.filter = 'blur(10px)';
            const handleFocus = () => document.body.style.filter = 'none';
            window.addEventListener('blur', handleBlur);
            window.addEventListener('focus', handleFocus);
            return () => {
                window.removeEventListener('blur', handleBlur);
                window.removeEventListener('focus', handleFocus);
                document.body.style.filter = 'none';
            };
        }
    }, [settingsState.privacyBlur]);

    const toggleBiometric = async (checked: boolean) => {
        if (checked) {
            try {
                if (typeof window !== 'undefined' && window.isSecureContext && navigator.credentials) {
                    const challenge = new Uint8Array(32);
                    crypto.getRandomValues(challenge);
                    const credential = await navigator.credentials.create({
                        publicKey: {
                            challenge,
                            rp: { name: 'Hami App' },
                            user: {
                                id: crypto.getRandomValues(new Uint8Array(16)),
                                name: 'hami-user',
                                displayName: 'مستخدم حامي'
                            },
                            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
                            authenticatorSelection: { authenticatorAttachment: 'platform' },
                            timeout: 30000
                        }
                    });
                    if (credential) {
                        setSettingsState((prev) => ({ ...prev, biometric: true }));
                        SmartToast.success('✅ تم تفعيل القفل البيومتري بنجاح');
                    }
                } else {
                    SmartToast.info('المصادقة البيومترية متاحة فقط في البيئة الآمنة (HTTPS)');
                    setSettingsState((prev) => ({ ...prev, biometric: false }));
                }
            } catch {
                SmartToast.warning('تعذر تفعيل البصمة - قد لا يدعم الجهاز هذه الميزة');
                setSettingsState((prev) => ({ ...prev, biometric: false }));
            }
        } else {
            setSettingsState((prev) => ({ ...prev, biometric: false }));
            SmartToast.success('✅ تم إلغاء القفل البيومتري');
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[150] bg-[#0B1021] flex flex-col font-sans overflow-hidden"
        >
            <div className="px-6 pt-12 pb-6 bg-[#0B1021]/95 backdrop-blur-xl border-b border-white/5 z-20 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">مركز القيادة</h1>
                        <p className="text-xs text-white/50">Command Center</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="relative group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#E6C673] transition-colors" size={18} />
                    <input 
                        type="text"
                        placeholder="ابحث في الإعدادات العميقة..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white placeholder-white/30 focus:border-[#E6C673] focus:bg-white/10 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-20 scrollbar-hide">
                <SectionHeader title="المحرك البصري (Deep Customization)" icon={Palette} />
                <SettingCard>
                    <div className="p-4 border-b border-white/5">
                        <label className="text-sm font-bold text-white mb-3 block">لوحة الألوان الملكية</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                            {EXTENDED_THEMES.map((theme) => (
                                <button type="button" 
                                    key={theme.id}
                                    onClick={() => onThemeChange(theme.id as any)}
                                    className={`min-w-[48px] h-12 rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all snap-center ${currentTheme === theme.id ? 'border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                    style={{ backgroundColor: `${theme.color}20` }}
                                >
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.color }} />
                                    {currentTheme === theme.id && <Check size={10} className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <SettingRow 
                        icon={ImageIcon} 
                        label="خلفية النظام" 
                        subLabel="تخصيص WindowBackground"
                        action={
                            <>
                                <input type="file" ref={fileInputRef} onChange={handleWallpaperChange} accept="image/*" className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-white transition-colors">
                                    اختر من الاستوديو
                                </button>
                            </>
                        }
                    />

                    <div className="p-4 border-b border-white/5">
                         <div className="flex justify-between mb-2">
                             <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70"><Smartphone size={16} /></div>
                                 <span className="text-sm font-bold text-white">شفافية الزجاج</span>
                             </div>
                             <span className="text-xs font-mono text-[#E6C673]">{Math.round((settingsState.glassOpacity || 0.8) * 100)}%</span>
                         </div>
                         <input 
                            type="range" min="0.2" max="0.95" step="0.05"
                            value={settingsState.glassOpacity || 0.8}
                            onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#E6C673] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_#E6C673]"
                        />
                    </div>

                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                             <span className="text-sm font-bold text-white">ترتيب الواجهة</span>
                             <span className="text-[10px] text-white/40">اسحب للترتيب</span>
                        </div>
                        <div className="space-y-2">
                            {sectionOrder.map((section) => (
                                <div key={section.id} className="bg-white/5 p-2 rounded-lg flex items-center justify-between border border-white/5">
                                    <span className="text-xs text-white">{section.label}</span>
                                    <GripVertical size={14} className="text-white/30" />
                                </div>
                            ))}
                        </div>
                    </div>
                </SettingCard>

                <SectionHeader title="الأدوات الوظيفية (Utilities)" icon={Zap} />
                <SettingCard>
                    <SettingRow 
                        icon={FileText} 
                        label="العلامة المائية (Watermark)" 
                        subLabel="دمج اسم المكتب في جميع الصادرات"
                        action={<Toggle checked={settingsState.watermark} onChange={(v: boolean) => setSettingsState((prev) => ({ ...prev, watermark: v }))} />}
                    />
                    <SettingRow 
                        icon={settingsState.viewMode === 'list' ? List : LayoutGrid} 
                        label="نمط القوائم" 
                        subLabel={settingsState.viewMode === 'list' ? 'بطاقات عريضة (List)' : 'شبكة مضغوطة (Grid)'}
                        action={
                            <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                                <button type="button" onClick={() => setSettingsState((prev) => ({ ...prev, viewMode: 'list' }))} className={`p-1.5 rounded-md transition-all ${settingsState.viewMode === 'list' ? 'bg-[#E6C673] text-black shadow-lg' : 'text-white/30'}`}><List size={14} /></button>
                                <div className="w-px bg-white/10 mx-0.5" />
                                <button type="button" onClick={() => setSettingsState((prev) => ({ ...prev, viewMode: 'grid' }))} className={`p-1.5 rounded-md transition-all ${settingsState.viewMode === 'grid' ? 'bg-[#E6C673] text-black shadow-lg' : 'text-white/30'}`}><LayoutGrid size={14} /></button>
                            </div>
                        }
                    />
                    <SettingRow 
                        icon={Brain} 
                        label="التلخيص التلقائي" 
                        subLabel="اختصار النصوص الطويلة بالذكاء الاصطناعي"
                        isLast
                        action={<Toggle checked={settingsState.autoSummary} onChange={(v: boolean) => setSettingsState((prev) => ({ ...prev, autoSummary: v }))} />}
                    />
                </SettingCard>

                <SectionHeader title="الحماية القصوى (Security Core)" icon={Shield} />
                <SettingCard>
                    <SettingRow 
                        icon={EyeOff} 
                        label="التمويه الأمني (FLAG_SECURE)" 
                        subLabel="منع لقطات الشاشة وتمويه المعاينة"
                        action={<Toggle checked={settingsState.privacyBlur} onChange={(v: boolean) => setSettingsState((prev) => ({ ...prev, privacyBlur: v }))} />}
                    />
                    <SettingRow 
                        icon={Fingerprint} 
                        label="القفل البيومتري" 
                        subLabel="المصادقة ببصمة الوجه/الإصبع عند الفتح"
                        isLast
                        action={<Toggle checked={settingsState.biometric} onChange={toggleBiometric} />}
                    />
                </SettingCard>

                <SectionHeader title="عمليات البيانات" icon={Database} />
                <SettingCard>
                    <SettingRow 
                        icon={FileSpreadsheet} 
                        label="تصدير قاعدة البيانات" 
                        subLabel="JSON (.json)"
                        action={
                            <button type="button" onClick={() => {
                                const data = JSON.stringify(settingsState, null, 2);
                                const blob = new Blob([data], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `hami-backup-${new Date().toISOString().slice(0, 10)}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                                SmartToast.success('✅ تم تصدير الإعدادات بنجاح');
                            }} className="text-[#E6C673] text-xs font-bold hover:underline">تصدير</button>
                        }
                    />
                    <SettingRow 
                        icon={Archive} 
                        label="إدارة الأرشيف" 
                        subLabel="استعادة الملفات المحذوفة"
                        isLast
                        action={
                            <button type="button" onClick={onOpenArchive} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-[#E6C673] hover:text-black transition-colors">
                                <ChevronRight size={16} className="rotate-180" />
                            </button>
                        }
                    />
                </SettingCard>

                <div className="mt-10 mb-6 text-center space-y-2">
                    <p className="text-[10px] text-white/20 font-mono tracking-widest uppercase">Hami OS • v3.0.0 Pro</p>
                    <div className="flex justify-center gap-4">
                        <span className="text-[10px] text-white/30 border-b border-transparent hover:border-white/30 cursor-pointer">سياسة الخصوصية</span>
                        <span className="text-[10px] text-white/30 border-b border-transparent hover:border-white/30 cursor-pointer">الشروط والأحكام</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
