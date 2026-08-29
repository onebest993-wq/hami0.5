import type { ElementType } from 'react';
import { ForumToggleSwitch } from './ForumToggleSwitch';

export function ForumFollowPrefToggle({
    label,
    icon: Icon,
    checked,
    onChange,
}: {
    label: string;
    icon: ElementType;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex min-h-[44px] items-center justify-between gap-2 cursor-pointer touch-manipulation">
            <span className="flex items-center gap-1.5 text-[11px] text-white/55">
                <Icon size={12} className="text-[#E6C673]/70" aria-hidden />
                {label}
            </span>
            <span className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-end">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="peer sr-only"
                />
                <ForumToggleSwitch on={checked} />
            </span>
        </label>
    );
}
