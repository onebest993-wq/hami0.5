import React from 'react';

type HeirsQuickViewTriggerProps = {
    label: string;
    onOpen: () => void;
    className?: string;
};

/** زر عرض الورثة — منفصل عن منطقة توسيع البطاقة لتفادي ابتلاع النقر */
export function HeirsQuickViewTrigger({ label, onOpen, className }: HeirsQuickViewTriggerProps) {
    return (
        <button
            type="button"
            className={
                className ??
                'shrink-0 text-amber-500 text-xl font-bold cursor-pointer hover:underline bg-transparent border-0 p-0'
            }
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpen();
            }}
        >
            {label}
        </button>
    );
}
