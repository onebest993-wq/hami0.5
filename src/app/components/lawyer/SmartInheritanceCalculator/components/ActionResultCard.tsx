import React from 'react';
import { motion } from 'motion/react';
import { User, Minus, ShieldCheck, FileText, Smartphone, Send, ChevronDown } from 'lucide-react';
import type { CalculationResult } from '@/app/core/IraqiInheritanceLogic';

interface HeirEntry {
    type: string;
    count: number;
    isAlive: boolean;
}

interface ActionResultCardProps {
    result: CalculationResult | null;
    showAllHeirs: boolean;
    showPhoneInput: boolean;
    phoneNumber: string;
    isSending: boolean;
    estateUnit: 'cash' | 'area' | 'shares';
    estateValue: string;
    isSpotlightEnabled: boolean;
    spotlightData: { name: string; role: string };
    heirs: HeirEntry[];
    onToggleShowAll: () => void;
    onPhoneInputToggle: () => void;
    onSetShowPhoneInput: (v: boolean) => void;
    onPhoneNumberChange: (v: string) => void;
    onSendToPhone: () => void;
    getCleanNumber: (val: string) => number;
    formatInput: (val: string, unit: 'cash' | 'area' | 'shares') => string;
    getUnitLabel: (unit: 'cash' | 'area' | 'shares') => string;
}

const SpotlightCard: React.FC<{
    result: CalculationResult;
    estateUnit: 'cash' | 'area' | 'shares';
    estateValue: string;
    spotlightData: { name: string; role: string };
    heirs: HeirEntry[];
    showAllHeirs: boolean;
    onToggleShowAll: () => void;
    getCleanNumber: (val: string) => number;
    formatInput: (val: string, unit: 'cash' | 'area' | 'shares') => string;
    getUnitLabel: (unit: 'cash' | 'area' | 'shares') => string;
}> = ({ result, estateUnit, estateValue, spotlightData, heirs, showAllHeirs, onToggleShowAll, getCleanNumber, formatInput, getUnitLabel }) => {
    const totalEstate = getCleanNumber(estateValue);
    const valuePerShare = totalEstate > 0 && result.finalBase ? totalEstate / result.finalBase : 0;
    const role = spotlightData.role;
    const heirCountObj = heirs.find(h => h.type === role);
    const count = heirCountObj?.count || 1;

    let targetShare = null;
    if (role === 'wife') targetShare = result.shares.find(s => s.heirName.includes('زوجة'));
    else if (role === 'husband') targetShare = result.shares.find(s => s.heirName.includes('زوج'));
    else if (role === 'father') targetShare = result.shares.find(s => s.heirName.includes('أب'));
    else if (role === 'mother') targetShare = result.shares.find(s => s.heirName.includes('أم'));
    else if (role === 'son') targetShare = result.shares.find(s => s.heirName.includes('أبناء'));
    else if (role === 'daughter') targetShare = result.shares.find(s => s.heirName.includes('بنات'));

    if (!targetShare) return null;

    const individualStocks = targetShare.stocks / count;
    const individualValue = valuePerShare * individualStocks;

    return (
        <div className="bg-[#E6C673]/10 rounded-3xl p-6 border border-[#E6C673] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-[#E6C673] blur-[60px] opacity-20" />

            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#E6C673] text-[#0B1021] flex items-center justify-center">
                    <User size={24} />
                </div>
                <div>
                    <div className="text-[#E6C673] text-xs font-bold uppercase tracking-wider">بطاقة الوارث</div>
                    <h3 className="text-white font-bold text-lg">{spotlightData.name || 'وارث محدد'} <span className="text-white/50 text-sm">({targetShare.heirName.split('(')[0].trim()})</span></h3>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[#0B1021]/50 rounded-xl p-3 border border-[#E6C673]/20">
                    <div className="text-white/50 text-[10px]">الحصة الشرعية</div>
                    <div className="text-white font-bold">{targetShare.fraction}</div>
                </div>
                <div className="bg-[#0B1021]/50 rounded-xl p-3 border border-[#E6C673]/20">
                    <div className="text-white/50 text-[10px]">الأسهم</div>
                    <div className="text-white font-bold">{Number.isInteger(individualStocks) ? individualStocks : individualStocks.toFixed(2)} سهم</div>
                </div>
            </div>

            {totalEstate > 0 && (
                <div className="bg-[#E6C673] text-[#0B1021] rounded-2xl p-4 text-center shadow-lg">
                    <div className="text-[#0B1021]/60 text-xs font-bold mb-1 uppercase">
                        {estateUnit === 'cash' ? 'قيمة الحصة المالية' : 'القيمة المستحقة'}
                    </div>
                    <div className="text-2xl font-black font-mono tracking-tight">
                        {estateUnit === 'cash'
                            ? formatInput(individualValue.toFixed(0), 'cash')
                            : individualValue.toFixed(2).replace(/\.00$/, '')
                        }
                        <span className="text-sm font-bold"> {getUnitLabel(estateUnit)}</span>
                    </div>
                </div>
            )}

            {!showAllHeirs && (
                <button type="button"
                    onClick={onToggleShowAll}
                    className="w-full mt-4 text-[#E6C673] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-80"
                >
                    عرض تفاصيل باقي الورثة
                    <ChevronDown size={14} />
                </button>
            )}
        </div>
    );
};

export const ActionResultCard: React.FC<ActionResultCardProps> = ({
    result, showAllHeirs, showPhoneInput, phoneNumber, isSending,
    estateUnit, estateValue, isSpotlightEnabled, spotlightData, heirs,
    onToggleShowAll, onSetShowPhoneInput, onPhoneNumberChange, onSendToPhone,
    getCleanNumber, formatInput, getUnitLabel,
}) => {
    if (!result) return null;

    return (
        <motion.div
            key="result"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 touch-pan-y"
        >
            {isSpotlightEnabled && (
                <SpotlightCard
                    result={result}
                    estateUnit={estateUnit}
                    estateValue={estateValue}
                    spotlightData={spotlightData}
                    heirs={heirs}
                    showAllHeirs={showAllHeirs}
                    onToggleShowAll={onToggleShowAll}
                    getCleanNumber={getCleanNumber}
                    formatInput={formatInput}
                    getUnitLabel={getUnitLabel}
                />
            )}

            {(!isSpotlightEnabled || showAllHeirs) && (
                <motion.div
                    initial={isSpotlightEnabled ? { height: 0, opacity: 0 } : undefined}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-[#25293C] rounded-3xl overflow-hidden border border-[#E6C673]/20 shadow-2xl relative"
                >
                    <div className="absolute inset-0 bg-[#E6C673]/5 pointer-events-none mix-blend-overlay" />

                    <div className="bg-[#1A1E2E] p-6 text-center border-b border-[#E6C673]/20 relative">
                        {isSpotlightEnabled && (
                            <button type="button" onClick={onToggleShowAll} className="absolute top-4 right-4 text-white/30 hover:text-white">
                                <Minus size={16} />
                            </button>
                        )}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-[#E6C673]" />
                        <h2 className="text-[#E6C673] font-bold text-lg mb-1">{result.category}</h2>
                        <p className="text-white/50 text-xs">وفقاً للقوانين العراقية النافذة 2026</p>

                        <div className="flex justify-center gap-6 mt-6">
                            <div className="bg-[#0B1021] border border-[#E6C673]/30 px-6 py-3 rounded-xl">
                                <div className="text-white/50 text-[10px] mb-1 uppercase">أصل المسألة</div>
                                <div className="text-2xl font-bold text-white font-mono">{result.base}</div>
                            </div>
                            {result.finalBase !== result.base && (
                                <div className="bg-[#0B1021] border border-[#E6C673]/30 px-6 py-3 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-[#E6C673] text-black text-[8px] px-2 font-bold">تصحيح</div>
                                    <div className="text-white/50 text-[10px] mb-1 uppercase">المصحح</div>
                                    <div className="text-2xl font-bold text-[#E6C673] font-mono">{result.finalBase}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 space-y-3">
                        {result.shares.map((share, idx) => {
                            const totalEstate = getCleanNumber(estateValue);
                            const valuePerShare = totalEstate > 0 && result.finalBase ? totalEstate / result.finalBase : 0;
                            const shareValue = valuePerShare * share.stocks;

                            return (
                                <div key={idx} className="bg-[#1A1E2E] p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 rounded-full bg-[#E6C673]" />
                                                <span className="text-white font-bold">{share.heirName}</span>
                                            </div>
                                            <div className="text-white/50 text-xs flex items-center gap-2">
                                                <span className="bg-white/5 px-2 py-0.5 rounded text-[10px]">{share.fraction}</span>
                                                {share.note && <span className="text-[#E6C673] text-[10px]">{share.note}</span>}
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xl font-bold text-white font-mono">{share.stocks.toFixed(2).replace(/\.00$/, '')}</div>
                                            <div className="text-[10px] text-white/30">سهم</div>
                                        </div>
                                    </div>

                                    {totalEstate > 0 && (
                                        <div className="pt-2 mt-1 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] text-white/40">
                                                {estateUnit === 'cash' ? 'القيمة المالية' : 'القيمة المستحقة'}
                                            </span>
                                            <span className="text-[#E6C673] font-mono font-bold text-sm">
                                                {estateUnit === 'cash'
                                                    ? formatInput(shareValue.toFixed(0), 'cash')
                                                    : shareValue.toFixed(2).replace(/\.00$/, '')
                                                } {getUnitLabel(estateUnit)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {result.messages && result.messages.length > 0 && (
                        <div className="p-4 m-4 mt-0 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                            <ShieldCheck className="text-blue-400 shrink-0 mt-0.5" size={18} />
                            <div className="space-y-1">
                                {result.messages.map((msg, i) => (
                                    <p key={i} className="text-blue-200 text-xs leading-relaxed">{msg}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-[#1A1E2E] border-t border-white/5 space-y-3">
                        {!showPhoneInput ? (
                            <div className="flex gap-3">
                                <button type="button" className="flex-1 bg-[#E6C673] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#D4B360]">
                                    <FileText size={18} />
                                    تصدير PDF
                                </button>
                                <button type="button"
                                    onClick={() => onSetShowPhoneInput(true)}
                                    className="px-4 bg-white/10 text-white font-bold rounded-xl flex items-center justify-center hover:bg-white/20"
                                >
                                    <Smartphone size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="bg-[#0B1021] p-3 rounded-xl border border-[#E6C673]/30">
                                <label className="text-[10px] text-[#E6C673] mb-2 block font-bold">إرسال النتائج للهاتف</label>
                                <div className="flex gap-2">
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => onPhoneNumberChange(e.target.value)}
                                        placeholder="0770..."
                                        className="flex-1 bg-transparent border-b border-white/10 text-white text-sm py-2 focus:border-[#E6C673] outline-none"
                                        dir="ltr"
                                    />
                                    <button type="button"
                                        onClick={onSendToPhone}
                                        disabled={isSending}
                                        className="bg-[#E6C673] text-black px-3 rounded-lg flex items-center justify-center disabled:opacity-50"
                                    >
                                        {isSending ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send size={16} />}
                                    </button>
                                    <button type="button"
                                        onClick={() => onSetShowPhoneInput(false)}
                                        className="text-white/50 px-2 hover:text-white"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};
