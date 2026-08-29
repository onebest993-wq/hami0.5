import { useEffect } from 'react';
import type { SeizedAsset } from '@/app/types/execution';
import { toastAfterExecutionPersist } from '../helpers/toastAfterExecutionPersist';

export function useEvictionLawyerFeeOutcome(input: {
    executionDataId?: string;
    executionId?: string;
    decisionsStorageExecutionId?: string;
    parsedLawyerFees: number;
    evictionCaseExpenses: Array<{ amount?: number }>;
    setEvictionAssetsTabUnlocked: (v: boolean) => void;
    setSeizedAssets: React.Dispatch<React.SetStateAction<SeizedAsset[]>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
    const {
        executionDataId,
        executionId,
        decisionsStorageExecutionId,
        parsedLawyerFees,
        evictionCaseExpenses,
        setEvictionAssetsTabUnlocked,
        setSeizedAssets,
        persistExecutionMerge,
        showToast,
    } = input;

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                decisionId?: string;
                requestKind?: string;
                outcome?: string;
            }>;
            const evId = String(ce.detail?.executionId ?? '');
            const myId = String(executionDataId ?? executionId ?? '');
            if (evId !== myId && evId !== String(decisionsStorageExecutionId ?? '')) return;
            if (ce.detail?.outcome !== 'approved') return;
            const rk = ce.detail?.requestKind;
            if (rk !== 'lawyer_fee_payout' && rk !== 'case_expense') return;

            setEvictionAssetsTabUnlocked(true);

            if (rk === 'lawyer_fee_payout' && parsedLawyerFees > 0) {
                setSeizedAssets((prev) => {
                    if (prev.some((a) => String(a.id).startsWith('claimed_lawyer_fee_'))) return prev;
                    const next: SeizedAsset[] = [
                        {
                            id: `claimed_lawyer_fee_${Date.now()}`,
                            type: 'مطالبة أتعاب محكومة',
                            status: 'pending',
                            details: {
                                المبلغ: `${parsedLawyerFees.toLocaleString('ar-IQ')} د.ع`,
                                المصدر: 'موافقة المنفذ',
                            },
                        },
                        ...prev,
                    ];
                    queueMicrotask(() =>
                        persistExecutionMerge({
                            seizedAssets: next,
                            eviction_assets_tab_unlocked: true,
                        })
                    );
                    return next;
                });
            }

            if (rk === 'case_expense') {
                const sum = evictionCaseExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
                if (sum <= 0) {
                    queueMicrotask(() => {
                        toastAfterExecutionPersist(
                            persistExecutionMerge({ eviction_assets_tab_unlocked: true }),
                            showToast,
                            'تم قبول المصاريف — تبويب الأموال',
                        );
                    });
                    return;
                }
                setSeizedAssets((prev) => {
                    if (prev.some((a) => String(a.id).startsWith('claimed_case_expense_'))) return prev;
                    const next: SeizedAsset[] = [
                        {
                            id: `claimed_case_expense_${Date.now()}`,
                            type: 'مصاريف إضبارة (مطالبة)',
                            status: 'pending',
                            details: {
                                الإجمالي: `${sum.toLocaleString('ar-IQ')} د.ع`,
                                المصدر: 'موافقة المنفذ',
                            },
                        },
                        ...prev,
                    ];
                    queueMicrotask(() =>
                        persistExecutionMerge({
                            seizedAssets: next,
                            eviction_assets_tab_unlocked: true,
                        })
                    );
                    return next;
                });
            }

            showToast('تم تفعيل المسار بقرار المنفذ', 'success');
        };

        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [
        decisionsStorageExecutionId,
        evictionCaseExpenses,
        executionDataId,
        executionId,
        parsedLawyerFees,
        persistExecutionMerge,
        setEvictionAssetsTabUnlocked,
        setSeizedAssets,
        showToast,
    ]);
}
