import React from 'react';
import { motion } from 'motion/react';
import { Scale } from 'lucide-react';
import {
    REPOSITORY_DOCUMENT_TYPES,
    REPOSITORY_SORT_OPTIONS,
    REPOSITORY_TOPIC_FILTERS,
    REPOSITORY_TOPIC_ICONS,
    REPOSITORY_TYPE_ICONS,
    repositoryFilterSummary,
    type RepositorySortKey,
} from '../repositoryListFilters';

interface RepositoryFilterPanelProps {
    sortBy: RepositorySortKey;
    selectedType: string;
    selectedTag: string | null;
    onSortChange: (value: RepositorySortKey) => void;
    onTypeChange: (value: string) => void;
    onTagChange: (tag: string | null) => void;
    onClose: () => void;
}

export const RepositoryFilterPanel = ({
    sortBy,
    selectedType,
    selectedTag,
    onSortChange,
    onTypeChange,
    onTagChange,
    onClose,
}: RepositoryFilterPanelProps) => {
    const handleSort = (value: RepositorySortKey) => {
        onSortChange(value);
        onClose();
    };

    const handleType = (value: string) => {
        onTypeChange(value);
        onClose();
    };

    const handleTag = (tag: string) => {
        onTagChange(selectedTag === tag ? null : tag);
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
            aria-label="تصفية المستودع"
        >
            <div className="px-4 py-3 border-b border-white/5">
                <p className="text-white font-bold text-sm">تصفية المستودع</p>
                <p className="text-white/40 text-[11px] truncate mt-0.5">
                    {repositoryFilterSummary(selectedType, sortBy, selectedTag)}
                </p>
            </div>

            <div className="p-4 space-y-4 max-h-[min(70vh,420px)] overflow-y-auto scrollbar-hide">
                <section>
                    <p className="text-[#E6C673]/80 text-[10px] font-bold tracking-wide mb-2">ترتيب العرض</p>
                    <div className="grid grid-cols-1 gap-2">
                        {REPOSITORY_SORT_OPTIONS.map(({ value, label, icon: Icon }) => {
                            const isSelected = sortBy === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => handleSort(value)}
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
                        {selectedTag ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onTagChange(null);
                                    onClose();
                                }}
                                className="text-[10px] text-white/40 hover:text-[#E6C673] transition-colors"
                            >
                                إظهار الكل
                            </button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {REPOSITORY_TOPIC_FILTERS.map((label) => {
                            const isSelected = selectedTag === label;
                            const Icon = REPOSITORY_TOPIC_ICONS[label] ?? Scale;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleTag(label)}
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

                <section>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[#E6C673]/80 text-[10px] font-bold tracking-wide">نوع المستند</p>
                        {selectedType !== 'الكل' ? (
                            <button
                                type="button"
                                onClick={() => handleType('الكل')}
                                className="text-[10px] text-white/40 hover:text-[#E6C673] transition-colors"
                            >
                                إظهار الكل
                            </button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {REPOSITORY_DOCUMENT_TYPES.map((type) => {
                            const isSelected = selectedType === type;
                            const Icon = REPOSITORY_TYPE_ICONS[type] ?? REPOSITORY_TYPE_ICONS['أخرى'];
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleType(type)}
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
                                    <span className="text-[11px] font-bold leading-tight">{type}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </motion.div>
    );
};
