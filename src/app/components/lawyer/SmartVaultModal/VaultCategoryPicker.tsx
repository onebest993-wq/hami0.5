import React, { useMemo, useState } from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { VAULT_INPUT } from './vaultDustyRoseTheme';

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
    const [addingCustom, setAddingCustom] = useState(false);
    const [newName, setNewName] = useState('');

    const optionList = useMemo(() => {
        const trimmed = value.trim();
        const merged = [...categories];
        if (trimmed && !merged.includes(trimmed)) merged.push(trimmed);
        return merged;
    }, [categories, value]);

    const selectValue = value.trim() && optionList.includes(value.trim()) ? value.trim() : '';

    const applyNewCategory = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        onAddCategory?.(trimmed);
        onChange(trimmed);
        setNewName('');
        setAddingCustom(false);
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(e.target.value);
        setAddingCustom(false);
        setNewName('');
    };

    return (
        <div className="flex flex-col gap-2.5">
            <select
                id={id}
                value={selectValue}
                onChange={handleSelectChange}
                disabled={disabled || addingCustom}
                className={`${VAULT_INPUT} disabled:opacity-50 appearance-none cursor-pointer`}
            >
                <option value="" className="bg-[#132238]">
                    — بدون تصنيف —
                </option>
                {optionList.map((category) => (
                    <option key={category} value={category} className="bg-[#132238]">
                        {category}
                    </option>
                ))}
            </select>

            {!addingCustom ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        setAddingCustom(true);
                        setNewName('');
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border-0 bg-white/[0.04] px-3 py-2 min-h-[44px] text-xs font-medium text-[#E6C673] transition-colors hover:bg-[#E6C673]/10 disabled:opacity-40"
                >
                    <Plus size={14} />
                    إضافة تصنيف مخصص
                </button>
            ) : (
                <div className="flex flex-col gap-2 rounded-xl bg-white/[0.04] p-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                applyNewCategory();
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                setAddingCustom(false);
                                setNewName('');
                            }
                        }}
                        placeholder="اسم التصنيف الجديد..."
                        autoFocus
                        disabled={disabled}
                        className={`${VAULT_INPUT} disabled:opacity-50`}
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setAddingCustom(false);
                                setNewName('');
                            }}
                            disabled={disabled}
                            className="flex-1 min-h-[44px] rounded-xl border-0 bg-white/[0.05] py-2 text-xs font-medium text-white/55 disabled:opacity-40"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={applyNewCategory}
                            disabled={disabled || !newName.trim()}
                            className="flex flex-1 min-h-[44px] items-center justify-center gap-1 rounded-xl border-0 bg-[#E6C673] py-2 text-xs font-medium text-[#0A0F1C] disabled:opacity-40"
                        >
                            <Plus size={14} />
                            حفظ التصنيف
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
