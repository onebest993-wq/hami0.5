import type { RefObject } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LawsuitLifecycleIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import type { GlobalSearchNavigate } from '@/app/services/globalSearchIndex';
import type { GlobalSearchOverlayShellContentProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

export interface GlobalSearchOverlayProps {
    /** يتحكم في حركة الدخول/الخروج — يبقى المكوّن mounted حتى ينتهي exit */
    open?: boolean;
    /**
     * أبقِ DOM الطبقة مركّباً ومخفياً أثناء الإغلاق — الفتح = إظهار فوري بلا إعادة تركيب.
     * يُمرَّر من Host عند keepAlive.
     */
    keepWarm?: boolean;
    onExitComplete?: () => void;
    onClose: () => void;
    onNavigate: (navigate: GlobalSearchNavigate) => void;
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    lawsuitLifecycleIndex?: LawsuitLifecycleIndex;
    globalNotes: { id: number | string; title?: string; body?: string; type?: string }[];
    notifications?: { id: string; title: string; message: string; type: string }[];
    criminalCases?: unknown[];
    userId: string | null;
    initialQuery?: string;
    indexVersion?: number;
    searchSessionKey?: number;
    /** Host يملك StaticShell — لا إعادة تركيب عند وصول الـ chunk */
    headless?: boolean;
    onShellContent?: (content: GlobalSearchOverlayShellContentProps) => void;
    shellOverlayRef?: RefObject<HTMLDivElement | null>;
    shellInputRef?: RefObject<HTMLInputElement | null>;
    focusArmed?: boolean;
}

export type { GlobalSearchNavigate };
