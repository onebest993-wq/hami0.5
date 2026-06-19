import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Clock, X, Scale, Lock, PauseCircle, Play, Users, Shield, ShieldCheck, Check, ChevronLeft, MapPin, Phone, Briefcase, Gavel, ArrowRightLeft,
} from 'lucide-react';
import { getLegalRole } from '../../LawyerShared';
import { shouldShowAbsentJudgmentFooter } from '../smartFile/absentJudgmentFlow';
import type { CaseStage, IncidentalCase, Party } from '../../LawyerShared';
import { filterHeaderIncidentalCases, groupPartiesForHeader } from '../smartFile/incidentalCaseLinking';
import { resolveDisplayParties } from '../smartFile/resolveDisplayParties';
import { resolveCrossAppealEligibility, type CrossAppealEligibility } from '../smartFile/crossAppealEngine';
import {
    isAffiliativeThirdPartyRole,
    isAppealIntegratedInterpleaderRole,
    isInterpleaderThirdPartyRole,
} from '../smartFile/partyRoleClassification';
import {
    isPlaintiffFavorableFinalDecision,
    isAwaitingOpponentAppeal,
    shouldShowOpponentAppealRegisterButton,
    isAppealStageName,
} from '../smartFile/judgmentTypes';
import { isLockedPriorStage, shouldShowFirstInstancePleadingLockUi } from '../smartFile/stageInit';
import { formatNumberInput } from '@/app/components/lawyer/FinancialOperationsCenter/utils';

import type { PartyItemProps } from './partyItemTypes';

export const PartyItem = ({ party, isEditing, align = 'right', notificationBadge, provisionalOrders = [] }: PartyItemProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showLawyerInfo, setShowLawyerInfo] = useState(false);
    
    // 🔒 Check for Provisional Orders
    const activeOrder = provisionalOrders?.find((o) => o.targetParty === party.name);

    // Helper to get lawyer info from various legacy/new fields
    const lawyerInfo = party.lawyer || 
                       (party.lawyers && party.lawyers[0]) || 
                       (party.hasLawyer ? { name: party.lawyerName, phone: party.lawyerPhone, isMyOffice: party.isMyOffice } : null) ||
                       (party.lawyerName ? { name: party.lawyerName, phone: party.lawyerPhone, isMyOffice: party.isMyOffice } : null);
    const hasLawyer = lawyerInfo && lawyerInfo.name;
    const isMyClient = party.isClient || lawyerInfo?.isMyOffice;

    return (
        <div className="w-full relative">
            <div 
                className={`flex flex-row items-center justify-end gap-2 w-full`}
            >
                
                {isEditing ? (
                     <input 
                        type="text" 
                        defaultValue={party.name} 
                        onChange={(e) => { party.name = e.target.value; }}
                        className="bg-transparent text-sm font-bold text-white w-full border-b border-white/10 pb-1 outline-none min-w-0 text-right"
                    />
                ) : (
                    <div className="flex flex-col w-full"> 
                        {/* ✅ FIX 1: Full Width Layout with Explicit Text Alignment (Spine Aligned) */}
                        <div className={`flex flex-wrap items-center gap-2 w-full ${align === 'left' ? 'justify-end' : 'justify-start'}`}>
                            
                            {/* Name & Badges Inline Container */}
                            <div className={`flex items-center gap-1 ${align === 'left' ? 'flex-row' : 'flex-row-reverse'}`}>
                                {/* Badges First (Left of name in LTR / Right of name in RTL?) 
                                    User asked for Badge immediately next to name.
                                */}
                                
                                <span 
                                    className="text-base font-bold text-white leading-tight break-words select-none cursor-pointer hover:text-indigo-300 transition-colors active:scale-95 inline-block" 
                                    dir="auto"
                                    onClick={() => !isEditing && setIsOpen(!isOpen)}
                                >
                                    {party.name}
                                </span>

                                {activeOrder && (
                                    <span className="inline-block px-2 py-0.5 bg-rose-900/40 border border-rose-500 text-rose-400 text-[10px] font-bold rounded animate-pulse"> 
                                        🔒 {activeOrder.type} 
                                    </span>
                                )}

                                {hasLawyer && (
                                    <div className="flex items-center gap-1 mx-1">
                                        {isMyClient ? (
                                            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.1)]" title="موكلي (مكتبي)">
                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-[10px] font-bold text-emerald-400">موكلي</span>
                                            </div>
                                        ) : (
                                            <button type="button" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowLawyerInfo(!showLawyerInfo);
                                                }}
                                                className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 px-2 py-0.5 rounded-full cursor-pointer hover:bg-slate-700 transition-colors group/lawyer"
                                                title="عرض بيانات وكيل الخصم"
                                            >
                                                <Briefcase className="w-3.5 h-3.5 text-slate-400 group-hover/lawyer:text-amber-400" strokeWidth={2.5} />
                                                <span className="text-[10px] text-slate-400 group-hover/lawyer:text-slate-300">محامي الخصم</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* LAWYER POPOVER */}
            <AnimatePresence>
                {showLawyerInfo && hasLawyer && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className={`absolute z-50 mt-1 p-3 bg-[#1e2536] border border-indigo-500/40 rounded-xl shadow-xl w-64 ${align === 'left' ? 'right-0' : 'left-0'}`}
                    >
                         <div className="flex justify-between items-start mb-2 border-b border-white/10 pb-2">
                            <h4 className="text-indigo-300 font-bold text-xs">
                                {lawyerInfo.isMyOffice ? 'بيانات الموكل (مكتبي)' : 'بيانات وكيل الخصم'}
                            </h4>
                            <button type="button" onClick={() => setShowLawyerInfo(false)} className="text-white/40 hover:text-white"><X size={12} /></button>
                         </div>
                         <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2 text-white/90">
                                <span className="text-white/40">الاسم:</span>
                                <span className="font-bold">{lawyerInfo.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/90">
                                <span className="text-white/40">الهاتف:</span>
                                <a href={`tel:${lawyerInfo.phone}`} className="font-mono text-indigo-400 hover:underline">{lawyerInfo.phone}</a>
                            </div>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && !isEditing && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                         <div className={`bg-black/20 rounded-lg p-2 mt-1 mb-2 border border-white/5 flex flex-col gap-1.5 text-xs ${align === 'left' ? 'items-end' : 'items-start'}`}>
                            
                            {/* Smart Badge Injection Inside Drawer */}
                            {/* notificationBadge code removed as requested */}

                            <div className={`flex items-center gap-2 text-white/60 w-full ${align === 'left' ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                <MapPin size={12} className="shrink-0 text-white/40" />
                                <span className="truncate flex-1">{party.address || 'العنوان غير محدد'}</span>
                            </div>
                            <div className={`flex items-center gap-2 w-full ${align === 'left' ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                <Phone size={12} className="shrink-0 text-indigo-400/70" />
                                {party.phone ? (
                                    <a href={`tel:${party.phone}`} className="text-indigo-400 hover:text-indigo-300 font-mono truncate flex-1" dir="ltr">
                                        {party.phone}
                                    </a>
                                ) : (
                                    <span className="text-white/20 flex-1">لا يوجد رقم هاتف</span>
                                )}
                            </div>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
