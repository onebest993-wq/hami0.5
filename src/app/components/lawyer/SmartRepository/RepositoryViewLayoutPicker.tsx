import React, { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, List } from '@/app/components/ui/lucideIcons';
import {
    normalizeRepositoryFeedLayout,
    type RepositoryFeedLayoutId,
} from './repositoryFeedLayout';

const PRIMARY_LAYOUTS: Array<{
    id: Extract<RepositoryFeedLayoutId, 'grid' | 'list'>;
    label: string;
    icon: React.ReactNode;
}> = [
    { id: 'grid', label: 'شبكة', icon: <LayoutGrid size={16} strokeWidth={2.25} aria-hidden /> },
    { id: 'list', label: 'قائمة', icon: <List size={16} strokeWidth={2.25} aria-hidden /> },
];

type RepositoryViewLayoutPickerProps = {
    layoutId: RepositoryFeedLayoutId;
    onSelect: (id: RepositoryFeedLayoutId) => void;
    disabled?: boolean;
};

export function RepositoryViewLayoutPicker({
    layoutId,
    onSelect,
    disabled = false,
}: RepositoryViewLayoutPickerProps) {
    const normalizedLayoutId = normalizeRepositoryFeedLayout(layoutId);
    const [activeId, setActiveId] = useState(normalizedLayoutId);

    useEffect(() => {
        setActiveId(normalizedLayoutId);
    }, [normalizedLayoutId]);

    const pick = useCallback(
        (id: Extract<RepositoryFeedLayoutId, 'grid' | 'list'>) => {
            if (disabled) return;
            const next = normalizeRepositoryFeedLayout(id);
            if (next === activeId) return;
            setActiveId(next);
            onSelect(next);
        },
        [activeId, disabled, onSelect],
    );

    return (
        <div
            className={`hami-repository-view-segment shrink-0 ${disabled ? 'hami-repository-view-segment--disabled' : ''}`}
            role="radiogroup"
            aria-label="شكل عرض البطاقات"
            data-testid="repository-view-segment"
        >
            {PRIMARY_LAYOUTS.map((opt) => {
                const active = opt.id === activeId;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        data-testid={`repository-layout-${opt.id}`}
                        title={opt.label}
                        aria-label={opt.label}
                        disabled={disabled}
                        onClick={(event) => {
                            event.stopPropagation();
                            pick(opt.id);
                        }}
                        className={`hami-repository-view-segment__btn touch-manipulation ${
                            active ? 'hami-repository-view-segment__btn--active' : ''
                        }`}
                    >
                        {opt.icon}
                        <span className="sr-only">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
