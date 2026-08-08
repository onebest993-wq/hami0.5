import React from 'react';
import { Edit3 } from '@/app/components/ui/lucideIcons';

interface FastTrackPetition {
    id: string;
    requestType?: string;
    subject?: string;
    submissionDate?: string;
    status?: string;
    grievanceDate?: string;
    grievanceTime?: string;
    grievanceOutcome?: string;
}

export const FastTrackPetitionsList = ({ petitions = [], onEdit }: { petitions: FastTrackPetition[], onEdit?: (petition: FastTrackPetition) => void }) => {
    if (!petitions || petitions.length === 0) return null;

    const getStatusColor = (status: string) => {
        if (status.includes('قيد الانتظار')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        if (status.includes('صدر قرار بالقبول')) return 'bg-green-500/10 text-green-400 border-green-500/30';
        if (status.includes('صدر قرار بالرفض')) return 'bg-red-500/10 text-red-400 border-red-500/30';
        if (status.includes('قيد نظر التظلم')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        return 'bg-white/5 text-white/60 border-white/10';
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-300 text-sm font-bold flex items-center gap-2">
                    <span className="text-amber-500 text-lg animate-pulse">⚡</span>
                    الطلبات المستعجلة / الولائية
                    <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {petitions.length}
                    </span>
                </h3>
            </div>

            <div className="space-y-3">
                {petitions.map((petition) => (
                    <div 
                        key={petition.id} 
                        className="bg-amber-500/5 border-2 border-amber-500/30 rounded-xl p-4 hover:bg-amber-500/10 transition-all shadow-lg shadow-amber-900/20 group"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-amber-300 font-bold text-sm flex items-center gap-1">
                                        <span className="text-base">⚡</span>
                                        {petition.requestType}
                                    </h4>
                                </div>
                                <p className="text-white/70 text-xs leading-relaxed mb-2">
                                    {petition.subject}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-white/40">
                                    <span>📅 قُدم في: {petition.submissionDate}</span>
                                </div>
                            </div>
                            {onEdit && (
                                <button type="button"
                                    onClick={() => onEdit(petition)}
                                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 p-2 rounded-lg hover:bg-amber-500/20 text-amber-400 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    title="تعديل"
                                >
                                    <Edit3 size={14} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(petition.status)}`}>
                                {petition.status}
                            </span>

                            {petition.status === '⚖️ قيد نظر التظلم' && petition.grievanceDate && (
                                <span className="bg-amber-900/40 text-amber-200 px-2 py-1 rounded text-[9px] font-bold border border-amber-700/50">
                                    جلسة التظلم: {petition.grievanceDate} {petition.grievanceTime && `⏰ ${petition.grievanceTime}`}
                                </span>
                            )}

                            {petition.grievanceOutcome && (
                                <span className="bg-slate-700/40 text-slate-200 px-2 py-1 rounded text-[9px] font-bold border border-slate-600/50">
                                    النتيجة: {petition.grievanceOutcome}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
