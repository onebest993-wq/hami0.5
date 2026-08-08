import React, { Suspense } from 'react';
import { Clock, UserCheck } from '@/app/components/ui/lucideIcons';
import type { ExecutionFile } from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import { formatIqdDisplay, parseAmount } from '@/app/utils/execution/amountInput';
import { EXEC_OVERLAY_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import {
    LazyJudicialCustodianCardMenu,
    LazyVisitationScheduleModule,
} from '../executionDashboardLazyRegistry';
import type {
    ExecutionDashboardPhoneBodyDeferredScope,
    GraceTaskCard,
} from './ExecutionDashboardPhoneBodyDeferredScope';

const LazyGuarantorExternalHub = React.lazy(() =>
    import('./GuarantorExternalHub').then((m) => ({
        default: m.GuarantorExternalHub,
    })),
);

export type ExecutionDashboardPhoneBodyQuaternaryPanelsProps = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    quaternaryStageReady: boolean;
    safeActiveGraceTasks: GraceTaskCard[];
    safeShouldShowGuarantorExternalHub: (value: unknown) => boolean;
    visitationFileNumber?: string;
    directOpenUnifiedSummonsHub: (options?: {
        debtorKey?: string | null;
        initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
    }) => void;
    removeJudicialCustodianEntry: (id: string) => void;
    openGuarantorFollowupDetails: () => void;
};

export function ExecutionDashboardPhoneBodyQuaternaryPanels({
    scope,
    quaternaryStageReady,
    safeActiveGraceTasks,
    safeShouldShowGuarantorExternalHub,
    visitationFileNumber,
    directOpenUnifiedSummonsHub,
    removeJudicialCustodianEntry,
    openGuarantorFollowupDetails,
}: ExecutionDashboardPhoneBodyQuaternaryPanelsProps) {
    const {
        archiveAndClearGuarantor,
        evictionGraceHidden,
        evictionGracePinned,
        executionData,
        followupSpecialization,
        graceHiddenKey,
        handleGuarantorRequestFromFollowup,
        isEvictionExecutionModule,
        isVisitationClaim,
        judicialCustodiansResolved,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        setEvictionGraceHidden,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        showToast,
        todayYmd,
        viewExecutionData,
        visitChildNames,
    } = scope;

    const followupSpec = followupSpecialization ?? {};
    const resolvedVisitationFileNumber =
        visitationFileNumber ?? String(executionData?.fileNumber ?? '');

    if (!quaternaryStageReady) {
        return null;
    }

    return (
        <>
            {safeShouldShowGuarantorExternalHub(viewExecutionData) &&
            !Boolean(followupSpec.hideAllGuarantorPresence) ? (
                <div className="mx-3 mt-3.5">
                    <Suspense fallback={null}>
                        <LazyGuarantorExternalHub
                            executionData={viewExecutionData as ExecutionFile | null}
                            openGuarantorDetailsModal={openGuarantorFollowupDetails}
                            archiveAndClearGuarantor={archiveAndClearGuarantor}
                            handleGuarantorRequestFromFollowup={handleGuarantorRequestFromFollowup}
                            onOpenUnifiedSummonsHub={(options) =>
                                directOpenUnifiedSummonsHub(
                                    options as
                                        | {
                                              debtorKey?: string | null;
                                              initialMainTab?:
                                                  | 'tabligh'
                                                  | 'taklif'
                                                  | 'nashr'
                                                  | 'guarantor'
                                                  | null;
                                          }
                                        | undefined,
                                )
                            }
                        />
                    </Suspense>
                </div>
            ) : null}

            {isVisitationClaim ? (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyVisitationScheduleModule
                        executionData={viewExecutionData}
                        visitChildNames={visitChildNames}
                        fileNumber={resolvedVisitationFileNumber}
                        todayYmd={todayYmd}
                        persistExecutionMerge={persistExecutionMerge}
                        pushTimelineEvent={pushTimelineEvent}
                        nextTimelineId={nextTimelineId}
                        showToast={showToast}
                    />
                </Suspense>
            ) : null}

            {isEvictionExecutionModule && (judicialCustodiansResolved?.length ?? 0) > 0 ? (
                <div className="mx-3 mt-1.5">
                    <p className="mb-1 text-[9px] font-bold text-emerald-400/90 text-right px-0.5">
                        {judicialCustodiansResolved.length === 1 ? 'الحارس القضائي' : 'الحرس القضائيون'}
                    </p>
                    <div className="space-y-1">
                        {judicialCustodiansResolved.map((c) => {
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
                                        <Suspense fallback={null}>
                                            <LazyJudicialCustodianCardMenu
                                                onEdit={() => {
                                                    setJudicialCustodianModalCtx({
                                                        requestTitle:
                                                            judicialCustodiansResolved.length === 1
                                                                ? 'تعديل بيانات الحارس القضائي'
                                                                : 'تعديل بيانات أحد الحرس القضائين',
                                                        initialName: c.fullName,
                                                        initialSalary: c.salary,
                                                        onSaved: (payload: {
                                                            name: string;
                                                            salary: string;
                                                        }) => {
                                                            const next = judicialCustodiansResolved.map(
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
                                                }}
                                                onDelete={() => removeJudicialCustodianEntry(c.id)}
                                            />
                                        </Suspense>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {safeActiveGraceTasks.length > 0 && evictionGracePinned && !evictionGraceHidden ? (
                <div className="mx-3 mt-2 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.10] via-white/[0.03] to-transparent backdrop-blur-3xl shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
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
                                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-slate-200 hover:bg-white/[0.06]"
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
                        className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/15"
                    >
                        إظهار
                    </button>
                </div>
            ) : null}
        </>
    );
}
