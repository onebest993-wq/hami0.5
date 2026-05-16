import React, { useEffect, useState } from 'react';
import { Forward, Folder } from 'lucide-react';
import { useExecutionDashboardStore, INABA_SUB_FILE_ID, isInabaSubFileId, makeInabaSubFileId } from '@/app/stores/executionDashboardStore';
import type { ExecutionFile } from '@/app/types/execution';

interface DossierSwitcherProps {
    parentFileId: string;
    parentFileSnapshot?: ExecutionFile | null;
}

function readUrlDelegationParentId(): string | null {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('delegationParentId');
    } catch {
        return null;
    }
}

export const DossierSwitcher: React.FC<DossierSwitcherProps> = ({
    parentFileId,
    parentFileSnapshot,
}) => {
    const activeSubFileId = useExecutionDashboardStore((s) => s.activeSubFileId);
    const delegationParentFileId = useExecutionDashboardStore((s) => s.delegationParentFileId);
    const allSubFiles = useExecutionDashboardStore((s) => s.subFiles);
    const currentFile = useExecutionDashboardStore((s) => s.currentFile);
    const setCurrentFile = useExecutionDashboardStore((s) => s.setCurrentFile);
    const setActiveSubFileId = useExecutionDashboardStore((s) => s.setActiveSubFileId);
    const setDelegationParentFileId = useExecutionDashboardStore((s) => s.setDelegationParentFileId);
    const swapToSubFile = useExecutionDashboardStore((s) => s.swapToSubFile);
    const restoreOriginalFile = useExecutionDashboardStore((s) => s.restoreOriginalFile);

    const [urlDelegationParentId, setUrlDelegationParentId] = useState<string | null>(() => readUrlDelegationParentId());

    useEffect(() => {
        const onPopState = () => {
            setUrlDelegationParentId(readUrlDelegationParentId());
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const effectiveParentFileId = parentFileId;
    const inabaIdForParent = makeInabaSubFileId(parentFileId);
    const hasInaba = allSubFiles.some(
        (f) =>
            (f.id === inabaIdForParent || f.id === INABA_SUB_FILE_ID) &&
            String(f.parentFileId || '') === String(parentFileId)
    );
    const inabaFile = allSubFiles.find(
        (f) =>
            (f.id === inabaIdForParent || f.id === INABA_SUB_FILE_ID) &&
            String(f.parentFileId || '') === String(parentFileId)
    );

    const isInaba = isInabaSubFileId(activeSubFileId);

    const isInDelegation = hasInaba || isInaba;

    useEffect(() => {
        const curId = String((currentFile as any)?.id || '').trim();
        if (!curId) return;
        if (!isInabaSubFileId(curId)) return;
        if (!activeSubFileId) {
            setActiveSubFileId(curId);
        }
        const parentId = String((currentFile as any)?.parentId || '').trim();
        if (parentId && !delegationParentFileId) {
            setDelegationParentFileId(parentId);
        }
    }, [activeSubFileId, currentFile, delegationParentFileId, setActiveSubFileId, setDelegationParentFileId]);

    useEffect(() => {
        if (!urlDelegationParentId) return;
        const st = useExecutionDashboardStore.getState();
        if (st.activeSubFileId) return;
        const target = inabaFile;
        if (target) {
            swapToSubFile(target);
            return;
        }
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('delegationParentId');
            window.history.replaceState(window.history.state, '', url.toString());
        } catch {}
        setUrlDelegationParentId(null);
    }, [inabaFile, swapToSubFile, urlDelegationParentId]);

    if (!isInDelegation) return null;

    const handleParentClick = () => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('delegationParentId');
            window.history.replaceState(window.history.state, '', url.toString());
        } catch {}
        setUrlDelegationParentId(null);
        restoreOriginalFile();
        queueMicrotask(() => {
            const st = useExecutionDashboardStore.getState();
            const curId = String((st.currentFile as any)?.id || '').trim();
            if (!curId) {
                if (parentFileSnapshot) {
                    setCurrentFile(parentFileSnapshot);
                }
                setActiveSubFileId(null);
                setDelegationParentFileId(null);
                return;
            }
            if (!isInabaSubFileId(curId) && !isInabaSubFileId(st.activeSubFileId)) return;
            if (parentFileSnapshot) {
                setCurrentFile(parentFileSnapshot);
                setActiveSubFileId(null);
                setDelegationParentFileId(null);
            }
        });
    };

    const handleSubClick = () => {
        if (!inabaFile) return;
        setUrlDelegationParentId(parentFileId);
        swapToSubFile(inabaFile);
    };

    return (
        <div className="mx-3 mt-2" dir="rtl">
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0A0F1C]/40 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <button
                    type="button"
                    onClick={handleParentClick}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold transition-all ${!isInaba ? 'bg-amber-500/20 text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'} ${!isInDelegation ? 'opacity-40' : ''}`}
                >
                    <Folder size={14} strokeWidth={2} />
                    الإضبارة الأم
                </button>
                <div className="h-5 w-px bg-white/10" />
                <button
                    type="button"
                    onClick={handleSubClick}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold transition-all ${isInaba ? 'bg-indigo-500/20 text-indigo-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'} ${!isInDelegation ? 'opacity-40' : ''}`}
                >
                    <Forward size={13} strokeWidth={2} />
                    إضبارة الإنابة
                    {hasInaba ? (
                        <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] text-emerald-400">مفعلة</span>
                    ) : null}
                </button>
            </div>
        </div>
    );
};
