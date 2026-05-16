import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Upload, Eye, Trash2, CheckCircle2, XCircle, Scale, Receipt, Mail } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';

type DocumentSlot = 'petition' | 'judgeOrder' | 'guaranteeReceipt' | 'executionLetters';

interface DocumentStatus {
    uploaded: boolean;
    fileName?: string;
    uploadDate?: string;
    fileUrl?: string;
}

interface DocumentVaultState {
    petition: DocumentStatus;
    judgeOrder: DocumentStatus;
    guaranteeReceipt: DocumentStatus;
    executionLetters: DocumentStatus;
}

interface Props {
    requiresGuaranteeReceipt?: boolean; // Based on Financial Tracker
    onDocumentChange?: (vault: DocumentVaultState) => void;
}

/**
 * 🗄️ خزانة المستندات والمخاطبات الرسمية
 * 
 * نظام منظم لرفع وإدارة المستندات القانونية الحرجة للأمر الولائي
 */

export const Widget_Document_Vault: React.FC<Props> = ({ 
    requiresGuaranteeReceipt = false,
    onDocumentChange 
}) => {
    const [vault, setVault] = useState<DocumentVaultState>({
        petition: { uploaded: false },
        judgeOrder: { uploaded: false },
        guaranteeReceipt: { uploaded: false },
        executionLetters: { uploaded: false }
    });

    const handleUpload = (slot: DocumentSlot) => {
        // Simulate file upload (In production, this would handle actual file upload)
        const now = new Date().toLocaleDateString('ar-IQ');
        const newVault = {
            ...vault,
            [slot]: {
                uploaded: true,
                fileName: `مستند_${slot}_${Date.now()}.pdf`,
                uploadDate: now,
                fileUrl: '#' // In production, this would be the actual file URL
            }
        };
        setVault(newVault);
        if (onDocumentChange) {
            onDocumentChange(newVault);
        }
    };

    const handleDelete = async (slot: DocumentSlot) => {
        const confirmed = await SmartDialog.confirm('هل أنت متأكد من حذف هذا المستند؟');
        if (!confirmed) return;

        const newVault = {
            ...vault,
            [slot]: { uploaded: false }
        };
        setVault(newVault);
        if (onDocumentChange) {
            onDocumentChange(newVault);
        }
    };

    const handleView = (slot: DocumentSlot) => {
        // In production, this would open/download the file
        SmartToast.info(`عرض المستند: ${vault[slot].fileName}`);
    };

    const getCompletionPercentage = () => {
        const totalSlots = requiresGuaranteeReceipt ? 4 : 3;
        let uploadedCount = 0;
        
        if (vault.petition.uploaded) uploadedCount++;
        if (vault.judgeOrder.uploaded) uploadedCount++;
        if (vault.executionLetters.uploaded) uploadedCount++;
        if (requiresGuaranteeReceipt && vault.guaranteeReceipt.uploaded) uploadedCount++;

        return Math.round((uploadedCount / totalSlots) * 100);
    };

    const completionPercentage = getCompletionPercentage();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 shadow-2xl"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                        <FileText className="text-cyan-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-xl">🗄️ خزانة المستندات والمخاطبات الرسمية</h3>
                        <p className="text-white/60 text-xs">Document Vault & Official Correspondences</p>
                    </div>
                </div>

                {/* Completion Badge */}
                <div className={`
                    px-4 py-2 rounded-full text-sm font-bold
                    ${completionPercentage === 100 
                        ? 'bg-green-900/30 border-2 border-green-500/50 text-green-300' 
                        : completionPercentage >= 50
                        ? 'bg-amber-900/30 border-2 border-amber-500/50 text-amber-300'
                        : 'bg-red-900/30 border-2 border-red-500/50 text-red-300'
                    }
                `}>
                    {completionPercentage}% مكتمل
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 ${
                            completionPercentage === 100 
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600'
                        }`}
                        style={{ width: `${completionPercentage}%` }}
                    />
                </div>
            </div>

            {/* Document Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Slot A: Original Petition */}
                <DocumentSlotCard
                    icon={FileText}
                    title="العريضة الأصلية للطلب"
                    subtitle="Original Petition"
                    status={vault.petition}
                    required={true}
                    onUpload={() => handleUpload('petition')}
                    onView={() => handleView('petition')}
                    onDelete={() => handleDelete('petition')}
                    color="blue"
                />

                {/* Slot B: Judge's Order Decision */}
                <DocumentSlotCard
                    icon={Scale}
                    title="قرار القاضي الولائي"
                    subtitle="Judge's Order Decision"
                    status={vault.judgeOrder}
                    required={true}
                    onUpload={() => handleUpload('judgeOrder')}
                    onView={() => handleView('judgeOrder')}
                    onDelete={() => handleDelete('judgeOrder')}
                    color="purple"
                />

                {/* Slot C: Guarantee Receipt (Conditional) */}
                {requiresGuaranteeReceipt && (
                    <DocumentSlotCard
                        icon={Receipt}
                        title="وصل الكفالة / التأمينات"
                        subtitle="Guarantee Receipt"
                        status={vault.guaranteeReceipt}
                        required={true}
                        onUpload={() => handleUpload('guaranteeReceipt')}
                        onView={() => handleView('guaranteeReceipt')}
                        onDelete={() => handleDelete('guaranteeReceipt')}
                        color="green"
                    />
                )}

                {/* Slot D: Execution Letters */}
                <DocumentSlotCard
                    icon={Mail}
                    title="كتب التنفيذ والمخاطبات"
                    subtitle="Execution Letters"
                    status={vault.executionLetters}
                    required={true}
                    onUpload={() => handleUpload('executionLetters')}
                    onView={() => handleView('executionLetters')}
                    onDelete={() => handleDelete('executionLetters')}
                    color="orange"
                />
            </div>

            {/* Legal Notice */}
            <div className="mt-6 pt-6 border-t border-white/10">
                <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                    <p className="text-white/70 text-xs leading-relaxed">
                        <span className="font-bold text-white">⚠️ تنبيه قانوني:</span> يجب حفظ جميع المستندات الأصلية في ملف ورقي منفصل.
                        هذه النسخ الإلكترونية للتوثيق والمتابعة فقط ولا تغني عن الأصول القانونية المطلوبة في المحكمة.
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

// 🔥 Sub-component: Document Slot Card
interface DocumentSlotCardProps {
    icon: any;
    title: string;
    subtitle: string;
    status: DocumentStatus;
    required: boolean;
    onUpload: () => void;
    onView: () => void;
    onDelete: () => void;
    color: 'blue' | 'purple' | 'green' | 'orange';
}

const DocumentSlotCard: React.FC<DocumentSlotCardProps> = ({
    icon: Icon,
    title,
    subtitle,
    status,
    required,
    onUpload,
    onView,
    onDelete,
    color
}) => {
    const colorConfig = {
        blue: {
            bg: 'from-blue-900/20 to-cyan-900/20',
            border: 'border-blue-500/30',
            icon: 'text-blue-400',
            uploadBg: 'from-blue-600 to-cyan-600',
            uploadHover: 'from-blue-700 to-cyan-700'
        },
        purple: {
            bg: 'from-purple-900/20 to-violet-900/20',
            border: 'border-purple-500/30',
            icon: 'text-purple-400',
            uploadBg: 'from-purple-600 to-violet-600',
            uploadHover: 'from-purple-700 to-violet-700'
        },
        green: {
            bg: 'from-green-900/20 to-emerald-900/20',
            border: 'border-green-500/30',
            icon: 'text-green-400',
            uploadBg: 'from-green-600 to-emerald-600',
            uploadHover: 'from-green-700 to-emerald-700'
        },
        orange: {
            bg: 'from-orange-900/20 to-red-900/20',
            border: 'border-orange-500/30',
            icon: 'text-orange-400',
            uploadBg: 'from-orange-600 to-red-600',
            uploadHover: 'from-orange-700 to-red-700'
        }
    };

    const config = colorConfig[color];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
                bg-gradient-to-br ${config.bg} border-2 ${config.border} rounded-xl p-4
                ${status.uploaded ? 'shadow-lg' : ''}
            `}
        >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full bg-black/30 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={config.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-sm mb-1 truncate">{title}</h4>
                    <p className="text-white/50 text-xs">{subtitle}</p>
                    {required && (
                        <span className="inline-block mt-1 text-red-400 text-xs font-bold">* مطلوب</span>
                    )}
                </div>
            </div>

            {/* Status & Actions */}
            {!status.uploaded ? (
                <div>
                    <div className="flex items-center gap-2 mb-3 p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <XCircle className="text-red-400" size={14} />
                        <span className="text-red-300 text-xs font-bold">🔴 غير متوفر</span>
                    </div>
                    <button type="button"
                        onClick={onUpload}
                        className={`
                            w-full py-2.5 rounded-lg bg-gradient-to-r ${config.uploadBg} hover:${config.uploadHover}
                            text-white text-sm font-bold transition-all flex items-center justify-center gap-2
                        `}
                    >
                        <Upload size={16} />
                        رفع المستند
                    </button>
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-2 mb-3 p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <CheckCircle2 className="text-green-400" size={14} />
                        <span className="text-green-300 text-xs font-bold">🟢 تم الرفع</span>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-white/70 text-xs truncate">📄 {status.fileName}</p>
                        <p className="text-white/50 text-xs">📅 {status.uploadDate}</p>
                        
                        <div className="flex items-center gap-2">
                            <button type="button"
                                onClick={onView}
                                className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1"
                            >
                                <Eye size={14} />
                                عرض
                            </button>
                            <button type="button"
                                onClick={onDelete}
                                className="flex-1 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                            >
                                <Trash2 size={14} />
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};
