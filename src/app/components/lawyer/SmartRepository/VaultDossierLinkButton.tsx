import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link2, Loader2 } from 'lucide-react';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import { REPO_TOUCH_CHIP } from './smartRepositoryTheme';

type VaultDossierLinkButtonProps = {
    dossiers: DossierPickerOption[];
    disabled?: boolean;
    onConfirm: (dossier: DossierPickerOption) => Promise<void>;
};

export function VaultDossierLinkButton({
    dossiers,
    disabled,
    onConfirm,
}: VaultDossierLinkButtonProps) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [query, setQuery] = useState('');
    const anchorRef = useRef<HTMLButtonElement>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280 });

    useEffect(() => {
        if (!open || !anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        setMenuPos({
            top: rect.bottom + 6,
            left: Math.max(8, rect.right - 280),
            width: 280,
        });
    }, [open]);

    useEffect(() => () => setOpen(false), []);

    const filtered = dossiers.filter((d) => {
        const q = query.trim();
        if (!q) return true;
        return d.label.includes(q) || d.subtitle.includes(q);
    });

    const handlePick = async (dossier: DossierPickerOption) => {
        setBusy(true);
        try {
            await onConfirm(dossier);
            setOpen(false);
            setQuery('');
        } finally {
            setBusy(false);
        }
    };

    const menu = open ? (
        <div
            className="fixed z-[136] rounded-2xl border border-[#B87333]/25 bg-[#0a0f1c]/96 backdrop-blur-xl shadow-2xl p-2"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
            dir="rtl"
            data-testid="vault-dossier-link-menu"
        >
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن إضبارة…"
                className="w-full mb-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm outline-none focus:border-[#E6C673]/35"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.length === 0 ? (
                    <p className="text-xs text-white/45 text-center py-4">لا توجد أضابير مطابقة</p>
                ) : (
                    filtered.map((d) => (
                        <button
                            key={`${d.kind}:${d.id}`}
                            type="button"
                            disabled={busy}
                            onClick={() => void handlePick(d)}
                            className="w-full text-right px-3 min-h-[44px] inline-flex flex-col justify-center rounded-xl hover:bg-white/[0.06] disabled:opacity-50 touch-manipulation"
                        >
                            <span className="block text-sm font-bold text-white truncate">{d.label}</span>
                            <span className="block text-[10px] text-white/45">{d.subtitle}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    ) : null;

    const backdrop =
        open && typeof document !== 'undefined' ? (
            <button
                type="button"
                className="fixed inset-0 z-[135] cursor-default bg-transparent"
                aria-label="إغلاق القائمة"
                onClick={() => setOpen(false)}
            />
        ) : null;

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                disabled={disabled || busy || dossiers.length === 0}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                className={`${REPO_TOUCH_CHIP} gap-1.5 px-2.5 rounded-lg text-[10px] font-bold bg-[#E6C673]/12 border border-[#E6C673]/28 text-[#E6C673] hover:bg-[#E6C673]/20 disabled:opacity-40 relative z-[2] pointer-events-auto`}
                data-testid="vault-link-dossier-btn"
            >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                ربط بإضبارة
            </button>
            {backdrop ? createPortal(backdrop, document.body) : null}
            {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
        </>
    );
}
