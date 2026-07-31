import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import type { UrgentCase } from '../../Component_Urgent_Card';

export const DEFAULT_URGENT_ARCHIVE_REASON = 'اكتسب القرار الدرجة القطعية وتم إغلاق الإضبارة';

export type UrgentArchiveModalState = {
    isOpen: boolean;
    caseId: string;
    reason: string;
    mode: 'auto' | 'manual';
};

export type UrgentTrashModalState = {
    isOpen: boolean;
    caseId: string;
    reason: string;
};

export type UrgentPermanentDeleteModalState = {
    isOpen: boolean;
    caseId: string;
    countdown: number;
};

type UseUrgentLifecycleModalsArgs = {
    cases: UrgentCase[];
    setCases: Dispatch<SetStateAction<UrgentCase[]>>;
    pendingCasesPersistRef: MutableRefObject<boolean>;
};

export function useUrgentLifecycleModals({
    cases,
    setCases,
    pendingCasesPersistRef,
}: UseUrgentLifecycleModalsArgs) {
    const [archiveModal, setArchiveModal] = useState<UrgentArchiveModalState>({
        isOpen: false,
        caseId: '',
        reason: '',
        mode: 'manual',
    });
    const [trashModal, setTrashModal] = useState<UrgentTrashModalState>({
        isOpen: false,
        caseId: '',
        reason: '',
    });
    const [permanentDeleteModal, setPermanentDeleteModal] = useState<UrgentPermanentDeleteModalState>({
        isOpen: false,
        caseId: '',
        countdown: 5,
    });
    const permanentDeleteTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!permanentDeleteModal.isOpen) return;
        if (permanentDeleteTimerRef.current) {
            window.clearInterval(permanentDeleteTimerRef.current);
            permanentDeleteTimerRef.current = null;
        }
        permanentDeleteTimerRef.current = window.setInterval(() => {
            setPermanentDeleteModal((prev) => {
                const next = Math.max(0, prev.countdown - 1);
                if (next === 0 && permanentDeleteTimerRef.current) {
                    window.clearInterval(permanentDeleteTimerRef.current);
                    permanentDeleteTimerRef.current = null;
                }
                return { ...prev, countdown: next };
            });
        }, 1000);
        return () => {
            if (permanentDeleteTimerRef.current) {
                window.clearInterval(permanentDeleteTimerRef.current);
                permanentDeleteTimerRef.current = null;
            }
        };
    }, [permanentDeleteModal.isOpen]);

    const closeArchiveModal = useCallback(() => {
        setArchiveModal({ isOpen: false, caseId: '', reason: '', mode: 'manual' });
    }, []);

    const openArchiveModal = useCallback(
        (caseId: string, mode: 'auto' | 'manual') => {
            const target = cases.find((c) => c.id === caseId);
            const autoText = target?.status === 'completed' ? DEFAULT_URGENT_ARCHIVE_REASON : '';
            setArchiveModal({ isOpen: true, caseId, reason: autoText, mode });
        },
        [cases],
    );

    const confirmArchive = useCallback(() => {
        const reason = archiveModal.reason.trim() || DEFAULT_URGENT_ARCHIVE_REASON;
        if (!archiveModal.caseId) return;
        setCases((prev) => {
            const now = new Date().toISOString();
            const next = prev.map((c) =>
                c.id === archiveModal.caseId ? { ...c, archived: true, archivedAt: now, archivedReason: reason } : c,
            );
            pendingCasesPersistRef.current = true;
            return next;
        });
        closeArchiveModal();
    }, [archiveModal.caseId, archiveModal.reason, closeArchiveModal, pendingCasesPersistRef, setCases]);

    const unarchiveCase = useCallback(
        (caseId: string) => {
            setCases((prev) => {
                const next = prev.map((c) =>
                    c.id === caseId ? { ...c, archived: false, archivedAt: null, archivedReason: null } : c,
                );
                pendingCasesPersistRef.current = true;
                return next;
            });
        },
        [pendingCasesPersistRef, setCases],
    );

    const closeTrashModal = useCallback(() => {
        setTrashModal({ isOpen: false, caseId: '', reason: '' });
    }, []);

    const openTrashModal = useCallback((caseId: string) => {
        setTrashModal({ isOpen: true, caseId, reason: '' });
    }, []);

    const confirmTrash = useCallback(() => {
        if (!trashModal.caseId) return;
        const reason = trashModal.reason.trim();
        setCases((prev) => {
            const now = new Date().toISOString();
            const next = prev.map((c) =>
                c.id === trashModal.caseId ? { ...c, deleted: true, deletedAt: now, deletedReason: reason || null } : c,
            );
            pendingCasesPersistRef.current = true;
            return next;
        });
        closeTrashModal();
    }, [closeTrashModal, pendingCasesPersistRef, setCases, trashModal.caseId, trashModal.reason]);

    const restoreFromTrash = useCallback(
        (caseId: string) => {
            setCases((prev) => {
                const next = prev.map((c) =>
                    c.id === caseId ? { ...c, deleted: false, deletedAt: null, deletedReason: null } : c,
                );
                pendingCasesPersistRef.current = true;
                return next;
            });
        },
        [pendingCasesPersistRef, setCases],
    );

    const closePermanentDeleteModal = useCallback(() => {
        setPermanentDeleteModal({ isOpen: false, caseId: '', countdown: 5 });
    }, []);

    const openPermanentDeleteModal = useCallback((caseId: string) => {
        setPermanentDeleteModal({ isOpen: true, caseId, countdown: 5 });
    }, []);

    const confirmPermanentDelete = useCallback(() => {
        if (!permanentDeleteModal.caseId) return;
        const removedId = permanentDeleteModal.caseId;
        setCases((prev) => {
            const next = prev.filter((c) => c.id !== removedId);
            pendingCasesPersistRef.current = true;
            return next;
        });
        unpinWorkspaceItem(removedId, 'urgent');
        closePermanentDeleteModal();
    }, [
        closePermanentDeleteModal,
        pendingCasesPersistRef,
        permanentDeleteModal.caseId,
        setCases,
    ]);

    return {
        archiveModal,
        setArchiveModal,
        closeArchiveModal,
        openArchiveModal,
        confirmArchive,
        unarchiveCase,
        trashModal,
        setTrashModal,
        closeTrashModal,
        openTrashModal,
        confirmTrash,
        restoreFromTrash,
        permanentDeleteModal,
        closePermanentDeleteModal,
        openPermanentDeleteModal,
        confirmPermanentDelete,
    };
}
