import { useRef, useState } from 'react';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';

export function useLawyerDashboardArchiveAndSyncRefs() {
    const [archiveType, setArchiveType] = useState<LawyerArchiveOverlay>(null);
    const syncExecutionFilesNowRef = useRef<() => void>(() => {});
    const syncLawsuitFilesNowRef = useRef<() => void>(() => {});
    const syncNotesNowRef = useRef<() => void>(() => {});

    return {
        archiveType,
        setArchiveType,
        syncExecutionFilesNowRef,
        syncLawsuitFilesNowRef,
        syncNotesNowRef,
    };
}
