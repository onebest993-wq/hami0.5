import React from 'react';
import { createPortal } from 'react-dom';
import { SMART_LAW_PICKER_OPTIONS, type SmartLawId } from '@/app/services/dossier-notes/smartLawLinker';

type SmartLawPickerMenuProps = {
    x: number;
    y: number;
    articleNum: number;
    onPick: (lawId: SmartLawId) => void;
    onClose: () => void;
};

export function SmartLawPickerMenu({ x, y, articleNum, onPick, onClose }: SmartLawPickerMenuProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <>
            <button
                type="button"
                className="fixed inset-0 z-[410] cursor-default"
                aria-label="إغلاق"
                onClick={onClose}
                data-smart-law-panel="picker-backdrop"
            />
            <div
                className="fixed z-[415] min-w-[220px] max-w-[min(92vw,280px)] -translate-x-1/2 rounded-xl border border-[#E6C673]/35 bg-[#0A0F1C]/98 py-2 shadow-2xl"
                style={{ left: x, top: y }}
                dir="rtl"
                role="menu"
                data-testid="smart-law-picker-menu"
                data-smart-law-panel="picker"
            >
                <p className="px-3 pb-2 text-[11px] font-bold text-[#E6C673] border-b border-white/[0.08] mb-1">
                    أي قانون تقصد للمادة {articleNum}؟
                </p>
                {SMART_LAW_PICKER_OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        role="menuitem"
                        className="w-full text-right px-3 py-2 text-[12px] text-white/85 hover:bg-[#E6C673]/12 hover:text-[#E6C673] transition-colors"
                        onClick={() => onPick(opt.id)}
                        data-testid={`smart-law-pick-${opt.id}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </>,
        document.body,
    );
}
