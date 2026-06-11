import React from 'react';
import { motion } from 'motion/react';
import {
    Sparkles,
    TrendingUp,
    Gavel,
    Scale,
    Shield,
    Users,
    Building2,
    Home,
    ArrowLeftRight,
    Clock3,
    Landmark,
    CreditCard,
    ScrollText,
    X,
    type LucideIcon,
} from 'lucide-react';
import { FORUM_FILTER_LABELS, FORUM_SORT_FILTER_COUNT } from '../forumFilters';

const TOPIC_ICONS: Record<string, LucideIcon> = {
    تنفيذ: Gavel,
    مدني: Scale,
    جنائي: Shield,
    'أحوال شخصية': Users,
    شركات: Building2,
    عقاري: Home,
    معاملات: ArrowLeftRight,
    تقاعد: Clock3,
    مصارف: Landmark,
    قروض: CreditCard,
    'كاتب العدل': ScrollText,
};

interface ForumCategoryPanelProps {
    selectedFilterIndex: number;
    onFilterSelect: (index: number) => void;
    onClose: () => void;
}

export const ForumCategoryPanel = ({
    selectedFilterIndex,
    onFilterSelect,
    onClose,
}: ForumCategoryPanelProps) => {
    const activeLabel = FORUM_FILTER_LABELS[selectedFilterIndex] ?? FORUM_FILTER_LABELS[0];
    const hasTopicFilter = selectedFilterIndex >= FORUM_SORT_FILTER_COUNT;

    const handleSelect = (index: number) => {
        onFilterSelect(index);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute left-0 top-full mt-2 w-[min(360px,calc(100vw-2rem))] z-50 rounded-2xl border border-white/10 bg-[#1A1D2D]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
            role="dialog"
            aria-label="تصنيفات المنتدى"
        >
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-white font-bold text-sm">تصفية ذكية</p>
                    <p className="text-white/40 text-[11px] truncate mt-0.5">
                        {hasTopicFilter ? `التخصص: ${activeLabel}` : `الترتيب: ${activeLabel}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="إغلاق"
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="p-4 space-y-4 max-h-[min(70vh,420px)] overflow-y-auto scrollbar-hide">
                <section>
                    <p className="text-[#E6C673]/80 text-[10px] font-bold tracking-wide mb-2">ترتيب العرض</p>
                    <div className="grid grid-cols-2 gap-2">
                        {FORUM_FILTER_LABELS.slice(0, FORUM_SORT_FILTER_COUNT).map((label, index) => {
                            const isSelected = selectedFilterIndex === index;
                            const Icon = index === 0 ? Sparkles : TrendingUp;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleSelect(index)}
                                    className={`rounded-xl px-3 py-2.5 flex items-center gap-2 border text-right transition-all ${
                                        isSelected
                                            ? 'bg-[#E6C673]/15 border-[#E6C673]/40 text-[#E6C673] shadow-[0_0_20px_rgba(230,198,115,0.12)]'
                                            : 'bg-[#25293C]/80 border-white/5 text-white/60 hover:border-white/15 hover:text-white/90'
                                    }`}
                                >
                                    <span
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            isSelected ? 'bg-[#E6C673]/20' : 'bg-white/5'
                                        }`}
                                    >
                                        <Icon size={16} />
                                    </span>
                                    <span className="text-[12px] font-bold leading-tight">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[#E6C673]/80 text-[10px] font-bold tracking-wide">التخصصات القانونية</p>
                        {hasTopicFilter ? (
                            <button
                                type="button"
                                onClick={() => handleSelect(0)}
                                className="text-[10px] text-white/40 hover:text-[#E6C673] transition-colors"
                            >
                                إظهار الكل
                            </button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {FORUM_FILTER_LABELS.slice(FORUM_SORT_FILTER_COUNT).map((label, offset) => {
                            const index = offset + FORUM_SORT_FILTER_COUNT;
                            const isSelected = selectedFilterIndex === index;
                            const Icon = TOPIC_ICONS[label] ?? Scale;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleSelect(index)}
                                    className={`rounded-xl px-3 py-2.5 flex items-center gap-2 border text-right transition-all ${
                                        isSelected
                                            ? 'bg-[#E6C673]/15 border-[#E6C673]/40 text-[#E6C673] shadow-[0_0_20px_rgba(230,198,115,0.12)]'
                                            : 'bg-[#25293C]/60 border-white/5 text-white/55 hover:border-white/15 hover:text-white/90'
                                    }`}
                                >
                                    <span
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            isSelected ? 'bg-[#E6C673]/20' : 'bg-white/5'
                                        }`}
                                    >
                                        <Icon size={15} />
                                    </span>
                                    <span className="text-[11px] font-bold leading-tight">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </motion.div>
    );
};
