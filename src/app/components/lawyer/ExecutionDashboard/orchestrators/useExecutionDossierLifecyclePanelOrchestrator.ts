import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ExecutionFile, DossierLifecycleStatus } from '@/app/types/execution';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import type {
    DossierLifecyclePopStyle,
    ExecutionDossierLifecyclePanelOrchestratorSlice,
} from './executionOrchestratorSliceTypes';

/** لوحة دورة حياة الإضبارة — حالة UI + إغلاق بالنقر/Escape */
export function useExecutionDossierLifecyclePanelOrchestrator(
    executionData?: ExecutionFile | null,
): ExecutionDossierLifecyclePanelOrchestratorSlice {
    const [dossierStatusDraft, setDossierStatusDraft] = useState<DossierLifecycleStatus>('active');
    const [dossierReasonDraft, setDossierReasonDraft] = useState('');
    const [dossierDateDraft, setDossierDateDraft] = useState('');
    const [dossierLifecyclePanelOpen, setDossierLifecyclePanelOpen] = useState(false);
    const [dossierLifecyclePanelPhase, setDossierLifecyclePanelPhase] = useState<'menu' | 'details'>('menu');
    const [dossierPendingStatus, setDossierPendingStatus] = useState<DossierLifecycleStatus | null>(null);
    const dossierLifecyclePopoverRef = useRef<HTMLDivElement>(null);
    const dossierLifecyclePanelPortalRef = useRef<HTMLDivElement>(null);
    const [dossierLifecyclePopStyle, setDossierLifecyclePopStyle] = useState<DossierLifecyclePopStyle | null>(null);

    const closeDossierLifecyclePanel = useCallback(() => {
        setDossierLifecyclePanelOpen(false);
        setDossierLifecyclePanelPhase('menu');
        setDossierPendingStatus(null);
    }, []);

    useEffect(() => {
        const s = normalizeDossierLifecycleStatus(executionData?.dossier_lifecycle_status);
        setDossierStatusDraft(s);
        setDossierReasonDraft(String(executionData?.dossier_status_reason ?? '').trim());
        setDossierDateDraft(String(executionData?.dossier_status_date ?? '').slice(0, 10));
    }, [
        executionData?.id,
        executionData?.dossier_lifecycle_status,
        executionData?.dossier_status_reason,
        executionData?.dossier_status_date,
    ]);

    useEffect(() => {
        if (!dossierLifecyclePanelOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (dossierLifecyclePopoverRef.current?.contains(t)) return;
            if (dossierLifecyclePanelPortalRef.current?.contains(t)) return;
            closeDossierLifecyclePanel();
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [dossierLifecyclePanelOpen, closeDossierLifecyclePanel]);

    useEffect(() => {
        if (!dossierLifecyclePanelOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDossierLifecyclePanel();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [dossierLifecyclePanelOpen, closeDossierLifecyclePanel]);

    useLayoutEffect(() => {
        if (!dossierLifecyclePanelOpen) {
            setDossierLifecyclePopStyle(null);
            return;
        }
        let raf = 0;
        const update = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const el = dossierLifecyclePopoverRef.current;
                if (!el) return;
                const r = el.getBoundingClientRect();
                const vw = document.documentElement.clientWidth;
                const margin = 12;
                const maxPanelW = Math.min(304, vw - 2 * margin);
                const w = Math.min(maxPanelW, Math.max(224, r.width));
                let left = r.right - w;
                if (left < margin) left = margin;
                if (left + w > vw - margin) left = Math.max(margin, vw - margin - w);
                setDossierLifecyclePopStyle({
                    top: r.bottom + 6,
                    left,
                    width: w,
                });
            });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [dossierLifecyclePanelOpen, dossierLifecyclePanelPhase, dossierStatusDraft]);

    return {
        dossierStatusDraft,
        setDossierStatusDraft,
        dossierReasonDraft,
        setDossierReasonDraft,
        dossierDateDraft,
        setDossierDateDraft,
        dossierLifecyclePanelOpen,
        setDossierLifecyclePanelOpen,
        dossierLifecyclePanelPhase,
        setDossierLifecyclePanelPhase,
        dossierPendingStatus,
        setDossierPendingStatus,
        dossierLifecyclePopoverRef,
        dossierLifecyclePanelPortalRef,
        dossierLifecyclePopStyle,
        setDossierLifecyclePopStyle,
        closeDossierLifecyclePanel,
    };
}
