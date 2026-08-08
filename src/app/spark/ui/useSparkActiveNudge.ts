import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SparkNudge } from '@/app/spark/types';
import { recordSparkDismiss, recordSparkSnooze } from '@/app/spark/memory/sparkPreferenceStore';

export type UseSparkActiveNudgeParams = {
    disabled?: boolean;
    dossierKey: string;
    active: SparkNudge | null;
};

/** يدير عرض تنبيه واحد مع تجاهل/تأجيل — ويعيد الضبط عند تغيير الإضبارة */
export function useSparkActiveNudge({ disabled = false, dossierKey, active }: UseSparkActiveNudgeParams) {
    const [hiddenId, setHiddenId] = useState<string | null>(null);

    useEffect(() => {
        setHiddenId(null);
    }, [dossierKey]);

    const nudge = useMemo(() => {
        if (disabled || !active || active.id === hiddenId) return null;
        return active;
    }, [active, disabled, hiddenId]);

    const handleLater = useCallback(() => {
        if (!nudge) return;
        recordSparkSnooze(nudge.kind, dossierKey);
        setHiddenId(nudge.id);
    }, [dossierKey, nudge]);

    const handleDismiss = useCallback(() => {
        if (!nudge) return;
        recordSparkDismiss(nudge.kind, dossierKey);
        setHiddenId(nudge.id);
    }, [dossierKey, nudge]);

    const hideAfterFollow = useCallback(() => {
        if (!nudge) return;
        setHiddenId(nudge.id);
    }, [nudge]);

    return { nudge, handleLater, handleDismiss, hideAfterFollow };
}

/** يدير طابور تنبيهات — ينتقل للتالي بعد تجاهل/تأجيل/متابعة */
export function useSparkActiveNudgeFromQueue({
    disabled = false,
    dossierKey,
    queue,
}: {
    disabled?: boolean;
    dossierKey: string;
    queue: SparkNudge[];
}) {
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);

    useEffect(() => {
        setHiddenIds([]);
    }, [dossierKey]);

    const nudge = useMemo(() => {
        if (disabled) return null;
        for (const item of queue) {
            if (!hiddenIds.includes(item.id)) return item;
        }
        return null;
    }, [disabled, hiddenIds, queue]);

    const hideById = useCallback((id: string) => {
        setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, []);

    const handleLater = useCallback(() => {
        if (!nudge) return;
        recordSparkSnooze(nudge.kind, dossierKey);
        hideById(nudge.id);
    }, [dossierKey, hideById, nudge]);

    const handleDismiss = useCallback(() => {
        if (!nudge) return;
        recordSparkDismiss(nudge.kind, dossierKey);
        hideById(nudge.id);
    }, [dossierKey, hideById, nudge]);

    const hideAfterFollow = useCallback(() => {
        if (!nudge) return;
        hideById(nudge.id);
    }, [hideById, nudge]);

    const visibleQueue = useMemo(
        () => queue.filter((item) => !hiddenIds.includes(item.id)),
        [hiddenIds, queue],
    );

    return { nudge, visibleQueue, handleLater, handleDismiss, hideAfterFollow };
}
