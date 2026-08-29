import { useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';

export function useUploadDocumentModalTypeMenu(
    isTypeMenuOpen: boolean,
    typeMenuRef: MutableRefObject<HTMLDivElement | null>,
    setIsTypeMenuOpen: Dispatch<SetStateAction<boolean>>,
) {
    useEffect(() => {
        if (!isTypeMenuOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!typeMenuRef.current?.contains(event.target as Node)) {
                setIsTypeMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsTypeMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isTypeMenuOpen, setIsTypeMenuOpen, typeMenuRef]);
}
