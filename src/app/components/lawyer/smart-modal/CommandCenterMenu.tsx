import React, { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Shield, RotateCcw, AlertTriangle, Ban, Link, Briefcase, Printer, FileEdit, HelpCircle, X } from '@/app/components/ui/lucideIcons';

interface CommandCenterMenuProps {
    caseData: { status: string; [key: string]: unknown };
    currentStage?: {
        stageName?: string;
        finalDecision?: string;
        status?: string;
        timeline?: Array<{ type: string; [key: string]: unknown }>;
        fastTrackPetitions?: Array<{ status: string; [key: string]: unknown }>;
    };
    onExtraordinaryAppeal: (type: string) => void;
    onJudgeRecusal: () => void;
    onTransferJurisdiction: () => void;
    onCaseConsolidation: () => void;
    onAttorneyResignation: () => void;
    onExecutionTransfer: () => void;
    onExportPDF: () => void;
    onMaterialErrorCorrection?: (type: string) => void;
}

export const CommandCenterMenu = memo(({ 
    caseData, 
    currentStage,
    onExtraordinaryAppeal,
    onJudgeRecusal,
    onTransferJurisdiction,
    onCaseConsolidation,
    onAttorneyResignation,
    onExecutionTransfer,
    onExportPDF,
    onMaterialErrorCorrection
}: CommandCenterMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);

    // Conditional Rendering Logic
    const hasJudgment = currentStage?.finalDecision || currentStage?.status === 'completed' || currentStage?.timeline?.some((e) => e.type === 'decision');
    const isFinal = caseData.status === 'مكتسبة الدرجة القطعية';
    const isCassation = currentStage?.stageName === 'التمييز';
    const isActive = currentStage?.status === 'active' && !isFinal;
    const hasFastTrackOrder = currentStage?.fastTrackPetitions?.some((p) => 
        p.status === 'صدر قرار بالقبول ✅'
    );

    const dropdownContent = isOpen && (
        <>
            {/* 🔥 Blurred Backdrop */}
            <div 
                className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" 
                onClick={() => setIsOpen(false)}
            />

            {/* 🔥 CENTERED MODAL with Portal */}
            <div 
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[320px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[9999] font-['Tajawal'] animate-in zoom-in-95 fade-in duration-200" 
                dir="rtl"
                style={{ 
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569'
                }}
            >
                {/* Header with Close Button */}
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white rounded-t-xl relative">
                    <button type="button"
                        onClick={() => setIsOpen(false)}
                        className="absolute left-3 top-3 p-1 rounded-md hover:bg-white/20 transition-colors"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <h3 className="font-bold text-base flex items-center gap-2 pr-2">
                        <Shield size={18} className="shrink-0" />
                        <span>مركز القيادة الشامل</span>
                    </h3>
                    <p className="text-[11px] text-white/90 mt-1 pr-7">إدارة متقدمة للإضبارة</p>
                </div>

                <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent px-1 py-3">
                    {/* SECTION A: EXTRAORDINARY APPEALS */}
                    {hasJudgment && (
                        <div className="mb-3">
                            <div className="px-4 pt-2 pb-1.5">
                                <h4 className="text-[9px] font-extrabold text-[#E6C673] uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-[#E6C673]"></span>
                                    الطعون الاستثنائية
                                </h4>
                            </div>

                            <div className="space-y-0.5 px-2">
                                {/* Third-Party Objection */}
                                <button type="button"
                                    onClick={() => {
                                        onExtraordinaryAppeal('third_party');
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 transition-all duration-200 group"
                                >
                                    <span className="text-base shrink-0 opacity-80 group-hover:opacity-100">🙋‍♂️</span>
                                    <div className="flex-1 text-right min-w-0">
                                        <div className="text-[13px] font-bold text-white/90 group-hover:text-white">اعتراض الغير</div>
                                        <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">طعن من شخص خارج الخصومة</div>
                                    </div>
                                </button>

                                {/* Retrial */}
                                {isFinal && (
                                    <button type="button"
                                        onClick={() => {
                                            onExtraordinaryAppeal('retrial');
                                            setIsOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 transition-all duration-200 group"
                                    >
                                        <RotateCcw size={16} className="text-blue-400 shrink-0 group-hover:text-blue-300" />
                                        <div className="flex-1 text-right min-w-0">
                                            <div className="text-[13px] font-bold text-white/90 group-hover:text-white">إعادة المحاكمة</div>
                                            <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">طعن في حكم مكتسب للدرجة القطعية</div>
                                        </div>
                                    </button>
                                )}

                                {/* Cassation Correction */}
                                {isCassation && (
                                    <button type="button"
                                        onClick={() => {
                                            onExtraordinaryAppeal('cassation_correction');
                                            setIsOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 transition-all duration-200 group"
                                    >
                                        <AlertTriangle size={16} className="text-orange-400 shrink-0 group-hover:text-orange-300" />
                                        <div className="flex-1 text-right min-w-0">
                                            <div className="text-[13px] font-bold text-white/90 group-hover:text-white">تصحيح القرار التمييزي</div>
                                            <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">إصلاح خطأ قانوني في قرار التمييز</div>
                                        </div>
                                    </button>
                                )}
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent my-3 mx-4" />
                        </div>
                    )}

                    {/* 🔥 SECTION B: POST-JUDGMENT CORRECTIONS */}
                    {hasJudgment && (
                        <div className="mb-3">
                            <div className="px-4 pt-2 pb-1.5">
                                <h4 className="text-[9px] font-extrabold text-[#E6C673] uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-[#E6C673]"></span>
                                    تصحيحات ما بعد الحكم
                                </h4>
                            </div>

                            <div className="space-y-0.5 px-2">
                                {/* Material Error Correction */}
                                <button type="button"
                                    onClick={() => {
                                        onMaterialErrorCorrection?.('correction');
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 transition-all duration-200 group"
                                >
                                    <FileEdit size={16} className="text-amber-400 shrink-0 group-hover:text-amber-300" />
                                    <div className="flex-1 text-right min-w-0">
                                        <div className="text-[13px] font-bold text-white/90 group-hover:text-white">طلب تصحيح خطأ مادي</div>
                                        <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">أخطاء حسابية أو كتابية في الحكم</div>
                                    </div>
                                </button>

                                {/* Clarification Request */}
                                <button type="button"
                                    onClick={() => {
                                        onMaterialErrorCorrection?.('clarification');
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 transition-all duration-200 group"
                                >
                                    <HelpCircle size={16} className="text-blue-400 shrink-0 group-hover:text-blue-300" />
                                    <div className="flex-1 text-right min-w-0">
                                        <div className="text-[13px] font-bold text-white/90 group-hover:text-white">طلب توضيح حكم غامض</div>
                                        <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">عند وجود غموض أو تناقض</div>
                                    </div>
                                </button>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent my-3 mx-4" />
                        </div>
                    )}

                    {/* SECTION C: PROCEDURAL MANEUVERS */}
                    {isActive && (
                        <div className="mb-3">
                            <div className="px-4 pt-2 pb-1.5">
                                <h4 className="text-[9px] font-extrabold text-[#E6C673] uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-[#E6C673]"></span>
                                    المناورات الإجرائية
                                </h4>
                            </div>

                            <div className="space-y-0.5 px-2">
                                {/* Judge Recusal */}
                                <button type="button"
                                    onClick={() => {
                                        onJudgeRecusal?.();
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 transition-all duration-200 group"
                                >
                                    <span className="text-base shrink-0 opacity-80 group-hover:opacity-100">🛑</span>
                                    <div className="flex-1 text-right min-w-0">
                                        <div className="text-[13px] font-bold text-white/90 group-hover:text-white">طلب رد القاضي</div>
                                        <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">تجميد الدعوى لحين البت في الطلب</div>
                                    </div>
                                </button>

                                {/* Transfer Jurisdiction */}
                                <button type="button"
                                    onClick={() => {
                                        onTransferJurisdiction?.();
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 transition-all duration-200 group"
                                >
                                    <span className="text-base shrink-0 opacity-80 group-hover:opacity-100">🔀</span>
                                    <div className="flex-1 text-right min-w-0">
                                        <div className="text-[13px] font-bold text-white/90 group-hover:text-white">إحالة لعدم الاختصاص</div>
                                        <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">نقل الدعوى لمحكمة أخرى</div>
                                    </div>
                                </button>

                                {/* Case Consolidation */}
                                <button type="button"
                                    onClick={() => {
                                        onCaseConsolidation?.();
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 transition-all duration-200 group"
                                >
                                    <Link size={16} className="text-purple-400 shrink-0 group-hover:text-purple-300" />
                                    <div className="flex-1 text-right min-w-0">
                                        <div className="text-[13px] font-bold text-white/90 group-hover:text-white">توحيد الدعاوى</div>
                                        <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">ربط مع دعوى أخرى مرتبطة</div>
                                    </div>
                                </button>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent my-3 mx-4" />
                        </div>
                    )}

                    {/* SECTION D: ATTORNEY-CLIENT STATUS */}
                    <div className="mb-3">
                        <div className="px-4 pt-2 pb-1.5">
                            <h4 className="text-[9px] font-extrabold text-[#E6C673] uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-[#E6C673]"></span>
                                التمثيل القانوني
                            </h4>
                        </div>

                        <div className="space-y-0.5 px-2">
                            <button type="button"
                                onClick={() => {
                                    onAttorneyResignation?.();
                                    setIsOpen(false);
                                }}
                                className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-red-900/20 hover:bg-red-900/40 border border-transparent hover:border-red-800/50 transition-all duration-200 group"
                            >
                            <Ban size={16} className="text-red-400 shrink-0 group-hover:text-red-300" />
                            <div className="flex-1 text-right min-w-0">
                                <div className="text-[13px] font-bold text-red-300 group-hover:text-red-200">عزل / تنحي الوكيل</div>
                                <div className="text-[10px] text-red-400/70 group-hover:text-red-300/80 mt-0.5 truncate">إنهاء التمثيل القانوني نهائياً</div>
                            </div>
                        </button>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent my-3 mx-4" />
                    </div>

                    {/* SECTION E: LIFECYCLE & EXECUTION */}
                    <div className="mb-2">
                        <div className="px-4 pt-2 pb-1.5">
                            <h4 className="text-[9px] font-extrabold text-[#E6C673] uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-[#E6C673]"></span>
                                نهاية المطاف والتنفيذ
                            </h4>
                        </div>

                        <div className="space-y-0.5 px-2">
                            {/* Export PDF */}
                            <button type="button"
                                onClick={() => {
                                    onExportPDF?.();
                                    setIsOpen(false);
                                }}
                                className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 transition-all duration-200 group"
                            >
                            <Printer size={16} className="text-gray-400 shrink-0 group-hover:text-gray-300" />
                            <div className="flex-1 text-right min-w-0">
                                <div className="text-[13px] font-bold text-white/90 group-hover:text-white">تصدير الإضبارة (PDF)</div>
                                <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5 truncate">تقرير شامل عن القضية</div>
                            </div>
                        </button>

                            {/* Execution Transfer */}
                            {(isFinal || hasFastTrackOrder) && (
                                <button type="button"
                                    onClick={() => {
                                        onExecutionTransfer?.();
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-lg bg-green-900/20 hover:bg-green-900/40 border border-transparent hover:border-green-800/50 transition-all duration-200 group"
                                >
                                    <Briefcase size={16} className="text-green-400 shrink-0 group-hover:text-green-300" />
                                    <div className="flex-1 text-right min-w-0">
                                        <div className="text-[13px] font-bold text-green-300 group-hover:text-green-200">إحالة لمديرية التنفيذ</div>
                                        <div className="text-[10px] text-green-400/70 group-hover:text-green-300/80 mt-0.5 truncate">نقل للمرحلة التنفيذية</div>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="relative">
            <button type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                title="مركز القيادة الشامل"
            >
                <MoreVertical size={20} />
            </button>

            {dropdownContent && createPortal(dropdownContent, document.body)}
        </div>
    );
});