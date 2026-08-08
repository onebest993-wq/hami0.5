/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚡ ExecutionActionsBar - Quick Actions Toolbar
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Displays quick action buttons for execution file operations
 * يعرض أزرار الإجراءات السريعة لعمليات ملف التنفيذ
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
    DollarSign, Bell, FileText, Scale, Lock, Share2,
    Printer, Download, Calendar, Calculator, Users,
    Archive, Trash2, Edit2, Eye, RefreshCw
} from '@/app/components/ui/lucideIcons';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionActionsBarProps {
    onAddPayment?: () => void;
    onSendNotification?: () => void;
    onAddDocument?: () => void;
    onViewDocuments?: () => void;
    onScheduleAppointment?: () => void;
    onShowCalculator?: () => void;
    onManageParties?: () => void;
    onGenerateReport?: () => void;
    onPrint?: () => void;
    onExport?: () => void;
    onShare?: () => void;
    onArchive?: () => void;
    onEdit?: () => void;
    onRefresh?: () => void;
    isArchived?: boolean;
    activeTab?: string;
    isReadOnly?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ActionButtonProps {
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    badge?: string | number;
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
    icon: Icon, 
    label, 
    onClick, 
    variant = 'secondary',
    disabled = false,
    badge
}) => {
    const variantStyles = {
        primary: 'bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-navy-900 shadow-lg shadow-gold-500/20',
        secondary: 'bg-navy-800 hover:bg-navy-700 border border-navy-700 text-gray-300 hover:text-white hover:border-gold-500/30',
        danger: 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300'
    };

    return (
        <motion.button
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            onClick={onClick}
            disabled={disabled}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${
                variantStyles[variant]
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium whitespace-nowrap">{label}</span>
            
            {badge && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {badge}
                </div>
            )}
        </motion.button>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ExecutionActionsBar = React.memo<ExecutionActionsBarProps>(({
    activeTab = 'overview',
    isArchived = false,
    isReadOnly = false,
    onAddPayment,
    onSendNotification,
    onAddDocument,
    onViewDocuments,
    onScheduleAppointment,
    onShowCalculator,
    onManageParties,
    onGenerateReport,
    onPrint,
    onExport,
    onArchive,
    onShare,
    onRefresh,
    onEdit,
}) => {
    // Memoize action buttons configuration to avoid recreation
    const actionButtons = React.useMemo(() => {
        const buttons = [];

        if (onPrint) {
            buttons.push({
                id: 'print',
                icon: Printer,
                label: 'طباعة',
                onClick: onPrint,
                color: 'text-blue-400 hover:bg-blue-500/20'
            });
        }

        if (onExport) {
            buttons.push({
                id: 'export',
                icon: Download,
                label: 'تصدير',
                onClick: onExport,
                color: 'text-green-400 hover:bg-green-500/20'
            });
        }

        if (onShare && !isArchived) {
            buttons.push({
                id: 'share',
                icon: Share2,
                label: 'مشاركة',
                onClick: onShare,
                color: 'text-purple-400 hover:bg-purple-500/20'
            });
        }

        if (onArchive && !isArchived && !isReadOnly) {
            buttons.push({
                id: 'archive',
                icon: Archive,
                label: 'أرشفة',
                onClick: onArchive,
                color: 'text-amber-400 hover:bg-amber-500/20'
            });
        }

        if (onRefresh) {
            buttons.push({
                id: 'refresh',
                icon: RefreshCw,
                label: 'تحديث',
                onClick: onRefresh,
                color: 'text-gray-400 hover:bg-gray-500/20'
            });
        }

        return buttons;
    }, [onPrint, onExport, onShare, onArchive, onRefresh, isArchived, isReadOnly]);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Primary Actions */}
            <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 rounded-2xl border border-gold-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gold-400">إجراءات سريعة</h3>
                    {onRefresh && (
                        <button type="button"
                            onClick={onRefresh}
                            className="w-8 h-8 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-lg flex items-center justify-center transition-colors"
                        >
                            <RefreshCw className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {/* Add Payment */}
                    {onAddPayment && (
                        <ActionButton
                            icon={DollarSign}
                            label="تسجيل دفعة"
                            onClick={onAddPayment}
                            variant="primary"
                            disabled={isArchived}
                        />
                    )}

                    {/* Send Notification */}
                    {onSendNotification && (
                        <ActionButton
                            icon={Bell}
                            label="إرسال تبليغ"
                            onClick={onSendNotification}
                            disabled={isArchived}
                        />
                    )}

                    {/* Add Document */}
                    {onAddDocument && (
                        <ActionButton
                            icon={FileText}
                            label="إضافة مستند"
                            onClick={onAddDocument}
                            disabled={isArchived}
                        />
                    )}

                    {/* Calculator */}
                    {onShowCalculator && (
                        <ActionButton
                            icon={Calculator}
                            label="الحاسبة"
                            onClick={onShowCalculator}
                        />
                    )}

                    {/* Schedule Appointment */}
                    {onScheduleAppointment && (
                        <ActionButton
                            icon={Calendar}
                            label="موعد"
                            onClick={onScheduleAppointment}
                            disabled={isArchived}
                        />
                    )}

                    {/* Manage Parties */}
                    {onManageParties && (
                        <ActionButton
                            icon={Users}
                            label="الأطراف"
                            onClick={onManageParties}
                        />
                    )}

                    {/* View Documents */}
                    {onViewDocuments && (
                        <ActionButton
                            icon={Eye}
                            label="المستندات"
                            onClick={onViewDocuments}
                        />
                    )}

                    {/* Generate Report */}
                    {onGenerateReport && (
                        <ActionButton
                            icon={FileText}
                            label="تقرير"
                            onClick={onGenerateReport}
                        />
                    )}
                </div>
            </div>

            {/* Secondary Actions */}
            <div className="bg-navy-900/50 rounded-xl border border-navy-700 p-4">
                <div className="grid grid-cols-6 gap-2">
                    {/* Print */}
                    {onPrint && (
                        <button type="button"
                            onClick={onPrint}
                            className="flex flex-col items-center gap-1 p-3 bg-navy-800 hover:bg-navy-700 rounded-lg transition-colors"
                        >
                            <Printer className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">طباعة</span>
                        </button>
                    )}

                    {/* Export */}
                    {onExport && (
                        <button type="button"
                            onClick={onExport}
                            className="flex flex-col items-center gap-1 p-3 bg-navy-800 hover:bg-navy-700 rounded-lg transition-colors"
                        >
                            <Download className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">تصدير</span>
                        </button>
                    )}

                    {/* Share */}
                    {onShare && (
                        <button type="button"
                            onClick={onShare}
                            className="flex flex-col items-center gap-1 p-3 bg-navy-800 hover:bg-navy-700 rounded-lg transition-colors"
                        >
                            <Share2 className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">مشاركة</span>
                        </button>
                    )}

                    {/* Edit */}
                    {onEdit && !isArchived && (
                        <button type="button"
                            onClick={onEdit}
                            className="flex flex-col items-center gap-1 p-3 bg-navy-800 hover:bg-navy-700 rounded-lg transition-colors"
                        >
                            <Edit2 className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">تعديل</span>
                        </button>
                    )}

                    {/* Archive */}
                    {onArchive && (
                        <button type="button"
                            onClick={onArchive}
                            className="flex flex-col items-center gap-1 p-3 bg-navy-800 hover:bg-navy-700 rounded-lg transition-colors"
                        >
                            <Archive className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-amber-400">
                                {isArchived ? 'استعادة' : 'أرشفة'}
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Contextual Actions Based on Active Tab */}
            {activeTab && (
                <div className="bg-navy-900/30 border border-navy-700 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-3">إجراءات {activeTab}</p>
                    <div className="flex items-center gap-2">
                        {activeTab === 'payments' && (
                            <>
                                <button type="button" className="flex-1 px-3 py-2 bg-navy-800 hover:bg-navy-700 rounded-lg text-sm text-gray-300 transition-colors">
                                    تصدير المدفوعات
                                </button>
                                <button type="button" className="flex-1 px-3 py-2 bg-navy-800 hover:bg-navy-700 rounded-lg text-sm text-gray-300 transition-colors">
                                    تقرير مالي
                                </button>
                            </>
                        )}
                        {activeTab === 'timeline' && (
                            <>
                                <button type="button" className="flex-1 px-3 py-2 bg-navy-800 hover:bg-navy-700 rounded-lg text-sm text-gray-300 transition-colors">
                                    تصدير الخط الزمني
                                </button>
                                <button type="button" className="flex-1 px-3 py-2 bg-navy-800 hover:bg-navy-700 rounded-lg text-sm text-gray-300 transition-colors">
                                    مشاركة السجل
                                </button>
                            </>
                        )}
                        {activeTab === 'parties' && (
                            <>
                                <button type="button" className="flex-1 px-3 py-2 bg-navy-800 hover:bg-navy-700 rounded-lg text-sm text-gray-300 transition-colors">
                                    إضافة دائن
                                </button>
                                <button type="button" className="flex-1 px-3 py-2 bg-navy-800 hover:bg-navy-700 rounded-lg text-sm text-gray-300 transition-colors">
                                    إضافة مدين
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Archived Notice */}
            {isArchived && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-amber-400" />
                        <div>
                            <p className="text-sm font-semibold text-amber-400 mb-1">
                                ملف مؤرشف
                            </p>
                            <p className="text-xs text-gray-400">
                                بعض الإجراءات غير متاحة للملفات المؤرشفة
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default ExecutionActionsBar;