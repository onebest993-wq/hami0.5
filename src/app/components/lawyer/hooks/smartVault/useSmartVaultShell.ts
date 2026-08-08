import { useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

type UseSmartVaultShellParams = {
    onClose: () => void;
    currentUserId: string;
    embedded?: boolean;
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    filteredDocs: unknown[];
    isSearching: boolean;
    setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useSmartVaultShell({
    onClose,
    currentUserId,
    embedded,
    searchQuery,
    setSearchQuery,
    filteredDocs,
    isSearching,
    setIsSearching,
}: UseSmartVaultShellParams) {
    const [mounted, setMounted] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useBodyScrollLock(mounted && !embedded);

    useEffect(() => {
        setMounted(true);
        return () => setOpenDropdownId(null);
    }, []);

    useEffect(() => {
        if (!mounted || currentUserId || embedded) return;
        SmartToast.error('┘è╪▒╪ش┘ë ╪ز╪│╪ش┘è┘ ╪د┘╪»╪«┘ê┘ ╪ث┘ê┘╪د┘ï ┘╪د╪│╪ز╪«╪»╪د┘à ╪د┘┘à╪│╪ز┘ê╪»╪╣ ╪د┘╪░┘â┘è');
        onClose();
    }, [mounted, currentUserId, onClose, embedded]);

    const handleAISearch = async () => {
        if (!searchQuery.trim()) return;
        if (embedded) return;
        setIsSearching(true);
        await new Promise((r) => setTimeout(r, 120));
        if (filteredDocs.length === 0) {
            SmartToast.info('┘┘à ┘è╪ز┘à ╪د┘╪╣╪س┘ê╪▒ ╪╣┘┘ë ┘╪ز╪د╪خ╪ش ┘à╪╖╪د╪ذ┘é╪ر');
        }
        setIsSearching(false);
    };

    const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (embedded) {
            if (e.key === 'Escape') setSearchQuery('');
            return;
        }
        if (e.key === 'Enter') void handleAISearch();
    };

    return {
        mounted,
        openDropdownId,
        setOpenDropdownId,
        searchInputRef,
        handleAISearch,
        handleSearchSubmit,
        isSearching,
    };
}
