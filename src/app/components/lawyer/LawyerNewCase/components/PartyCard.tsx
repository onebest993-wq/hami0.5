import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, MapPin, Briefcase } from 'lucide-react';
import { hasBlockedWord } from '../utils';
import type { PartyCardProps } from '../types';

export const PartyCard = ({
    party, index, side, onUpdate, onRemove, canRemove,
    onToggleAgent, labels, currentStage, partyCount, errorMap
}: PartyCardProps) => {
    const isFirst = index === 0;
    const defaultLabel = isFirst ? (side === 1 ? labels.p1Main : labels.p2Main) : (side === 1 ? 'طرف أول (مضاف)' : 'طرف ثاني (مضاف)');
    const displayTitle = defaultLabel;
    const positionErrorKey = isFirst ? (side === 1 ? 'party1_position' : 'party2_position') : null;
    const positionError = positionErrorKey ? errorMap[positionErrorKey] : null;
    const hasError = errorMap[`party_${party.id}`];
    const isBlocked = hasBlockedWord(party.status) || hasBlockedWord(party.name);

    return (
        <div className={`relative ${!isFirst ? 'mt-4 pl-4 border-l-2 border-white/5' : ''}`} id={`party-${party.id}`}>
            <div className="flex items-center justify-end mb-3 px-1">
                {canRemove && (
                    <button type="button" onClick={onRemove} className="w-6 h-6 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all" title="حذف هذا الطرف">
                        <X size={14} />
                    </button>
                )}
            </div>
            <div className="space-y-3">
                {isFirst && (
                    <div className="flex justify-start w-full mb-2 mt-1">
                        <span className="text-xl font-bold text-amber-400 tracking-wide">
                            {party.status} 
                        </span>
                    </div>
                )}
                
                <div className="relative w-full">
                    <input 
                        type="text" 
                        value={party.name} 
                        onChange={(e) => onUpdate('name', e.target.value)} 
                        className={`w-full bg-slate-900/50 border ${hasError || hasBlockedWord(party.name) ? 'border-yellow-500' : 'border-slate-700'} rounded-lg text-white focus:border-[#E6C673] outline-none py-2 pr-3 pl-20 text-base font-medium placeholder-white/50 transition-all`} 
                        placeholder="الاسم الكامل" 
                    />
                    
                    <button 
                        type="button"
                        onClick={() => onToggleAgent(side, party.id)}
                        className={`absolute left-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-all duration-200 ${
                            party.hasLawyer 
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                                : 'bg-transparent text-slate-500 hover:text-slate-300'
                        }`}
                        title={party.hasLawyer ? "إخفاء بيانات المحامي" : "إضافة محامي"}
                    >
                        ⚖️ وكيل
                    </button>
                </div>
                 {hasBlockedWord(party.name) && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة</p>}

                <AnimatePresence>
                    {party.hasLawyer && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 space-y-3"
                        >
                            <div className="flex items-center justify-between border-b border-indigo-500/10 pb-2 mb-2">
                                <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                                    <Briefcase size={12} />
                                    بيانات الوكيل القانوني
                                </h4>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={party.isMyOffice || false}
                                        onChange={(e) => onUpdate('isMyOffice', e.target.checked)}
                                        className="w-4 h-4 rounded border-indigo-500/50 bg-indigo-900/30 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                                    />
                                    <span className={`text-[10px] font-bold transition-colors ${party.isMyOffice ? 'text-indigo-400' : 'text-white/40 group-hover:text-white/60'}`}>
                                        يمثل مكتبي (أنا الوكيل)
                                    </span>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-indigo-200/60 mb-1 block">اسم المحامي</label>
                                    <input 
                                        type="text" 
                                        value={party.lawyerName || ''} 
                                        onChange={(e) => onUpdate('lawyerName', e.target.value)}
                                        disabled={party.isMyOffice}
                                        className={`w-full bg-slate-900/50 border ${party.isMyOffice ? 'border-indigo-500/30 text-indigo-300/50 cursor-not-allowed' : 'border-indigo-500/30 text-indigo-100 focus:border-indigo-400'} rounded-lg px-3 py-2 text-xs outline-none transition-all placeholder-indigo-200/20`}
                                        placeholder={party.isMyOffice ? "(مكتبي)" : "اسم المحامي الوكيل..."}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-indigo-200/60 mb-1 block">رقم الهاتف</label>
                                    <div className="relative">
                                        <Phone size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500/40" />
                                        <input 
                                            type="text" 
                                            value={party.lawyerPhone || ''} 
                                            onChange={(e) => onUpdate('lawyerPhone', e.target.value)}
                                            className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-lg text-indigo-100 focus:border-indigo-400 outline-none pr-8 pl-3 py-2 text-xs transition-all placeholder-indigo-200/20"
                                            placeholder="07xxxxxxxxx" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-4">
                    <div className="flex-1 relative group">
                        <Phone size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-[#E6C673] z-10" />
                        <input type="text" value={party.phone} onChange={(e) => onUpdate('phone', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-[#E6C673] outline-none pr-8 pl-3 py-2 text-xs placeholder-white/50 transition-all" placeholder="رقم الهاتف" />
                    </div>
                    <div className="flex-[1.5] relative group">
                        <MapPin size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-[#E6C673] z-10" />
                        <input type="text" value={party.address} onChange={(e) => onUpdate('address', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-[#E6C673] outline-none pr-8 pl-3 py-2 text-xs placeholder-white/50 transition-all" placeholder="العنوان السكني" />
                    </div>
                </div>
            </div>
        </div>
    );
};
