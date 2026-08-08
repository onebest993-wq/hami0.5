import React, { useMemo, useState } from 'react';
import { Plus } from '@/app/components/ui/lucideIcons';
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
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#B87333]/30 bg-[#0E1B2E]/30 px-3 py-2 text-xs font-bold text-[#C4926A] transition-colors hover:border-[#B87333]/50 hover:bg-[#B87333]/8 disabled:opacity-40"
                >
                    <Plus size={14} />
                    إضافة تصنيف مخصص
                </button>
            ) : (
                <div className="flex flex-col gap-2 rounded-xl border border-[#B87333]/22 bg-[#0E1B2E]/35 p-3">
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
                            className="flex-1 rounded-xl border border-[#D9CFC0]/15 bg-[#132238]/60 py-2 text-xs font-bold text-[#C9BCA8] disabled:opacity-40"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={applyNewCategory}
                            disabled={disabled || !newName.trim()}
                            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#B87333]/35 bg-[#B87333]/20 py-2 text-xs font-bold text-[#E8E4DC] disabled:opacity-40"
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
