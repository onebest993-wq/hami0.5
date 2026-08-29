import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureCsrfSessionReady } from '@/app/security/ensureCsrfSessionReady';
import { isHqAbortError } from '@/app/domain/admin/hqSafeText';

export const HQ_PANEL_LOAD_BUDGET_MS = 12_000;

export type HqPanelFailKind = 'timeout' | 'error' | null;

export function hqPanelFailDetail(failKind: HqPanelFailKind): string | undefined {
    if (failKind === 'timeout') {
        return 'انتهت مهلة التحميل. الشبكة بطيئة أو الخادم لم يرد في الوقت.';
    }
    return undefined;
}

type HqPanelWork = (signal: AbortSignal) => Promise<void>;

function budgetRace(ms: number, ac: AbortController): { promise: Promise<never>; cancel: () => void } {
    let timer = 0;
    const promise = new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => {
            ac.abort();
            reject(new Error('hq-panel-timeout'));
        }, ms);
    });
    return {
        promise,
        cancel: () => window.clearTimeout(timer),
    };
}

/**
 * تحميل تبويب المقر: الجيل يمنع بقاء «جاري التحميل» بعد مغادرة التبويب أو طلب متداخل.
 * CSRF داخل الميزانية — بعد غطاء /admin قد لا تكون الجلسة جاهزة في أول نداء.
 * بعد أول اكتمال لا تُفرَّغ الشاشة عند التحديث (stale-while-revalidate).
 * skipFirstWork: بيانات مُجهَّزة — بلا CSRF ولا مهلة ولا جلب في أول تركيب.
 * مهلة الميزانية تُلغى بعد النجاح حتى لا يبقى رفض غير معالج بعد 8 ثوانٍ.
 */
export function useHqPanelLoad(
    work: HqPanelWork,
    options?: { alreadySettled?: boolean; skipFirstWork?: boolean },
): {
    loading: boolean;
    failed: boolean;
    failKind: HqPanelFailKind;
    reload: () => Promise<void>;
} {
    const alreadySettled = Boolean(options?.alreadySettled);
    const [loading, setLoading] = useState(!alreadySettled);
    const [failed, setFailed] = useState(false);
    const [failKind, setFailKind] = useState<HqPanelFailKind>(null);
    const genRef = useRef(0);
    const settledRef = useRef(alreadySettled);
    const skipFirstRef = useRef(Boolean(options?.skipFirstWork));
    const abortRef = useRef<AbortController | null>(null);

    const reload = useCallback(async () => {
        if (skipFirstRef.current) {
            skipFirstRef.current = false;
            settledRef.current = true;
            setLoading(false);
            setFailed(false);
            setFailKind(null);
            return;
        }

        const gen = (genRef.current += 1);
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        if (!settledRef.current) setLoading(true);
        setFailed(false);
        setFailKind(null);
        const budget = budgetRace(HQ_PANEL_LOAD_BUDGET_MS, ac);
        try {
            await Promise.race([
                (async () => {
                    try {
                        await ensureCsrfSessionReady();
                        if (ac.signal.aborted) return;
                        await work(ac.signal);
                    } catch (error) {
                        if (ac.signal.aborted || isHqAbortError(error, ac.signal)) return;
                        throw error;
                    }
                })(),
                budget.promise,
            ]);
            if (gen === genRef.current) {
                setFailed(false);
                setFailKind(null);
            }
        } catch (error) {
            if (gen === genRef.current) {
                setFailed(true);
                setFailKind(
                    error instanceof Error && error.message === 'hq-panel-timeout' ? 'timeout' : 'error',
                );
            }
        } finally {
            budget.cancel();
            if (gen === genRef.current) {
                settledRef.current = true;
                setLoading(false);
            }
        }
    }, [work]);

    useEffect(() => {
        void reload();
        return () => {
            genRef.current += 1;
            abortRef.current?.abort();
        };
    }, [reload]);

    return { loading, failed, failKind, reload };
}
