import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Clock, Calendar, Paperclip, CheckSquare, FileText, Trash2, X, Plus, Wallet,
    DollarSign, Scale, TrendingUp, AlertTriangle, RotateCcw, MoreHorizontal, Lock, Edit3, PauseCircle, Play, Users, Shield, ShieldCheck, Check, Search as SearchIcon, ChevronDown, ChevronLeft, MapPin, Phone, Briefcase, Sparkles, MessageCircle, Gavel, ArrowRightLeft
} from 'lucide-react';
import { getLegalRole } from '../../LawyerShared';
import { CommandCenterMenu } from '../CommandCenterMenu';

interface PartyItemProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    party: any;
    isEditing: boolean;
    align?: 'right' | 'left';
    notificationBadge?: React.ReactNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provisionalOrders?: any[];
}

const PartyItem = ({ party, isEditing, align = 'right', notificationBadge, provisionalOrders = [] }: PartyItemProps) => {
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

interface SmartHeaderProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData: any;
    onToggleClient?: () => void;
    isPaused?: boolean;
    incidentalCases?: unknown[];
    stages?: unknown[];
    currentStageId?: string;
    pauseReason?: string;
    onResume?: () => void;
    onPause?: () => void;
    status?: string;
    isInterrupted?: boolean;
    interruptionData?: unknown;
    linkedCaseNo?: string;
    onInterrupt?: () => void;
    onAbandon?: () => void;
    onNotification?: () => void;
    onStageClick?: (id: string) => void;
    stageHistory?: unknown[];
    isReadOnly?: boolean;
    hasCrossAppeal?: boolean;
    onCancelCrossAppeal?: () => void;
    onAddCrossAppeal?: () => void;
    notificationStatus?: string;
    onToggleNotification?: () => void;
    caseType?: string;
    isExpertMode?: boolean;
    onToggleExpertMode?: () => void;
    onCassationDecision?: (type: string) => void;
    isPleadingsClosed?: boolean;
    wasReopened?: boolean;
    onClosePleadings?: () => void;
    onReopenPleadings?: () => void;
    onRegisterOpponentAppeal?: () => void;
    hasJudgment?: boolean;
    onDefaultObjection?: () => void;
    onWaiveObjection?: () => void;
    onOtherAppeals?: () => void;
    isUnderObjection?: boolean;
    onObjectionJudgment?: () => void;
    provisionalOrders?: unknown[];
    onAddProvisionalOrder?: () => void;
    thirdParties?: unknown[];
    representedParty?: string | null;
    onExtraordinaryAppeal?: () => void;
    onJudgeRecusal?: () => void;
    onTransferJurisdiction?: () => void;
    onCaseConsolidation?: () => void;
    onAttorneyResignation?: () => void;
    onExecutionTransfer?: () => void;
    onExportPDF?: () => void;
    onMaterialErrorCorrection?: () => void;
    caseData?: Record<string, unknown>;
    currentStage?: Record<string, unknown>;
}

export const SmartHeader = ({ formData, onToggleClient, isPaused, incidentalCases = [], stages = [], currentStageId = '', pauseReason = '', onResume, onPause, status = 'نشطة', isInterrupted = false, interruptionData = null, linkedCaseNo = '', onInterrupt, onAbandon, onNotification, onStageClick, stageHistory = [], isReadOnly = false, hasCrossAppeal = false, onCancelCrossAppeal, onAddCrossAppeal, notificationStatus = 'waiting', onToggleNotification, caseType, isExpertMode = false, onToggleExpertMode, onCassationDecision, isPleadingsClosed = false, wasReopened = false, onClosePleadings, onReopenPleadings, onRegisterOpponentAppeal, hasJudgment = false, onDefaultObjection, onWaiveObjection, onOtherAppeals, isUnderObjection = false, onObjectionJudgment, provisionalOrders = [], onAddProvisionalOrder, thirdParties = [], representedParty = null, onExtraordinaryAppeal, onJudgeRecusal, onTransferJurisdiction, onCaseConsolidation, onAttorneyResignation, onExecutionTransfer, onExportPDF, onMaterialErrorCorrection, caseData, currentStage }: SmartHeaderProps) => {
    // 🛡️ COMPUTE PARTIES DYNAMICALLY (Including Third Parties)
    const thirdPartiesList = formData.parties.filter((p: any) => p.role && p.role.includes('شخص ثالث'));
    const plaintiffs = formData.parties.filter((p: any) => !p.role.includes('شخص ثالث') && (p.role === 'plaintiff' || p.role === 'client' || p.side === 'right'));
    const defendants = formData.parties.filter((p: any) => !p.role.includes('شخص ثالث') && (p.role === 'defendant' || p.role === 'opponent' || p.side === 'left'));

    const [isMenuOpen, setIsMenuOpen] = useState(false); // 🔥 NEW: Dropdown State

    const isDefaultJudgment = formData?.judgmentForm === 'غيابي';

    if (plaintiffs.length === 0 && formData.parties.length > 0) {
        // Fallback only if no explicit role found and no third parties messing up logic
        const p0 = formData.parties[0];
        if (!p0.role.includes('شخص ثالث')) plaintiffs.push(p0);
    }
    if (defendants.length === 0 && formData.parties.length > 1) {
         const p1 = formData.parties[1];
        if (!p1.role.includes('شخص ثالث')) defendants.push(p1);
    }

    // 🛡️ COMPUTE DYNAMIC ROLES (Priority: Extraordinary > Base)
    const activeStage = formData.extraordinaryType || formData.stageName;
    const p1Role = getLegalRole(activeStage, 1, plaintiffs.length);
    const p2Role = getLegalRole(activeStage, 2, defendants.length);

    const notifStatuses = [
        { id: 'waiting', label: '⏳ بانتظار التبليغ', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
        { id: 'in_person', label: '🟢 متبلغ بالذات', color: 'bg-green-500/10 text-green-300 border-green-500/20' },
        { id: 'via_media', label: '🟡 تبليغ إعلامي', color: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
        { id: 'publication', label: '📰 نشر في الجريدة', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' }
    ];
    const currentNotif = notifStatuses.find(s => s.id === notificationStatus) || notifStatuses[0];

    // ✅ Check if this is an Appeal stage OR an Extraordinary Appeal with preserved First Instance data
    const isAppealStage = formData?.stageName?.includes('استئناف') || formData?.stageName?.includes('تمييز') || formData?.extraordinaryType || formData?.extraordinaryAppealType;
    const hasFirstInstanceData = formData?.firstInstanceCaseNumber && formData?.firstInstanceCourt;
    
    // 🔥 CASSATION CHECK
    const isCassation = formData?.stageName === 'التمييز';

    // 🔥 DYNAMIC STYLE
    const containerStyle = isPaused 
        ? "bg-[#0F0F0F] rounded-3xl border-2 border-rose-500/50 mb-2 overflow-hidden shadow-[0_0_30px_rgba(244,63,94,0.15)] relative group/card transition-all"
        : "bg-[#0F0F0F] rounded-3xl border border-[#E6C673]/30 mb-2 overflow-hidden shadow-2xl relative group/card transition-all hover:shadow-[0_0_40px_rgba(230,198,115,0.05)]";

    return (
        <div className={containerStyle}>
            {/* EXPERT MODE GLOW */}
            {isExpertMode && (
                <div className="absolute inset-0 border-2 border-[#E6C673]/30 rounded-3xl pointer-events-none z-50 shadow-[inset_0_0_20px_rgba(230,198,115,0.1)]" />
            )}
            
            {/* HEADER CONTENT - Reduced Padding */}
            <div className="px-3 pt-2.5 pb-1 relative z-10">
                {/* 1. ROW 1: COURT NAME & LOCK BUTTON (Top Bar) */}
                <div className="flex justify-between items-center w-full mb-1 border-b border-slate-800/50 pb-1">
                    {/* Left Side: Lock Button & Extraordinary Menu */}
                    <div className="flex items-center gap-2">
                        {!isCassation && !isReadOnly && !isPleadingsClosed && onClosePleadings && (
                            <button type="button" 
                                onClick={onClosePleadings} 
                                className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium text-[10px] hover:bg-slate-700 hover:text-white transition-all shadow-sm"
                                title="حجز الدعوى للقرار (تجميد الإجراءات)"
                            >
                                <Lock size={10} />
                                <span>حجز الدعوى للقرار</span>
                            </button>
                        )}
                        {/* If Pleadings Closed - Show Status */}
                        {isPleadingsClosed && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded">
                                    <Lock size={10} />
                                    محجوزة للقرار
                                </span>
                                {onReopenPleadings && (
                                    <button type="button" 
                                        onClick={onReopenPleadings}
                                        className="text-[10px] text-slate-400 hover:text-amber-500 underline"
                                    >
                                        فتح
                                    </button>
                                )}
                            </div>
                        )}

                        {/* 🔥 NEW: THE COMMAND CENTER (Comprehensive Vault) */}
                        {!isReadOnly && (
                            <CommandCenterMenu 
                                caseData={{ status, ...formData }}
                                currentStage={{ stageName: formData.stageName, status: formData.status, finalDecision: formData.finalDecision, fastTrackPetitions: formData.fastTrackPetitions, ...formData }}
                                onExtraordinaryAppeal={onExtraordinaryAppeal}
                                onJudgeRecusal={onJudgeRecusal}
                                onTransferJurisdiction={onTransferJurisdiction}
                                onCaseConsolidation={onCaseConsolidation}
                                onAttorneyResignation={onAttorneyResignation}
                                onExecutionTransfer={onExecutionTransfer}
                                onExportPDF={onExportPDF}
                                onMaterialErrorCorrection={onMaterialErrorCorrection}
                            />
                        )}
                    </div>

                    {/* Right Side: Court Name */}
                    <div className="text-right">
                        {isCassation ? (
                            <span className="text-xs text-[#E6C673] font-bold">محكمة التمييز الاتحادية</span>
                        ) : (
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-slate-400 font-medium">
                                    {formData.court || 'المحكمة المختصة'}
                                </span>
                                {/* Historical Subtitle (only if relevant) */}
                                {isAppealStage && hasFirstInstanceData && (
                                    <span className="text-[9px] text-slate-600 dir-rtl">
                                        (أساس: {formData.firstInstanceCaseNumber})
                                    </span>
                                )}
                            </div>
                        )}
                        
                        {/* 🔥 NEW: Dynamic Third Party Display in Header */}
                        {thirdPartiesList && thirdPartiesList.length > 0 && (
                            <div className="flex flex-col items-end mt-1 animate-in fade-in slide-in-from-top-2">
                                {thirdPartiesList.map((tp: any, i: number) => (
                                    <span key={tp.id || i} className="text-[9px] text-blue-400/80 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-500/10 mb-0.5">
                                        {tp.role.includes('اختصامي') ? '⚡' : '📎'} {tp.name} ({tp.role.replace('شخص ثالث ', '')})
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. ROW 2: CASE NUMBER & BADGE (The Core Info) - ZERO BOTTOM MARGIN */}
                <div className="flex items-center justify-between w-full mb-1">
                    {/* Left Side: Badge */}
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                            {formData.type || 'دعوى غير محددة'}
                        </div>
                        {wasReopened && (
                            <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/50 text-rose-400 text-[10px] font-bold rounded-full animate-pulse">
                                مـعاد فتحها
                            </span>
                        )}
                        {/* 🔥 NEW: Stayed/Paused Badge */}
                        {isPaused && (
                             <div className="flex items-center gap-2 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/50 animate-pulse ml-2">
                                <PauseCircle size={12} className="text-rose-400" />
                                <span className="text-[10px] font-bold text-rose-300">الدعوى مستأخرة</span>
                            </div>
                        )}
                         {/* Resume Button */}
                        {isPaused && onResume && !isReadOnly && (
                            <button type="button" 
                                onClick={onResume}
                                className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1 ml-2"
                            >
                                <Play size={10} />
                                استئناف
                            </button>
                        )}
                        {/* 🔥 NEW: Consolidation Badge */}
                        {linkedCaseNo && (
                            <div className="flex items-center gap-1.5 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">
                                <span className="text-lg">🔗</span>
                                <span className="text-[10px] font-bold text-teal-300">موحدة مع {linkedCaseNo}</span>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Case Number */}
                    <h1 className="text-2xl font-black text-amber-500 tracking-wider font-sans drop-shadow-md" dir="ltr">
                        {formData.caseNo || '---/---'}
                    </h1>
                </div>

                {/* 3. ROW 3: COMPACT ACTION BUTTONS (The Tools) */}
                <div className="flex flex-wrap items-center gap-2 w-full mb-1">
                    
                    {/* OBJECTION TRIAL ACTIONS */}
                    {isUnderObjection && onObjectionJudgment && (
                        <button type="button" 
                            onClick={onObjectionJudgment}
                            className="px-3 py-1 bg-indigo-600 text-white border border-indigo-500 rounded-md font-bold hover:bg-indigo-500 transition-all flex items-center gap-1.5 text-[10px] shadow-lg shadow-indigo-500/20"
                        >
                            <Gavel size={12} strokeWidth={3} />
                            ختم المرافعة وقرار الاعتراض ⚖️
                        </button>
                    )}

                    {/* CASSATION OUTCOME BUTTONS (Exclusive to Cassation) */}
                    {isCassation && !isReadOnly && onCassationDecision && (
                        <>
                            <button type="button" 
                                onClick={() => onCassationDecision('ratified')}
                                className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 text-[10px]"
                            >
                                <Check size={12} strokeWidth={3} />
                                مصدق
                            </button>
                            <button type="button" 
                                onClick={() => onCassationDecision('quashed')}
                                className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-md font-bold hover:bg-rose-500/20 transition-all flex items-center gap-1.5 text-[10px]"
                            >
                                <X size={12} strokeWidth={3} />
                                منقوض
                            </button>
                        </>
                    )}
                    
                    {/* 4. POST-JUDGMENT ACTIONS (The Critical Restoration) - ASYMMETRIC LEGAL LOGIC ENGINE */}
                    {(hasJudgment || isPleadingsClosed) && !isCassation && !isReadOnly && (
                        (isPleadingsClosed && (formData?.lastJudgmentType === 'غيابي' || formData?.judgmentForm === 'غيابي')) ? (
                            /* DEFAULT JUDGMENT ACTION BOX - REFACTORED STATE MACHINE */
                            <div className="w-full bg-orange-900/20 border border-orange-500 p-2 rounded-lg mt-1 mb-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                <h3 className="text-orange-400 font-bold mb-1 text-xs flex items-center gap-2">
                                    <Gavel size={14} />
                                    إجراءات الحكم الغيابي:
                                </h3>

                                {/* SCENARIO A: PLAINTIFF */}
                                {representedParty === 'المدعي' && (
                                    formData?.finalDecision?.includes('رد الدعوى') ? (
                                        // Lost (Partially or Fully) -> Appeal
                                        <button type="button" onClick={onOtherAppeals} className="w-full bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2">
                                            <Scale size={14} />
                                            تقديم طعن (استئناف/تمييز) ⚖️
                                        </button>
                                    ) : (
                                        // Won -> Wait
                                        <button type="button" disabled className="w-full bg-slate-800 text-slate-500 px-3 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-700">
                                            <Clock size={14} />
                                            بانتظار الخصم لتقديم اعتراض غيابي ⏳
                                        </button>
                                    )
                                )}

                                {/* SCENARIO B: DEFENDANT */}
                                {representedParty === 'المدعى عليه' && (
                                    formData?.finalDecision?.includes('رد الدعوى كلياً') ? (
                                        // Won (Plaintiff Lost) -> Wait
                                        <button type="button" disabled className="w-full bg-slate-800 text-slate-500 px-3 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-700">
                                            <Clock size={14} />
                                            بانتظار طعن الخصم ⏳
                                        </button>
                                    ) : (
                                        // Lost (Plaintiff Won) -> Object or Waive
                                        <div className="flex gap-2">
                                            <button type="button" onClick={onDefaultObjection} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all">
                                                <Shield size={14} />
                                                تقديم اعتراض غيابي 🛡️
                                            </button>
                                            <button type="button" onClick={onWaiveObjection} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2">
                                                <ChevronLeft size={14} />
                                                ترك الحكم غيابياً (تجاوز) ⏭️
                                            </button>
                                        </div>
                                    )
                                )}
                                
                                {/* FALLBACK (No Role) */}
                                {!representedParty && (
                                     <div className="flex gap-2">
                                        <button type="button" onClick={onDefaultObjection} className="flex-1 bg-orange-600 text-white px-3 py-1 rounded text-xs font-bold shadow-lg">🔄 اعتراض غيابي</button>
                                        <button type="button" onClick={onOtherAppeals} className="flex-1 bg-slate-700 text-white px-3 py-1 rounded text-xs font-bold">🔓 طعن آخر</button>
                                    </div>
                                )}
                            </div>
                        ) : isPleadingsClosed ? (
                            /* REGULAR JUDGMENT ACTIONS */
                            <div className="mt-2 w-full">
                                {/* ASYMMETRIC LOGIC: APPEAL RIGHTS */}
                                {representedParty === 'المدعي' && formData?.finalDecision?.includes('إجابة الدعوى') ? (
                                    <div className="bg-emerald-900/20 border border-emerald-500/30 p-2 rounded-lg mb-1">
                                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2">
                                            <Check size={14} />
                                            تمت إجابة الدعوى بالكامل (لصالحك)
                                        </div>
                                        <p className="text-emerald-200/60 text-[10px] mb-2">
                                            ⚠️ لا توجد مصلحة قانونية للطعن في هذا الحكم. يجب انتظار انتهاء المدة القانونية أو طعن الخصم.
                                        </p>
                                        <button type="button" 
                                            onClick={onRegisterOpponentAppeal}
                                            className="w-full py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-md hover:bg-slate-700 hover:text-white transition-all text-[10px] font-bold flex justify-center items-center gap-2"
                                        >
                                            <Clock size={12} />
                                            تسجيل طعن الخصم (عند التبليغ)
                                        </button>
                                    </div>
                                ) : (
                                    /* Default/Defendant View: Show Appeal Options */
                                    <button type="button" 
                                        onClick={onReopenPleadings}
                                        className={`w-full py-2 border rounded-lg flex justify-center items-center gap-2 transition-all text-[10px] font-bold group shadow-sm ${
                                            representedParty === 'المدعى عليه' 
                                                ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 shadow-indigo-500/20' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                        }`}
                                    >
                                        {representedParty === 'المدعى عليه' ? (
                                            <>
                                                <Scale size={14} />
                                                تقديم طعن (استئناف / تمييز) ⚖️
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={12} className="group-hover:text-amber-500 transition-colors" />
                                                فك القفل لمتابعة الإجراءات 🔓
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        ) : null
                    )}

                    {/* STANDARD ACTIONS (Hidden in Cassation OR Pleadings Closed) */}
                    {!isCassation && !isReadOnly && !isPleadingsClosed && (
                        <>
                            {formData?.stageName?.includes('استئناف') && (onAddCrossAppeal || onCancelCrossAppeal) && (
                                <button type="button" 
                                    onClick={hasCrossAppeal ? onCancelCrossAppeal : onAddCrossAppeal} 
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
                                        hasCrossAppeal 
                                            ? 'bg-indigo-500 text-white border-indigo-400 hover:bg-indigo-600' 
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20'
                                    }`}
                                    title={hasCrossAppeal ? "إلغاء الاستئناف المتقابل" : "إضافة استئناف متقابل"}
                                >
                                    <ArrowRightLeft size={12} />
                                    <span className="leading-none">{hasCrossAppeal ? '✓ متقابل' : 'استئناف متقابل'}</span>
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* 4. END OF HEADER ACTIONS */}
            </div>

            {/* 2. PARTIES SECTION - Grouped & Numbered List */}
            <div className="w-full bg-black/10 backdrop-blur-sm px-4 py-2 mt-0 relative border-t border-white/5" dir="rtl">
                <div className="flex flex-col gap-2 w-full mt-1">
                
                  {/* PLAINTIFFS GROUP (No background, no border) */}
                  {plaintiffs.length > 0 && (
                    <div className="flex flex-col w-full mb-2">
                      <span className="text-emerald-400 font-bold text-xs mb-1 block">
                        {plaintiffs.length === 1 ? 'المدعي:' : plaintiffs.length === 2 ? 'المدعيان:' : 'المدعون:'}
                      </span>
                      <div className="flex flex-col gap-1.5 pl-2">
                        {plaintiffs.map((party: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 w-full overflow-hidden">
                            {plaintiffs.length > 1 && <span className="text-slate-500 text-xs font-bold shrink-0">{idx + 1}-</span>}
                            <span className="font-bold text-white text-sm truncate">{party.name}</span>
                            {(party.lawyer || (party.lawyers && party.lawyers.length > 0)) && (
                              <button type="button" className="text-slate-400 hover:text-amber-500 text-sm shrink-0" title="عرض الوكيل">💼</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DEFENDANTS GROUP (No background, no border) */}
                  {defendants.length > 0 && (
                    <div className="flex flex-col w-full mb-2">
                      <span className="text-rose-400 font-bold text-xs mb-1 block">
                        {defendants.length === 1 ? 'المدعى عليه:' : defendants.length === 2 ? 'المدعى عليهما:' : 'المدعى عليهم:'}
                      </span>
                      <div className="flex flex-col gap-1.5 pl-2">
                        {defendants.map((party: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 w-full overflow-hidden">
                            {defendants.length > 1 && <span className="text-slate-500 text-xs font-bold shrink-0">{idx + 1}-</span>}
                            <span className="font-bold text-white text-sm truncate">{party.name}</span>
                            {(party.lawyer || (party.lawyers && party.lawyers.length > 0)) && (
                              <button type="button" className="text-slate-400 hover:text-amber-500 text-sm shrink-0" title="عرض الوكيل">💼</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
            </div>

            {/* 2.5. THIRD PARTY SECTION */}
            {thirdParties && thirdParties.length > 0 && (
                <div className="w-full mt-4 pt-4 border-t border-slate-700/50 px-4">
                    <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                        <Users size={14} /> الأشخاص الثالثة
                    </h4>
                    {thirdParties.map((party: any, index: number) => (
                        <div key={index} className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg w-full mb-2 flex justify-between items-center">
                            <span className="font-bold text-slate-200 text-xs">{party.name}</span>
                            <span className="text-[10px] px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full">
                                {party.role}
                            </span>
                        </div>
                    ))}
                </div>
            )}

                            {/* 3. CROSS-APPEAL SECTION (Dedicated Card) */}
            {hasCrossAppeal && isAppealStage && (
                 <div className="mt-4 mx-4 mb-4 border border-indigo-500/30 rounded-xl overflow-hidden relative shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                    <div className="bg-indigo-900/30 p-2.5 border-b border-indigo-500/20 flex items-center justify-center gap-2 backdrop-blur-md">
                        <ArrowRightLeft size={14} className="text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-300">أطراف الاستئناف المتقابل</span>
                    </div>
                    
                    <div className="grid grid-cols-2 divide-x divide-x-reverse divide-indigo-500/10 bg-black/40 backdrop-blur-md">
                         {/* Right Side: Original Defendant -> Cross-Appellant */}
                         <div className="p-4 flex flex-col gap-3 group/cross-appellant hover:bg-white/[0.02] transition-colors">
                             <div className="flex items-center justify-end mb-1">
                                 <span className="text-[10px] font-bold text-indigo-400 tracking-wide uppercase opacity-80 text-right bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">المستأنف المتقابل</span>
                             </div>
                             {defendants.map((party: any, index: number) => (
                                 <div key={index} className="w-full">
                                     <PartyItem party={party} isEditing={false} align="right" />
                                     {index < defendants.length - 1 && <hr className="border-slate-700/50 my-2" />}
                                 </div>
                             ))}
                         </div>
                         
                         {/* Left Side: Original Plaintiff -> Cross-Appellee */}
                         <div className="p-4 flex flex-col gap-3 group/cross-appellee hover:bg-white/[0.02] transition-colors">
                             <div className="flex items-center justify-end mb-1">
                                 <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase opacity-80 text-right bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">المستأنف عليه المتقابل</span>
                             </div>
                             {plaintiffs.map((party: any, index: number) => (
                                 <div key={index} className="w-full">
                                     <PartyItem party={party} isEditing={false} align="left" />
                                     {index < plaintiffs.length - 1 && <hr className="border-slate-700/50 my-2" />}
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
