import { useCallback, useEffect, useRef, useState } from 'react';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { HQ_STATUS_REFRESH_EVENT } from '@/app/components/admin/hqStatusEvents';
import { ensureCsrfSessionReady } from '@/app/security/ensureCsrfSessionReady';
import {
    CHECKING_HQ_STATUS,
    isHqStatusSessionDenied,
    markHqStatusFetchFailed,
    markHqStatusFetched,
    parseHeadquartersLiveStatus,
    type HeadquartersLiveStatus,
} from '@/app/components/admin/hqLiveOverview';
import { peekPrimedHeadquartersStatus } from '@/app/services/admin/hqDevSessionPrime';
import { isHqAbortError } from '@/app/domain/admin/hqSafeText';

export type { HeadquartersLiveStatus };

const POLL_MS = 30_000;

async function waitCsrfOrAbort(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
        const aborted = new Error('تم إلغاء الطلب');
        aborted.name = 'AbortError';
        throw aborted;
    }
    await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
            const aborted = new Error('تم إلغاء الطلب');
            aborted.name = 'AbortError';
            reject(aborted);
        };
        signal.addEventListener('abort', onAbort, { once: true });
        void ensureCsrfSessionReady().then(
            () => {
                signal.removeEventListener('abort', onAbort);
                resolve();
            },
            (error: unknown) => {
                signal.removeEventListener('abort', onAbort);
                reject(error);
            },
        );
    });
}

/**
 * نبض مقر القيادة — صحة القاعدة + أعداد الحسابات/التوثيق/المنتدى للشارات والإحصائيات.
 * فشل التحديث بعد نجاح سابق يُبقي آخر أرقام ولا يصفرّها.
 * الاستطلاع لا يكدّس طلباً فوق آخر؛ زر التحديث يطلب نسخة طازجة.
 * نبض مُجهَّز: لا جلب فوري (الاستطلاع كل 30ث وزر التحديث يكفيان).
 *
 * StrictMode في التطوير يلغي الطلب الأول: يجب تصفير inflight عند الإلغاء
 * وإلا يبقى «جاري التحقق» و«جاري التحميل» وشريط البريد بلا حالة.
 */
export function useHeadquartersStatus(opts?: { skipFetch?: boolean }): HeadquartersLiveStatus {
    const skipFetch = Boolean(opts?.skipFetch);
    const primed = skipFetch ? null : peekPrimedHeadquartersStatus();
    const skipImmediatePollRef = useRef(primed != null);
    const [status, setStatus] = useState<HeadquartersLiveStatus>(
        () => (skipFetch ? CHECKING_HQ_STATUS : (primed ?? CHECKING_HQ_STATUS)),
    );
    const inflightRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);
    const sessionDeniedRef = useRef(false);

    const refresh = useCallback(async (mode: 'poll' | 'fresh' = 'poll') => {
        if (skipFetch) return;
        if (sessionDeniedRef.current && mode === 'poll') return;
        if (inflightRef.current && mode === 'poll') return;
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        inflightRef.current = true;
        try {
            await waitCsrfOrAbort(ac.signal);
            if (ac.signal.aborted) return;
            const path = mode === 'fresh' ? '/api/admin/status?fresh=1' : '/api/admin/status';
            const data = await SecureAPIClient.fetchSecure<unknown>(path, {
                method: 'GET',
                signal: ac.signal,
            });
            if (ac.signal.aborted) return;
            const parsed = parseHeadquartersLiveStatus(data);
            sessionDeniedRef.current = false;
            setStatus((prev) => {
                if (!parsed.db && prev.fetchedAt) {
                    return {
                        ...prev,
                        system: 'down',
                        stale: true,
                        sessionRequired: false,
                    };
                }
                return markHqStatusFetched(parsed, new Date().toISOString());
            });
        } catch (error) {
            if (abortRef.current !== ac || ac.signal.aborted || isHqAbortError(error)) return;
            const reason = isHqStatusSessionDenied(error) ? 'session' : 'down';
            if (reason === 'session') sessionDeniedRef.current = true;
            setStatus((prev) => markHqStatusFetchFailed(prev, reason));
        } finally {
            if (abortRef.current === ac) inflightRef.current = false;
        }
    }, [skipFetch]);

    useEffect(() => {
        if (skipFetch) {
            sessionDeniedRef.current = false;
            setStatus(CHECKING_HQ_STATUS);
            return;
        }
        if (skipImmediatePollRef.current) {
            skipImmediatePollRef.current = false;
        } else {
            void refresh('poll');
        }
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'hidden') return;
            if (sessionDeniedRef.current) return;
            void refresh('poll');
        }, POLL_MS);
        const onVis = () => {
            if (sessionDeniedRef.current) return;
            if (document.visibilityState === 'visible') void refresh('poll');
        };
        const onMutate = () => {
            void refresh('fresh');
        };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener(HQ_STATUS_REFRESH_EVENT, onMutate);
        return () => {
            abortRef.current?.abort();
            abortRef.current = null;
            inflightRef.current = false;
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener(HQ_STATUS_REFRESH_EVENT, onMutate);
        };
    }, [refresh, skipFetch]);

    return status;
}
