import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { countDocsInCategory } from '@/app/services/vaultCustomCategories';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { VAULT_CHIP_ACTIVE, VAULT_CHIP_IDLE, VAULT_INPUT } from './vaultDustyRoseTheme';

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

    const chipBase = 'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border';

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                    type="button"
                    onClick={() => onChange('الكل')}
                    className={`${chipBase} ${activeFilter === 'الكل' ? VAULT_CHIP_ACTIVE : VAULT_CHIP_IDLE}`}
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
                            className={`${chipBase} ${isActive ? VAULT_CHIP_ACTIVE : VAULT_CHIP_IDLE}`}
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
                        className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border border-dashed border-[#B8A078]/35 text-[#B8A078]/90 hover:bg-[#B8A078]/8 flex items-center gap-1"
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
                        className={`flex-1 ${VAULT_INPUT}`}
                    />
                    <button
                        type="button"
                        onClick={submitCategory}
                        disabled={!newName.trim()}
                        className="px-3 py-2 rounded-xl bg-[#C9A9A6]/25 border border-[#C9A9A6]/40 text-[#F7F3EB] text-xs font-bold disabled:opacity-40"
                    >
                        إضافة
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCreating(false);
                            setNewName('');
                        }}
                        className="p-2 rounded-lg hover:bg-[#4A4440]/40"
                    >
                        <X size={16} className="text-[#C9A9A6]/60" />
                    </button>
                </div>
            ) : null}
        </div>
    );
};
