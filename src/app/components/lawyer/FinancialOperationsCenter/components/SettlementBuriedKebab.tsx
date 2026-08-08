import React from 'react';
import { MoreVertical } from '@/app/components/ui/lucideIcons';

export interface SettlementBuriedKebabProps {
    onActivate: () => void;
}

export const SettlementBuriedKebab: React.FC<SettlementBuriedKebabProps> = ({ onActivate }) => {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                aria-label="خيارات الوعاء"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-200"
            >
                <MoreVertical size={14} strokeWidth={2} />
            </button>
            {open ? (
                <div className="absolute left-0 top-full z-30 mt-1 min-w-[168px] overflow-hidden rounded-xl border border-white/10 bg-[#0A1122]/95 py-1 shadow-xl shadow-black/40 backdrop-blur-xl">
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            onActivate();
                        }}
                        className="flex w-full flex-row-reverse items-center gap-2 px-3 py-2 text-right text-[11px] font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-cyan-200"
                    >
                        عرض تسوية مالية
                    </button>
                </div>
            ) : null}
        </div>
    );
};
