import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

const GOLD = '#E6C673';

export const LoginGlassCard = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => (
    <div
        className={cn(
            'rounded-[24px] border transition-all duration-300 relative overflow-hidden backdrop-blur-xl',
            className,
        )}
        style={{
            backgroundColor: 'rgba(26, 30, 46, 0.88)',
            borderColor: 'rgba(230, 198, 115, 0.15)',
            boxShadow: 'rgba(230, 198, 115, 0.05) 0px 4px 30px -5px',
        }}
    >
        {children}
    </div>
);

export const LoginGoldButton = ({
    children,
    onClick,
    disabled,
    icon: Icon,
    fullWidth,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    icon?: LucideIcon;
    fullWidth?: boolean;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
            'flex items-center justify-center rounded-full px-6 py-3 font-bold transition-all',
            fullWidth && 'w-full',
            disabled && 'opacity-60 cursor-not-allowed',
        )}
        style={{
            background: `linear-gradient(135deg, ${GOLD}, #d4af37)`,
            color: '#05060D',
            boxShadow: '0 4px 20px rgba(230, 198, 115, 0.25)',
        }}
    >
        {Icon ? <Icon className="ml-2 w-5 h-5" /> : null}
        {children}
    </button>
);

export const LoginInputField = ({
    label,
    placeholder,
    value,
    onChange,
    type = 'text',
    icon: Icon,
}: {
    label: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    icon?: LucideIcon;
}) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-medium opacity-80" style={{ color: GOLD }}>
            {label}
        </label>
        <div className="relative">
            {Icon ? (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Icon size={18} />
                </div>
            ) : null}
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={cn(
                    'w-full rounded-xl bg-white/5 border px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-1 transition-all',
                    Icon && 'pr-12',
                )}
                style={{ borderColor: 'rgba(230, 198, 115, 0.2)', caretColor: GOLD }}
            />
        </div>
    </div>
);
