import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

export const VAULT_CATEGORY_PICKER_NEW = '__vault_new_category__';

interface VaultCategoryPickerProps {
    categories: string[];
    value: string;
    onChange: (classification: string) => void;
    onAddCategory?: (name: string) => void;
    disabled?: boolean;
    id?: string;
}

export const VaultCategoryPicker: React.FC<VaultCategoryPickerProps> = ({
    categories,
    value,
    onChange,
    onAddCategory,
    disabled = false,
    id = 'vault-category-picker',
}) => {
    const [newName, setNewName] = useState('');

    const optionList = useMemo(() => {
        const trimmed = value.trim();
        const merged = [...categories];
        if (trimmed && !merged.includes(trimmed)) merged.push(trimmed);
        return merged;
    }, [categories, value]);

    const selectValue = useMemo(() => {
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (optionList.includes(trimmed)) return trimmed;
        return VAULT_CATEGORY_PICKER_NEW;
    }, [value, optionList]);

    const showNewInput = selectValue === VAULT_CATEGORY_PICKER_NEW;

    useEffect(() => {
        if (showNewInput && value.trim() && !categories.includes(value.trim())) {
            setNewName(value.trim());
        } else if (!showNewInput) {
            setNewName('');
        }
    }, [showNewInput, value, categories]);

    const applyNewCategory = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        onAddCategory?.(trimmed);
        onChange(trimmed);
        setNewName('');
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const picked = e.target.value;
        if (picked === '') {
            onChange('');
            setNewName('');
            return;
        }
        if (picked === VAULT_CATEGORY_PICKER_NEW) {
            onChange('');
            setNewName('');
            return;
        }
        onChange(picked);
        setNewName('');
    };

    return (
        <div className="flex flex-col gap-2">
            <select
                id={id}
                value={selectValue}
                onChange={handleSelectChange}
                disabled={disabled}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40 disabled:opacity-50 appearance-none cursor-pointer"
            >
                <option value="" className="bg-[#1A1E2E]">
                    — بدون تصنيف —
                </option>
                {optionList.map((category) => (
                    <option key={category} value={category} className="bg-[#1A1E2E]">
                        {category}
                    </option>
                ))}
                <option value={VAULT_CATEGORY_PICKER_NEW} className="bg-[#1A1E2E]">
                    + إضافة تصنيف مخصص
                </option>
            </select>

            {showNewInput ? (
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                applyNewCategory();
                            }
                        }}
                        placeholder="اسم التصنيف الجديد..."
                        autoFocus
                        disabled={disabled}
                        className="flex-1 bg-white/5 border border-[#D4AF37]/30 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]/50 disabled:opacity-50"
                    />
                    <button
                        type="button"
                        onClick={applyNewCategory}
                        disabled={disabled || !newName.trim()}
                        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-[#D4AF37] text-black text-xs font-bold disabled:opacity-40"
                    >
                        <Plus size={14} />
                        إضافة
                    </button>
                </div>
            ) : null}
        </div>
    );
};
