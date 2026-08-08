import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Scale, ChevronLeft, AlertTriangle,
    User, Users, Scroll, Gavel, FileText,
    ArrowRight, Info, Minus, Plus, Wallet,
    Landmark, Trees, ShieldCheck, Search, Sparkles, Banknote,
    Smartphone, Send, Share2
} from '@/app/components/ui/lucideIcons';
import { toast } from 'sonner';
import { IraqiInheritanceCalculator, AssetType, Sect, HeirInput, CalculationResult } from '@/app/core/IraqiInheritanceLogic';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { TriageCard } from './SmartInheritanceCalculator/components/TriageCard';
import { HeirsCard } from './SmartInheritanceCalculator/components/HeirsCard';
import { EstateCard } from './SmartInheritanceCalculator/components/EstateCard';
import { ActionResultCard } from './SmartInheritanceCalculator/components/ActionResultCard';

export const SmartInheritanceCalculator = ({ onClose }: { onClose: () => void }) => {
    const [step, setStep] = useState<'input' | 'result'>('input');
    const [assetType, setAssetType] = useState<AssetType>('movable');
    const [sect, setSect] = useState<Sect>('jafari');
    const [estateUnit, setEstateUnit] = useState<'cash' | 'area' | 'shares'>('cash');
    const [estateValue, setEstateValue] = useState<string>('');
    const [isSpotlightEnabled, setIsSpotlightEnabled] = useState(false);
    const [spotlightData, setSpotlightData] = useState({ name: '', role: 'wife' });
    const [showAllHeirs, setShowAllHeirs] = useState(false);
    const [showPhoneInput, setShowPhoneInput] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [heirs, setHeirs] = useState<HeirInput[]>([
        { type: 'wife', count: 0, isAlive: true },
        { type: 'husband', count: 0, isAlive: true },
        { type: 'son', count: 0, isAlive: true },
        { type: 'daughter', count: 0, isAlive: true },
        { type: 'father', count: 0, isAlive: false },
        { type: 'mother', count: 0, isAlive: false },
        { type: 'son_son', count: 0, isAlive: true },
        { type: 'son_daughter', count: 0, isAlive: true },
    ]);
    const [result, setResult] = useState<CalculationResult | null>(null);

    const updateHeirCount = (type: string, delta: number) => {
        setHeirs(prev => prev.map(h => {
            if (h.type !== type) return h;
            if (type === 'husband' && delta > 0) {
                const other = prev.find(x => x.type === 'wife');
                if (other && other.count > 0) return h;
            }
            if (type === 'wife' && delta > 0) {
                const other = prev.find(x => x.type === 'husband');
                if (other && other.count > 0) return h;
            }
            const newCount = Math.max(0, h.count + delta);
            if (type === 'wife' && newCount > 4) return h;
            if (['husband', 'father', 'mother'].includes(type) && newCount > 1) return h;
            return { ...h, count: newCount };
        }));
    };

    const toggleAlive = (type: string) => {
        setHeirs(prev => prev.map(h => h.type === type ? { ...h, isAlive: !h.isAlive } : h));
    };

    const handleCalculate = () => {
        const logicInput = heirs.map(h => {
            if (['father', 'mother'].includes(h.type)) {
                return { ...h, count: h.isAlive ? 1 : 0 };
            }
            return h;
        });
        const res = IraqiInheritanceCalculator.calculate(assetType, sect, logicInput);
        setResult(res);
        setStep('result');
        setShowAllHeirs(!isSpotlightEnabled);
    };

    const handleDragEnd = (_event: any, info: any) => {
        if (info.offset.x > 100 || info.offset.x < -100) {
            setStep('input');
        }
    };

    const sendToPhone = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            toast.error("يرجى إدخال رقم هاتف صحيح");
            return;
        }
        setIsSending(true);
        try {
            const summary = `نتائج القسام الشرعي (${result?.category}):\nالمسألة من: ${result?.finalBase}\nعدد الورثة: ${result?.shares.length}`;
            const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/comms-dispatcher`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                    to: phoneNumber,
                    message: summary,
                    channel: 'sms'
                })
            });
            if (response.ok) {
                toast.success("تم إرسال النتائج إلى هاتفك بنجاح");
                setShowPhoneInput(false);
            } else {
                toast.error("فشل الإرسال. تأكد من صحة الرقم.");
            }
        } catch {
            toast.error("حدث خطأ في الاتصال");
        } finally {
            setIsSending(false);
        }
    };

    const formatInput = (val: string, unit: 'cash' | 'area' | 'shares') => {
        let clean = val.replace(/[^\d.]/g, '');
        const parts = clean.split('.');
        if (parts.length > 2) {
            clean = parts[0] + '.' + parts.slice(1).join('');
        }
        if (unit === 'area') return clean;
        if (unit === 'cash' || unit === 'shares') {
            const number = clean.split('.')[0];
            return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        return clean;
    };

    const getCleanNumber = (val: string) => parseFloat(val.replace(/,/g, '') || '0');

    const getUnitLabel = (unit: 'cash' | 'area' | 'shares') => {
        switch (unit) {
            case 'cash': return 'د.ع';
            case 'area': return 'م²';
            case 'shares': return 'سهم';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#151822] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#151822] z-50 shrink-0">
                <button type="button" onClick={step === 'result' ? () => setStep('input') : onClose} className="p-2 -mr-2 text-white/50 hover:text-white rounded-full hover:bg-white/5">
                    <ChevronLeft size={28} />
                </button>
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-white">الحاسبة الإرثية</h1>
                    <Scale size={20} className="text-[#E6C673]" />
                </div>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-24 custom-scrollbar">
                <AnimatePresence mode="wait">
                    {step === 'input' ? (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <TriageCard
                                assetType={assetType}
                                sect={sect}
                                onAssetTypeChange={setAssetType}
                                onSectChange={setSect}
                            />

                            <HeirsCard
                                heirs={heirs}
                                onUpdateCount={updateHeirCount}
                                onToggleAlive={toggleAlive}
                            />

                            <EstateCard
                                estateUnit={estateUnit}
                                estateValue={estateValue}
                                isSpotlightEnabled={isSpotlightEnabled}
                                spotlightData={spotlightData}
                                onEstateUnitChange={(u) => {
                                    setEstateUnit(u);
                                    if (u === 'shares') setEstateValue('2,400');
                                    else setEstateValue('');
                                }}
                                onEstateValueChange={setEstateValue}
                                onSpotlightToggle={() => {
                                    setIsSpotlightEnabled(!isSpotlightEnabled);
                                    if (!isSpotlightEnabled) setSpotlightData(prev => ({ ...prev, role: 'wife' }));
                                }}
                                onSpotlightDataChange={setSpotlightData}
                                formatInput={formatInput}
                                getUnitLabel={getUnitLabel}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={handleDragEnd}
                            className="space-y-4 touch-pan-y"
                        >
                            <ActionResultCard
                                result={result}
                                showAllHeirs={showAllHeirs}
                                showPhoneInput={showPhoneInput}
                                phoneNumber={phoneNumber}
                                isSending={isSending}
                                estateUnit={estateUnit}
                                estateValue={estateValue}
                                isSpotlightEnabled={isSpotlightEnabled}
                                spotlightData={spotlightData}
                                heirs={heirs}
                                onToggleShowAll={() => setShowAllHeirs(!showAllHeirs)}
                                onPhoneInputToggle={() => setShowPhoneInput(!showPhoneInput)}
                                onSetShowPhoneInput={setShowPhoneInput}
                                onPhoneNumberChange={setPhoneNumber}
                                onSendToPhone={sendToPhone}
                                getCleanNumber={getCleanNumber}
                                formatInput={formatInput}
                                getUnitLabel={getUnitLabel}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {step === 'input' && (
                <div className="absolute bottom-8 left-6 right-6 z-50">
                    <button type="button"
                        onClick={handleCalculate}
                        className="w-full bg-[#E6C673] text-[#0B1021] font-bold py-4 rounded-xl shadow-[0_10px_30px_rgba(230,198,115,0.3)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 text-lg"
                    >
                        <span>إصدار القسام الشرعي</span>
                        <Scale size={20} className="fill-current" />
                    </button>
                </div>
            )}
        </div>
    );
};

