import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { countDocsInCategory } from '@/app/services/vaultCustomCategories';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';

interface FilterChipsProps {
    activeFilter: string;
    onChange: (filter: string) => void;
    customCategories: string[];
    onAddCategory: (name: string) => void;
    docs: SmartVaultDoc[];
}

export const FilterChips: React.FC<FilterChipsProps> = ({
    activeFilter,
    onChange,
    customCategories,
    onAddCategory,
    docs,
}) => {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const submitCategory = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        onAddCategory(trimmed);
        onChange(trimmed);
        setNewName('');
        setCreating(false);
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                    type="button"
                    onClick={() => onChange('الكل')}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                        activeFilter === 'الكل'
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                >
                    الكل
                    <span className="mr-1 text-[10px] opacity-60">({docs.length})</span>
                </button>

                {customCategories.map((category) => {
                    const count = countDocsInCategory(docs, category);
                    const isActive = activeFilter === category;
                    return (
                        <button
                            type="button"
                            key={category}
                            onClick={() => onChange(category)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                                isActive
                                    ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]'
                                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                            }`}
                        >
                            {category}
                            <span className="mr-1 text-[10px] opacity-60">({count})</span>
                        </button>
                    );
                })}

                {!creating ? (
                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border border-dashed border-[#D4AF37]/40 text-[#D4AF37]/90 hover:bg-[#D4AF37]/10 flex items-center gap-1"
                    >
                        <Plus size={12} />
                        تصنيف مخصص
                    </button>
                ) : null}
            </div>

            {creating ? (
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitCategory();
                            if (e.key === 'Escape') {
                                setCreating(false);
                                setNewName('');
                            }
                        }}
                        placeholder="اسم التصنيف الجديد..."
                        autoFocus
                        className="flex-1 bg-white/5 border border-[#D4AF37]/30 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]/50"
                    />
                    <button
                        type="button"
                        onClick={submitCategory}
                        disabled={!newName.trim()}
                        className="px-3 py-2 rounded-xl bg-[#D4AF37] text-black text-xs font-bold disabled:opacity-40"
                    >
                        إضافة
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCreating(false);
                            setNewName('');
                        }}
                        className="p-2 rounded-lg hover:bg-white/5"
                    >
                        <X size={16} className="text-white/50" />
                    </button>
                </div>
            ) : null}
        </div>
    );
};
