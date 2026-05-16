import React from 'react';
import { Edit3, Shield } from 'lucide-react';

interface AttachmentItem {
    id: string;
    isActive?: boolean;
    timing?: string;
    attachedProperty?: string;
    estimatedValue?: string;
    legalBasis?: string;
    depositAmount?: string;
    submissionDate?: string;
    notificationDate?: string;
    status?: string;
    hasGrievance?: boolean;
    grievanceDate?: string;
    grievanceOutcome?: string;
    judgmentSyncNote?: string;
}

export const AttachmentShieldCard = ({ attachments = [], onEdit }: { attachments: AttachmentItem[], onEdit?: (attachment: AttachmentItem) => void }) => {
    if (!attachments || attachments.length === 0) return null;

    const getStatusColor = (status: string) => {
        if (status.includes('بانتظار القرار')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        if (status.includes('صدر قرار بالحجز')) return 'bg-green-500/10 text-green-400 border-green-500/30';
        if (status.includes('رُفض')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
        if (status.includes('مصدق تلقائياً')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        if (status.includes('مرفوع تلقائياً')) return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
        return 'bg-white/5 text-white/60 border-white/10';
    };

    const requiresDeposit = (legalBasis: string) => legalBasis?.includes('سند عادي');

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-300 text-sm font-bold flex items-center gap-2">
                    <span className="text-red-500 text-lg animate-pulse">🔒</span>
                    إدارة الحجز والضمانات
                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {attachments.filter((a: any) => a.isActive).length} نشط
                    </span>
                </h3>
            </div>

            <div className="space-y-3">
                {attachments.map((attachment) => (
                    <div 
                        key={attachment.id} 
                        className={`bg-red-500/5 border-2 rounded-xl p-4 transition-all shadow-lg shadow-red-900/20 group ${
                            attachment.isActive 
                                ? 'border-red-500/40 hover:bg-red-500/10' 
                                : 'border-gray-500/20 opacity-60 hover:opacity-80'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-red-300 font-bold text-sm flex items-center gap-1">
                                        <span className="text-base">🔒</span>
                                        {attachment.timing}
                                    </h4>
                                </div>
                                
                                <div className="text-white/70 text-xs space-y-1 mb-2">
                                    <p className="font-bold">المال المحجوز: {attachment.attachedProperty}</p>
                                    <p>القيمة التقديرية: {parseFloat(attachment.estimatedValue).toLocaleString()} IQD</p>
                                    <p className="text-[10px] text-white/50">{attachment.legalBasis}</p>
                                </div>

                                {requiresDeposit(attachment.legalBasis) && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-yellow-200 text-[10px] font-bold mb-2">
                                        💰 الكفالة المودعة: {parseFloat(attachment.depositAmount).toLocaleString()} IQD (10%)
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-[10px] text-white/40">
                                    <span>📅 قُدم في: {attachment.submissionDate}</span>
                                    {attachment.notificationDate && (
                                        <span>• 📬 بُلغ في: {attachment.notificationDate}</span>
                                    )}
                                </div>
                            </div>
                            
                            {onEdit && (
                                <button type="button"
                                    onClick={() => onEdit(attachment)}
                                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-all"
                                    title="تعديل"
                                >
                                    <Edit3 size={14} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(attachment.status)}`}>
                                {attachment.status}
                            </span>

                            {attachment.hasGrievance && attachment.grievanceDate && (
                                <span className="bg-red-900/40 text-red-200 px-2 py-1 rounded text-[9px] font-bold border border-red-700/50">
                                    ⚖️ تظلم: {attachment.grievanceDate}
                                    {attachment.grievanceOutcome && ` • ${attachment.grievanceOutcome}`}
                                </span>
                            )}

                            {attachment.judgmentSyncNote && (
                                <span className="bg-purple-900/40 text-purple-200 px-2 py-1 rounded text-[9px] font-bold border border-purple-700/50 flex items-center gap-1">
                                    <Shield size={10} />
                                    {attachment.judgmentSyncNote}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
