import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ChevronLeft, X, AlertTriangle } from 'lucide-react';
import { getThemeStyles } from './constants';
import type { SmartAlert } from './types';

interface AlertCardItemProps {
    alert: SmartAlert;
    onAction: (alert: SmartAlert) => void;
    onDismiss: (alertId: string) => void;
}

export const AlertCardItem: React.FC<AlertCardItemProps> = React.memo(({ alert, onAction, onDismiss }) => {
    const theme = getThemeStyles(alert.colorTheme || 'amber');
    const Icon = alert.icon || AlertTriangle;

    return (
        <div className="flex-[0_0_100%] min-w-0 px-1 relative" dir="rtl">
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-[#0F172A]/60 backdrop-blur-[30px] border border-[#D4AF37] rounded-[18px] p-4 flex flex-col gap-2 shadow-xl relative overflow-hidden pb-8 select-none cursor-grab active:cursor-grabbing"
            >
                <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[50px] opacity-20 ${theme.bg.replace('/10', '')}`} />

                <div className="flex justify-between items-center w-full relative z-10">
                    <div className={`${theme.badgeBg} ${theme.badgeText} px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm border border-white/5`}>
                        {alert.timeLabel}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-white/40 text-[9px] font-medium tracking-wide">
                            👤 {alert.clientName || '—'} | 📁 {alert.caseNo || '—'}
                        </div>
                        <button type="button"
                            onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
                            className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/20 transition-colors"
                            title="إخفاء التنبيه"
                        >
                            <X size={10} className="text-white/50" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme.bg} ${theme.border} border shadow-[0_0_15px_rgba(255,215,0,0.1)]`}>
                        <Icon size={20} className="drop-shadow-[0_0_8px_currentColor]" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-white font-bold text-sm leading-tight">{alert.title}</h3>
                        <p className="text-white/80 text-[10px] leading-relaxed line-clamp-2">{alert.description}</p>
                    </div>
                </div>

                <div className="flex-1" />

                <div className="w-full relative z-10 pt-1.5 border-t border-white/5">
                    <button type="button" 
                        onClick={() => onAction(alert)}
                        className="w-full py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 bg-transparent border border-[#D4AF37] active:scale-[0.98] transition-all"
                    >
                        <span className="text-white">{alert.actionLabel}</span>
                        <ChevronLeft size={14} className="text-white" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
});

AlertCardItem.displayName = 'AlertCardItem';

interface CarouselDotsProps {
    count: number;
    active: number;
}

export const CarouselDots: React.FC<CarouselDotsProps> = ({ count, active }) => {
    if (count <= 1) return null;
    return (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20 pointer-events-none">
            {Array.from({ length: count }, (_, idx) => (
                <motion.div 
                    key={idx}
                    layout
                    initial={false}
                    animate={{ 
                        backgroundColor: idx === active ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                        width: idx === active ? 24 : 8,
                        height: 6,
                    }}
                    transition={{ type: "spring", damping: 15, stiffness: 300 }}
                    className="rounded-full shadow-sm"
                />
            ))}
        </div>
    );
};

export const EmptyAlertsCard: React.FC = () => (
    <div className="w-full bg-[#0F172A]/60 backdrop-blur-[30px] border border-[#D4AF37] rounded-[18px] p-4 flex flex-col gap-3 shadow-xl relative overflow-hidden select-none">
        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[50px] opacity-20 bg-amber-500" />
        <div className="flex items-start gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 border-amber-500/20 border shadow-[0_0_15px_rgba(255,215,0,0.1)]">
                <ShieldAlert size={20} className="text-amber-400" />
            </div>
            <div className="flex flex-col gap-0.5">
                <h3 className="text-white font-bold text-sm leading-tight">لا توجد تنبيهات عاجلة</h3>
                <p className="text-white/70 text-[11px] leading-relaxed line-clamp-2">
                    لا توجد مواعيد نهائية أو جلسات قريبة أو مستندات ناقصة تستحق التنبيه حالياً.
                </p>
            </div>
        </div>
    </div>
);
