import { useEffect, useState } from 'react';
import { SPARK_LIVE_ANALYSIS_DEBOUNCE_MS } from '@/app/spark/policy/sparkAnalysisPolicy';

/** تأخير قصير قبل إعادة تحليل التماسك أثناء الكتابة في المسودة */
export { SPARK_LIVE_ANALYSIS_DEBOUNCE_MS as SPARK_COHERENCE_DEBOUNCE_MS };

export function useDebouncedValue<T>(
    value: T,
    delayMs = SPARK_LIVE_ANALYSIS_DEBOUNCE_MS,
): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
