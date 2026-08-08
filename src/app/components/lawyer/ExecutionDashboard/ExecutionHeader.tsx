/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 ExecutionHeader - Header Component for Execution Dashboard
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Displays the main header with file information, status, and action buttons
 * يعرض الرأس الرئيسي مع معلومات الملف والحالة وأزرار الإجراءات
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import React from 'react';
import { motion } from 'motion/react';
import { useExecutionAppealBannerState } from '@/app/hooks/useHasActiveExecutionAppeals';
import { 
    X, Gavel, Calendar, FileText, Clock, AlertCircle, 
    CheckCircle, Shield, ChevronDown, ChevronUp, Scale,
    DollarSign, Users
} from '@/app/components/ui/lucideIcons';
import type { ExecutionFile, Party } from '@/app/types/execution';
import { getExecutionPartyDisplayName } from '@/app/utils/partyDisplayName';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionHeaderProps {
    executionData: ExecutionFile;
    isExpanded?: boolean;
    onClose: () => void;
    onToggleExpand?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusConfig = {
        active: { 
            icon: Clock, 
            text: 'نشط', 
            color: 'text-green-400 bg-green-500/20 border-green-500/30' 
        },
        completed: { 
            icon: CheckCircle, 
            text: 'مكتمل', 
            color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' 
        },
        suspended: { 
            icon: AlertCircle, 
            text: 'موقوف', 
            color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' 
        },
        pending: { 
            icon: Clock, 
            text: 'معلق', 
            color: 'text-gray-400 bg-gray-500/20 border-gray-500/30' 
        }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${config.color}`}>
            <Icon className="w-4 h-4" />
            <span className="text-sm font-semibold">{config.text}</span>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ExecutionHeader = React.memo<ExecutionHeaderProps>(({ 
    executionData, 
    isExpanded = false,
    onClose,
    onToggleExpand 
}) => {
    const executionAppealBanner = useExecutionAppealBannerState(
        executionData?.id ? String(executionData.id) : undefined
    );

    // Calculate payment progress
    const paymentProgress = executionData?.totalAmount 
        ? Math.min(100, Math.round((executionData.paidAmount / executionData.totalAmount) * 100))
        : 0;

    const totalParties = (executionData?.creditors?.length || 0) + (executionData?.debtors?.length || 0);
    const primaryCreditorRow = executionData?.creditors?.[0];
    const primaryCreditorDisp = primaryCreditorRow
        ? getExecutionPartyDisplayName(primaryCreditorRow as Party, 'creditor', 0, executionData)
        : { text: '', baseName: '', showDeceasedGlyph: false, heirSubstituteLines: [] };

    const primaryDebtorRow = executionData?.debtors?.[0];
    const primaryDebtorDisp = primaryDebtorRow
        ? getExecutionPartyDisplayName(primaryDebtorRow as Party, 'debtor', 0, executionData)
        : { text: '', baseName: '', showDeceasedGlyph: false, heirSubstituteLines: [] };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 rounded-t-2xl border-b-2 border-gold-500/30 overflow-hidden"
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                    backgroundSize: '32px 32px'
                }} />
            </div>

            {/* Content */}
            <div className="relative p-6">
                {/* Top Row: Title + Close Button */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20">
                            <Gavel className="w-7 h-7 text-navy-900" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">
                                ملف التنفيذ رقم {executionData?.fileNumber || 'غير محدد'}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm text-gray-400">
                                    {executionData?.directorate || 'دائرة التنفيذ'}
                                </p>
                                {primaryCreditorRow ? (
                                    <span className="text-sm text-gray-300 inline-flex flex-col items-end gap-0.5 max-w-full text-right">
                                        <span className="inline-flex items-center gap-1 flex-wrap justify-end">
                                            الدائن:
                                            {primaryCreditorDisp.showDeceasedGlyph ? (
                                                <span
                                                    className="text-[10px] text-slate-500 select-none"
                                                    title="متوفى"
                                                    aria-hidden
                                                >
                                                    🪦
                                                </span>
                                            ) : null}
                                            {primaryCreditorDisp.text}
                                        </span>
                                        {primaryCreditorDisp.heirSubstituteLines &&
                                        primaryCreditorDisp.heirSubstituteLines.length > 0 ? (
                                            <span
                                                dir="rtl"
                                                lang="ar"
                                                className="text-xs font-medium text-slate-300 block w-full [unicode-bidi:plaintext]"
                                            >
                                                {primaryCreditorDisp.heirSubstituteLines.join('، ')}
                                            </span>
                                        ) : null}
                                    </span>
                                ) : null}
                                {primaryDebtorRow &&
                                primaryDebtorDisp.heirSubstituteLines &&
                                primaryDebtorDisp.heirSubstituteLines.length > 0 ? (
                                    <span className="text-sm text-gray-300 inline-flex flex-col items-end gap-0.5 max-w-full text-right">
                                        <span className="inline-flex items-center gap-1 flex-wrap justify-end">
                                            المدين:
                                            {primaryDebtorDisp.showDeceasedGlyph ? (
                                                <span
                                                    className="text-[10px] text-slate-500 select-none"
                                                    title="متوفى"
                                                    aria-hidden
                                                >
                                                    🪦
                                                </span>
                                            ) : null}
                                            {primaryDebtorDisp.text}
                                        </span>
                                        <span
                                            dir="rtl"
                                            lang="ar"
                                            className="text-base font-medium text-slate-300 block w-full [unicode-bidi:plaintext]"
                                        >
                                            {primaryDebtorDisp.heirSubstituteLines.join('، ')}
                                        </span>
                                    </span>
                                ) : null}
                                {executionAppealBanner.show ? (
                                    <span
                                        className="inline-flex items-center rounded-md border border-red-500 bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-500 animate-pulse"
                                        title={`طعن ساري: ${executionAppealBanner.label}`}
                                    >
                                        ⚖️ {executionAppealBanner.label}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Close Button */}
                    <button type="button"
                        onClick={onClose}
                        className="w-10 h-10 bg-navy-800/50 hover:bg-red-500/20 border border-navy-700 hover:border-red-500/50 rounded-xl flex items-center justify-center transition-all duration-200 group"
                    >
                        <X className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
                    </button>
                </div>

                {/* Status Badge */}
                <div className="mb-6">
                    <StatusBadge status={executionData?.status || 'pending'} />
                </div>

                {/* Quick Stats - 4 Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {/* Document Type */}
                    <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Scale className="w-4 h-4 text-gold-400" />
                            <span className="text-xs text-gray-400">نوع السند</span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                            {executionData?.docType === 'civil_judgment' && 'حكم مدني'}
                            {executionData?.docType === 'sharia_deed' && 'سند شرعي'}
                            {executionData?.docType === 'criminal_judgment' && 'حكم جزائي'}
                            {executionData?.docType === 'foreign_judgment' && 'حكم أجنبي'}
                            {!executionData?.docType && 'غير محدد'}
                        </p>
                    </div>

                    {/* Total Amount */}
                    <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-gray-400">المبلغ الكلي</span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                            {executionData?.totalAmount?.toLocaleString('ar-IQ')} IQD
                        </p>
                    </div>

                    {/* Remaining Amount */}
                    <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-gray-400">المبلغ المتبقي</span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                            {(executionData?.totalAmount - executionData?.paidAmount)?.toLocaleString('ar-IQ')} IQD
                        </p>
                    </div>

                    {/* Parties Count */}
                    <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-gray-400">عدد الأطراف</span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                            {totalParties} طرف
                        </p>
                    </div>
                </div>

                {/* Payment Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">نسبة التسديد</span>
                        <span className="text-gold-400 font-semibold">{paymentProgress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-navy-900/50 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${paymentProgress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full"
                        />
                    </div>
                </div>

                {/* Expand/Collapse Button */}
                {onToggleExpand && (
                    <div className="mt-4 flex justify-center">
                        <button type="button"
                            onClick={onToggleExpand}
                            className="flex items-center gap-2 px-4 py-2 bg-navy-800/50 hover:bg-navy-700/50 border border-navy-700 rounded-lg transition-colors"
                        >
                            <span className="text-sm text-gray-400">
                                {isExpanded ? 'إخفاء التفاصيل' : 'عرض المزيد'}
                            </span>
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                    </div>
                )}

                {/* Extended Info (When Expanded) */}
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-6 border-t border-navy-700 grid grid-cols-3 gap-4"
                    >
                        {/* Document Number */}
                        {executionData?.docNumber && (
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs text-gray-500">رقم السند</span>
                                </div>
                                <p className="text-sm text-white">{executionData.docNumber}</p>
                            </div>
                        )}

                        {/* Judgment Date */}
                        {executionData?.judgmentDate && (
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs text-gray-500">تاريخ الحكم</span>
                                </div>
                                <p className="text-sm text-white">
                                    {new Date(executionData.judgmentDate).toLocaleDateString('ar-IQ')}
                                </p>
                            </div>
                        )}

                        {/* Notification Date */}
                        {executionData?.notificationDate && (
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs text-gray-500">تاريخ التبليغ</span>
                                </div>
                                <p className="text-sm text-white">
                                    {new Date(executionData.notificationDate).toLocaleDateString('ar-IQ')}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default ExecutionHeader;
