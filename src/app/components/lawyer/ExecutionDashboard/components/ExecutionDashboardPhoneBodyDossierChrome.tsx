import React from 'react';
import { XCircle } from '@/app/components/ui/lucideIcons';
import type { ExecutionFile } from '@/app/types/execution';
import { DossierSwitcher } from './DossierSwitcher';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { formatUnifiedChildDossierTabLabel } from '../helpers/formatUnifiedChildDossierTabLabel';

export type ExecutionDashboardPhoneBodyDossierChromeProps = {
    stayOfExecutionActive: boolean;
    parentDossierId: string | null | undefined;
    file: ExecutionFile | null | undefined;
    hasChildDossiers: boolean;
    isInabaActive: boolean;
    activeTabId: string;
    currentFileId: string;
    currentFile: ExecutionFile | null | undefined;
    childDossiers: ExecutionFile[];
    setActiveTabId: (id: string) => void;
    setExecutionStorageTick: React.Dispatch<React.SetStateAction<number>>;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
};

export function ExecutionDashboardPhoneBodyDossierChrome({
    stayOfExecutionActive,
    parentDossierId,
    file,
    hasChildDossiers,
    isInabaActive,
    activeTabId,
    currentFileId,
    currentFile,
    childDossiers,
    setActiveTabId,
    setExecutionStorageTick,
    showToast,
}: ExecutionDashboardPhoneBodyDossierChromeProps) {
    return (
        <>
            {stayOfExecutionActive ? (
                <div className="mx-2 mt-1 rounded-xl border border-amber-500/50 bg-amber-950/85 px-3 py-2">
                    <p className="text-center text-[11px] font-bold text-amber-200 leading-snug">
                        ⏸️ الإضبارة مستأخرة لحين موعد الجلسة القادمة
                    </p>
                </div>
            ) : null}

            <DossierSwitcher parentFileId={parentDossierId ?? ''} parentFileSnapshot={file ?? null} />

            {hasChildDossiers && !isInabaActive ? (
                <div className="mx-3 mt-2" dir="rtl">
                    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-hami-navy/40 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <button
                            type="button"
                            onClick={() => setActiveTabId(String(currentFileId || ''))}
                            className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                                String(activeTabId) === String(currentFileId)
                                    ? 'bg-amber-500/20 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                            }`}
                            aria-label="الإضبارة الأصلية"
                            title="الإضبارة الأصلية"
                        >
                            <span className="tabular-nums">
                                {currentFile?.fileNumber || 'الإضبارة الأصلية'}
                            </span>
                            <span className="rounded-full border border-amber-500/20 bg-amber-950/25 px-1.5 py-0.5 text-[8px] text-amber-300/90">
                                أصلية
                            </span>
                        </button>

                        {childDossiers?.map((child) => {
                            const childLabel = formatUnifiedChildDossierTabLabel(child);
                            return (
                            <div
                                key={child.id}
                                className="shrink-0 inline-flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-black/10"
                            >
                                <button
                                    type="button"
                                    onClick={() => setActiveTabId(String(child.id))}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold transition-all ${
                                        String(activeTabId) === String(child.id)
                                            ? 'bg-indigo-500/20 text-indigo-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                    }`}
                                    aria-label={`إضبارة موحّدة: ${childLabel}`}
                                    title={childLabel}
                                >
                                    <span className="tabular-nums">{childLabel}</span>
                                    <span className="rounded-full border border-indigo-500/20 bg-indigo-950/20 px-1.5 py-0.5 text-[8px] text-indigo-300/90">
                                        موحّدة
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const store = useExecutionDashboardStore.getState();
                                        store.setParentIdForDossier(String(child.id), null);
                                        if (String(activeTabId) === String(child.id)) {
                                            setActiveTabId(String(currentFileId || ''));
                                        }
                                        setExecutionStorageTick((t) => t + 1);
                                        showToast('تم إلغاء توحيد الإضبارة الموحدة', 'success');
                                    }}
                                    className="inline-flex items-center justify-center border-r border-white/10 px-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-200"
                                    aria-label="إلغاء توحيد الإضبارة"
                                    title="إلغاء توحيد الإضبارة"
                                >
                                    <XCircle size={14} />
                                </button>
                            </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </>
    );
}
