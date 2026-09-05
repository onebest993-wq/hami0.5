import { useEffect, useRef } from 'react';
import type { LawyerDashboardWorkspaceStem } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStem.types';
import { useLawyerDashboardWorkspaceStem } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceStem';

type LawyerDashboardWorkspaceStemLayerProps = {
    localAutoSave: boolean;
    backgroundRuntimeEnabled: boolean;
    onStemChange: (stem: LawyerDashboardWorkspaceStem) => void;
};

function stemSnapshotEqual(a: LawyerDashboardWorkspaceStem, b: LawyerDashboardWorkspaceStem): boolean {
    return (
        a.files === b.files &&
        a.activeFile === b.activeFile &&
        a.lawsuitStorageHydrated === b.lawsuitStorageHydrated &&
        a.lawsuitSegments === b.lawsuitSegments &&
        a.lawsuitArchivedFiles === b.lawsuitArchivedFiles &&
        a.lawsuitTrashFiles === b.lawsuitTrashFiles &&
        a.commitLawsuitLifecycleMutation === b.commitLawsuitLifecycleMutation
    );
}

/** يُحمَّل ديناميكياً — يحوي hydrate ملفات الدعاوى خارج إغلاق المنزل الأول. */
export function LawyerDashboardWorkspaceStemLayer({
    localAutoSave,
    backgroundRuntimeEnabled,
    onStemChange,
}: LawyerDashboardWorkspaceStemLayerProps) {
    const stem = useLawyerDashboardWorkspaceStem({ localAutoSave, backgroundRuntimeEnabled });
    const lastSyncRef = useRef<LawyerDashboardWorkspaceStem | null>(null);

    useEffect(() => {
        const prev = lastSyncRef.current;
        if (prev && stemSnapshotEqual(prev, stem)) return;
        lastSyncRef.current = stem;
        onStemChange(stem);
    }, [onStemChange, stem]);

    return null;
}
