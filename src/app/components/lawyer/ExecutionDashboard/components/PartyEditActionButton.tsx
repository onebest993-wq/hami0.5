import React, { useCallback } from 'react';

type PartyEditActionButtonProps = {
    onOpen: () => void;
    className?: string;
    children: React.ReactNode;
};

/** زر تعديل طرف — onClick صريح لتجاوز تعطيل النقرات داخل backdrop-filter */
export function PartyEditActionButton({ onOpen, className, children }: PartyEditActionButtonProps) {
    const handleOpen = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen();
        },
        [onOpen]
    );

    return (
        <button type="button" className={className} onClick={handleOpen}>
            {children}
        </button>
    );
}
