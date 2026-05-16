import React from 'react';
import { Calendar, FileText, Paperclip } from 'lucide-react';

export const QuickActions = ({ onAction, onPause, onOpenLegalActions }: { onAction: (type: string) => void, onPause: () => void, onOpenLegalActions: () => void }) => {
    const actions = [
        { id: 'appointment', icon: Calendar, label: 'موعد جديد', color: 'text-[#E6C673]', bg: 'bg-[#1A1E2E] hover:bg-[#252a3d] border-[#E6C673]/20 shadow-lg shadow-black/20' },
        { id: 'note', icon: FileText, label: 'ملاحظة', color: 'text-[#E6C673]', bg: 'bg-[#1A1E2E] hover:bg-[#252a3d] border-[#E6C673]/20 shadow-lg shadow-black/20' },
        { id: 'document', icon: Paperclip, label: 'مستند', color: 'text-[#E6C673]', bg: 'bg-[#1A1E2E] hover:bg-[#252a3d] border-[#E6C673]/20 shadow-lg shadow-black/20' },
    ];

    return (
        <>
            <div className="grid grid-cols-4 gap-2 mb-3">
                {actions.map(action => (
                    <button type="button"
                        key={action.id}
                        onClick={() => onAction(action.id)}
                        className={`flex flex-col items-center justify-center gap-1.5 h-14 rounded-lg border border-white/5 hover:border-white/20 transition-all ${action.bg} group hover:scale-105`}
                    >
                        <action.icon size={14} className={`${action.color} group-hover:scale-110 transition-transform`} />
                        <span className="text-[10px] font-medium text-white/70 whitespace-nowrap">{action.label}</span>
                    </button>
                ))}
                 <button type="button" 
                    onClick={onOpenLegalActions} 
                    className="flex flex-col items-center justify-center gap-1.5 h-14 rounded-lg border border-indigo-500/30 bg-indigo-900/10 hover:bg-indigo-900/20 hover:border-indigo-400 transition-all group hover:scale-105"
                > 
                    <span className="text-sm group-hover:scale-110 transition-transform">⚖️</span> 
                    <span className="text-[10px] font-bold text-indigo-400 whitespace-nowrap">إجراءات الدعوى</span> 
                </button>
            </div>
            
            {/* 🔥 REDESIGNED: Fast-Track & Attachment Buttons - Elegant Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button type="button" 
                    onClick={() => onAction('fast_track')} 
                    className="flex items-center justify-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl py-3 text-sm font-bold transition-all group hover:scale-[1.02]"
                > 
                    <span className="text-lg group-hover:scale-110 transition-transform">⚡</span> 
                    <span className="whitespace-nowrap">طلب مستعجل / ولائي</span> 
                </button>

                <button type="button" 
                    onClick={() => onAction('attachment_shield')} 
                    className="flex items-center justify-center gap-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl py-3 text-sm font-bold transition-all group hover:scale-[1.02]"
                > 
                    <span className="text-lg group-hover:scale-110 transition-transform">🔒</span> 
                    <span className="whitespace-nowrap">طلب حجز احتياطي</span> 
                </button>
            </div>
        </>
    );
};
