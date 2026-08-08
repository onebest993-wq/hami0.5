import { useCallback, useState } from 'react';
import type { SparkShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';
import {
    requestSparkShellOrganizationalReview,
    type SparkShellReviewOutcome,
} from '@/app/spark/audit/requestSparkShellOrganizationalReview';
import type { SparkTextAuditResult } from '@/app/spark/audit/types';

export type UseSparkShellOnDemandReviewState = {
    loading: boolean;
    result: SparkTextAuditResult | null;
    error: string | null;
    requestReview: () => Promise<void>;
    reset: () => void;
};

export function useSparkShellOnDemandReview(
    dossierKey: string | undefined,
    reviewPayload: SparkShellReviewPayload | null | undefined,
): UseSparkShellOnDemandReviewState {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SparkTextAuditResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setLoading(false);
        setResult(null);
        setError(null);
    }, []);

    const requestReview = useCallback(async () => {
        if (!dossierKey || !reviewPayload) {
            setError('افتح إضبارة تحتوي سجلاً كافياً للمراجعة.');
            return;
        }

        setLoading(true);
        setError(null);

        const outcome: SparkShellReviewOutcome = await requestSparkShellOrganizationalReview({
            dossierKey,
            text: reviewPayload.text,
            fieldType: reviewPayload.fieldType,
            caseNo: reviewPayload.caseNo,
            court: reviewPayload.court,
        });

        setLoading(false);

        if (!outcome.ok) {
            setResult(null);
            setError(outcome.message);
            return;
        }

        setResult(outcome.result);
    }, [dossierKey, reviewPayload]);

    return { loading, result, error, requestReview, reset };
}
