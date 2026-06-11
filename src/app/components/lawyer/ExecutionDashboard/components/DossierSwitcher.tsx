import React, { useEffect, useState } from 'react';
import { Forward, Folder } from 'lucide-react';
import {
    useExecutionDashboardStore,
    INABA_SUB_FILE_ID,
    isInabaSubFileId,
    makeInabaSubFileId,
    resolveParentDossierId,
} from '@/app/stores/executionDashboardStore';
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

export const DossierSwitcher: React.FC<DossierSwitcherProps> = ({ parentFileId }) => {
    const activeSubFileId = useExecutionDashboardStore((s) => s.activeSubFileId);
    const allSubFiles = useExecutionDashboardStore((s) => s.subFiles);
    const currentFile = useExecutionDashboardStore((s) => s.currentFile);
    const delegationParentFileId = useExecutionDashboardStore((s) => s.delegationParentFileId);
    const setActiveSubFileId = useExecutionDashboardStore((s) => s.setActiveSubFileId);
    const setDelegationParentFileId = useExecutionDashboardStore((s) => s.setDelegationParentFileId);
    const swapToSubFile = useExecutionDashboardStore((s) => s.swapToSubFile);
    const restoreOriginalFile = useExecutionDashboardStore((s) => s.restoreOriginalFile);

    const [urlDelegationParentId, setUrlDelegationParentId] = useState<string | null>(() => readUrlDelegationParentId());

    useEffect(() => {
        const onPopState = () => setUrlDelegationParentId(readUrlDelegationParentId());
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const stableParentId = String(
        parentFileId ||
            resolveParentDossierId(
                { currentFile, delegationParentFileId, activeSubFileId },
                parentFileId
            ) ||
            ''
    ).trim();

    const inabaIdForParent = makeInabaSubFileId(stableParentId);
    const inabaFile = allSubFiles.find(
        (f) =>
            (f.id === inabaIdForParent || f.id === INABA_SUB_FILE_ID) &&
            String(f.parentFileId || '') === stableParentId
    );

    const isInaba = isInabaSubFileId(activeSubFileId);
    const showSwitcher = Boolean(stableParentId && inabaFile);

    useEffect(() => {
        if (!showSwitcher) return;
        const curId = String((currentFile as any)?.id || '').trim();
        if (!curId || !isInabaSubFileId(curId)) return;
        if (!activeSubFileId) setActiveSubFileId(curId);
        const parentId = String((currentFile as any)?.parentId || stableParentId).trim();
        if (parentId && !delegationParentFileId) setDelegationParentFileId(parentId);
    }, [
        showSwitcher,
        activeSubFileId,
        currentFile,
        delegationParentFileId,
        setActiveSubFileId,
        setDelegationParentFileId,
        stableParentId,
    ]);

    useEffect(() => {
        if (!showSwitcher || !urlDelegationParentId) return;
        const st = useExecutionDashboardStore.getState();
        if (st.activeSubFileId) return;
        if (String(urlDelegationParentId) !== stableParentId) return;
        if (inabaFile) {
            swapToSubFile(inabaFile);
            return;
        }
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('delegationParentId');
            window.history.replaceState(window.history.state, '', url.toString());
        } catch {}
        setUrlDelegationParentId(null);
    }, [showSwitcher, inabaFile, swapToSubFile, urlDelegationParentId, stableParentId]);

    if (!showSwitcher) return null;

    const handleParentClick = () => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('delegationParentId');
            window.history.replaceState(window.history.state, '', url.toString());
        } catch {}
        setUrlDelegationParentId(null);
        restoreOriginalFile();
    };

    const handleSubClick = () => {
        if (!inabaFile) return;
        setUrlDelegationParentId(stableParentId);
        swapToSubFile(inabaFile);
    };

    return (
        <div className="mx-3 mt-2" dir="rtl">
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0A0F1C]/40 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <button
                    type="button"
                    onClick={handleParentClick}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold transition-all ${!isInaba ? 'bg-amber-500/20 text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <Folder size={14} strokeWidth={2} />
                    الإضبارة الأم
                </button>
                <div className="h-5 w-px bg-white/10" />
                <button
                    type="button"
                    onClick={handleSubClick}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold transition-all ${isInaba ? 'bg-indigo-500/20 text-indigo-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                    <Forward size={13} strokeWidth={2} />
                    الإضبارة الفرعية
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] text-emerald-400">مفعلة</span>
                </button>
            </div>
        </div>
    );
};
