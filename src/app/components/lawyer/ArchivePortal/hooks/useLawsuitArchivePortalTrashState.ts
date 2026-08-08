import { useCallback, useEffect, useRef, useState } from 'react';
import type { LawsuitLifecycleCounts } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import type { LooseArchiveFile } from '../types';
import type { LawsuitViewMode } from './lawsuitLifecycleTypes';

type TrashUiParams = {
    lawsuitLifecycleCounts?: LawsuitLifecycleCounts;
    onEnsureLawsuitArchivedLoaded?: () => void | Promise<void>;
    onEnsureLawsuitTrashLoaded?: () => void | Promise<void>;
    onPermanentlyDeleteLawsuits?: (ids: Array<string | number>) => void;
    onMoveLawsuitToTrash?: (id: string | number) => void;
    onArchiveLawsuit?: (id: string | number) => void;
    onRestoreLawsuitFromTrash?: (id: string | number) => void;
};

export function useLawsuitArchivePortalTrashState({
    lawsuitLifecycleCounts,
    onEnsureLawsuitArchivedLoaded,
    onEnsureLawsuitTrashLoaded,
    onPermanentlyDeleteLawsuits,
    onMoveLawsuitToTrash,
    onArchiveLawsuit,
    onRestoreLawsuitFromTrash,
}: TrashUiParams) {
    const [criminalDeleteTarget, setCriminalDeleteTarget] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const [lawsuitViewMode, setLawsuitViewMode] = useState<LawsuitViewMode>('active');
    const [lawsuitTrashConfirmTarget, setLawsuitTrashConfirmTarget] = useState<LooseArchiveFile | null>(
        null,
    );
    const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
    const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
    const permanentIdsRef = useRef<Array<string | number>>([]);

    const lawsuitTrashedCount = lawsuitLifecycleCounts?.trash ?? 0;

    useEffect(() => {
        if (lawsuitViewMode === 'archived') {
            void onEnsureLawsuitArchivedLoaded?.();
        }
        if (lawsuitViewMode === 'trash') {
            void onEnsureLawsuitTrashLoaded?.();
        }
    }, [lawsuitViewMode, onEnsureLawsuitArchivedLoaded, onEnsureLawsuitTrashLoaded]);

    useEffect(() => {
        if (lawsuitViewMode !== 'trash') setSelectedTrashIds(new Set());
    }, [lawsuitViewMode]);

    const toggleTrashSelect = useCallback((id: string | number) => {
        const k = String(id);
        setSelectedTrashIds((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }, []);

    const getTitle = () => {
        if (lawsuitViewMode === 'trash') return 'سلة مهملات الإضابير';
        if (lawsuitViewMode === 'archived') return 'مخزن أرشيف الإضابير';
        return 'إدارة الدعاوى القضائية (الشاملة) ⚖️';
    };

    const beginPermanentDeleteForIds = useCallback(
        (ids: Array<string | number>) => {
            if (ids.length === 0) return;
            if (!onPermanentlyDeleteLawsuits) return;
            permanentIdsRef.current = ids;
            setPermanentDeleteOpen(true);
        },
        [onPermanentlyDeleteLawsuits],
    );

    const confirmPermanentDelete = useCallback(() => {
        const ids = permanentIdsRef.current;
        if (ids.length === 0) {
            setPermanentDeleteOpen(false);
            return;
        }
        onPermanentlyDeleteLawsuits?.(ids);
        setPermanentDeleteOpen(false);
        setSelectedTrashIds(new Set());
        permanentIdsRef.current = [];
    }, [onPermanentlyDeleteLawsuits]);

    const hasLawsuitLifecycle = Boolean(
        onMoveLawsuitToTrash ||
            onArchiveLawsuit ||
            onRestoreLawsuitFromTrash ||
            onPermanentlyDeleteLawsuits,
    );

    return {
        criminalDeleteTarget,
        setCriminalDeleteTarget,
        lawsuitViewMode,
        setLawsuitViewMode,
        lawsuitTrashConfirmTarget,
        setLawsuitTrashConfirmTarget,
        selectedTrashIds,
        setSelectedTrashIds,
        permanentDeleteOpen,
        setPermanentDeleteOpen,
        confirmPermanentDelete,
        beginPermanentDeleteForIds,
        permanentIdsRef,
        lawsuitTrashedCount,
        toggleTrashSelect,
        getTitle,
        hasLawsuitLifecycle,
    };
}
