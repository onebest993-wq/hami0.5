import React, { type Dispatch, type SetStateAction } from 'react';
import { Clock } from '@/app/components/ui/icons/Clock';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import SecureStoreService from '@/app/services/SecureStoreService';
import { formatIqdDisplay, parseAmount } from '@/app/utils/execution/amountInput';
import type { GraceTaskCard } from './ExecutionDashboardPhoneBodyDeferredScope';
import { LazyJudicialCustodianCardMenu } from '../executionJudicialCustodianMenuLazy';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';

type Custodian = {
    id: string;
    fullName: string;
    salary?: string;
};

type JudicialCustodianModalCtx = {
    requestTitle: string;
    initialName: string;
    initialSalary: string;
    onSaved: (payload: { name: string; salary: string }) => void;
};

const CUSTODIAN_MENU_FALLBACK = (
    <div
        className="h-11 min-h-[44px] min-w-[44px] rounded-lg border border-white/8 bg-white/[0.04]"
        aria-hidden
        data-testid="judicial-custodian-menu-paint-slot"
    />
);

export function ExecutionDashboardPhoneBodyQuaternaryLatePanels(p: {
    isEvictionExecutionModule: boolean;
    judicialCustodiansResolved: Custodian[] | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        options?: unknown,
    ) => void;
    setJudicialCustodianModalCtx: Dispatch<SetStateAction<JudicialCustodianModalCtx | null>>;
    setJudicialCustodianModalOpen: Dispatch<SetStateAction<boolean>>;
    removeJudicialCustodianEntry: (id: string) => void;
    safeActiveGraceTasks: GraceTaskCard[];
    evictionGracePinned: boolean;
    evictionGraceHidden: boolean;
    setEvictionGraceHidden: Dispatch<SetStateAction<boolean>>;
    graceHiddenKey: string | null | undefined;
}) {
    const {
        isEvictionExecutionModule,
        judicialCustodiansResolved,
        persistExecutionMerge,
        showToast,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        removeJudicialCustodianEntry,
        safeActiveGraceTasks,
        evictionGracePinned,
        evictionGraceHidden,
        setEvictionGraceHidden,
        graceHiddenKey,
    } = p;

    return (
        <>
            {isEvictionExecutionModule && (judicialCustodiansResolved?.length ?? 0) > 0 ? (
                <div className="mx-3 mt-1.5">
                    <p className="mb-1 text-[9px] font-bold text-emerald-400/90 text-right px-0.5">
                        {judicialCustodiansResolved!.length === 1 ? 'الحارس القضائي' : 'الحرس القضائيون'}
                    </p>
                    <div className="space-y-1">
                        {judicialCustodiansResolved!.map((c) => {
                            const salaryRaw = String(c.salary || '').trim();
                            const salaryNum = parseAmount(salaryRaw);
                            const salaryLabel =
                                Number.isFinite(salaryNum) && salaryNum > 0
                                    ? `${formatIqdDisplay(salaryNum)} د.ع`
                                    : salaryRaw;
                            return (
                                <div
                                    key={c.id}
                                    dir="rtl"
                                    className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-[#080d18]/90 px-2 py-1.5"
                                >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                                        <UserCheck size={14} className="text-emerald-300/90" />
                                    </div>
                                    <div className="min-w-0 flex-1 text-right leading-tight">
                                        <p className="truncate text-[11px] font-bold text-white">
                                            {c.fullName}
                                        </p>
                                        {salaryLabel ? (
                                            <p className="text-[9px] tabular-nums text-slate-400">
                                                راتب{' '}
                                                <span className="font-mono text-slate-300">
                                                    {salaryLabel}
                                                </span>
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="shrink-0 self-center">
                                        <PreloadableOverlayGate
                                            lazy={LazyJudicialCustodianCardMenu}
                                            fallback={CUSTODIAN_MENU_FALLBACK}
                                            lazyProps={{
                                                onEdit: () => {
                                                    setJudicialCustodianModalCtx({
                                                        requestTitle:
                                                            judicialCustodiansResolved!.length === 1
                                                                ? 'تعديل بيانات الحارس القضائي'
                                                                : 'تعديل بيانات أحد الحرس القضائين',
                                                        initialName: c.fullName,
                                                        initialSalary: String(c.salary ?? ''),
                                                        onSaved: (payload: {
                                                            name: string;
                                                            salary: string;
                                                        }) => {
                                                            const next = judicialCustodiansResolved!.map(
                                                                (row) =>
                                                                    String(row.id) === String(c.id)
                                                                        ? {
                                                                              ...row,
                                                                              fullName: payload.name,
                                                                              salary: payload.salary,
                                                                          }
                                                                        : row,
                                                            );
                                                            persistExecutionMerge({
                                                                eviction_judicial_custodians: next,
                                                                eviction_judicial_custodian: null,
                                                            });
                                                            showToast(
                                                                'تم تحديث بيانات الحارس',
                                                                'success',
                                                            );
                                                        },
                                                    });
                                                    setJudicialCustodianModalOpen(true);
                                                },
                                                onDelete: () => removeJudicialCustodianEntry(c.id),
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {safeActiveGraceTasks.length > 0 && evictionGracePinned && !evictionGraceHidden ? (
                <div className="mx-3 mt-2 overflow-hidden rounded-2xl border border-amber-500/25 bg-[#0B1120]">
                    <div className="flex flex-row-reverse items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1 text-right">
                            <p className="text-[12px] font-black text-white">المهلة</p>
                        </div>
                        <div className="flex flex-row-reverse items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEvictionGraceHidden(true);
                                    if (graceHiddenKey) {
                                        try {
                                            SecureStoreService.setItemSync(graceHiddenKey, '1');
                                        } catch {
                                            /* ignore */
                                        }
                                    }
                                }}
                                className="min-h-[44px] rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-slate-200 hover:bg-white/[0.06] touch-manipulation"
                            >
                                إخفاء
                            </button>
                            <span className="shrink-0 inline-flex items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/[0.10] px-2.5 py-1 text-[10px] font-bold tabular-nums text-amber-200">
                                {Math.min(1, safeActiveGraceTasks.length)}
                            </span>
                        </div>
                    </div>
                    <div className="px-3 pb-3" dir="rtl">
                        {safeActiveGraceTasks.slice(0, 1).map((t) => (
                            <div
                                key={String(t.id)}
                                className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-white break-words">
                                        {t.title}
                                    </p>
                                    <span className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                        <Clock size={11} className="text-amber-500/90 shrink-0" />
                                        {new Date(t.dueDate).toLocaleDateString('ar-EG', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </span>
                                </div>
                                {t.body ? (
                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400 whitespace-pre-line break-words">
                                        {t.body}
                                    </p>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            ) : safeActiveGraceTasks.length > 0 && evictionGracePinned && evictionGraceHidden ? (
                <div className="mx-3 mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2" dir="rtl">
                    <p className="text-[11px] font-bold text-slate-200">المهلة مخفية</p>
                    <button
                        type="button"
                        onClick={() => {
                            setEvictionGraceHidden(false);
                            if (graceHiddenKey) {
                                try {
                                    SecureStoreService.setItemSync(graceHiddenKey, '0');
                                } catch {
                                    /* ignore */
                                }
                            }
                        }}
                        className="min-h-[44px] rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/15 touch-manipulation"
                    >
                        إظهار
                    </button>
                </div>
            ) : null}
        </>
    );
}
