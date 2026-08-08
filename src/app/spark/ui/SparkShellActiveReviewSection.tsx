import type { SparkTextAuditResult } from '@/app/spark/audit/types';
import { isSparkTextAuditEnabled } from '@/app/spark/audit/sparkAuditConfig';
import type { SparkShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';
import { useSparkShellOnDemandReview } from '@/app/spark/shell/useSparkShellOnDemandReview';

export type SparkShellActiveReviewSectionProps = {
    dossierKey?: string;
    reviewPayload?: SparkShellReviewPayload | null;
};

function ReviewResultCard({ result }: { result: SparkTextAuditResult }) {
    return (
        <div
            className="rounded-xl border border-[#E6C673]/15 bg-[#E6C673]/5 px-3 py-3 text-[11px] leading-relaxed text-white/80"
            data-testid="spark-shell-review-result"
        >
            <p className="font-medium text-[#E6C673]/90">{result.summary || 'نتيجة المراجعة'}</p>
            {result.present.length ? (
                <p className="mt-2 text-white/55">
                    <span className="text-white/70">موجود: </span>
                    {result.present.join(' · ')}
                </p>
            ) : null}
            {result.missing.length ? (
                <p className="mt-1 text-white/55">
                    <span className="text-white/70">قد يكون غير مذكور: </span>
                    {result.missing.join(' · ')}
                </p>
            ) : null}
        </div>
    );
}

export function SparkShellActiveReviewSection({
    dossierKey,
    reviewPayload,
}: SparkShellActiveReviewSectionProps) {
    const auditEnabled = isSparkTextAuditEnabled();
    const { loading, result, error, requestReview } = useSparkShellOnDemandReview(
        dossierKey,
        reviewPayload,
    );

    if (!auditEnabled) {
        return (
            <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-[10px] leading-relaxed text-white/45">
                المراجعة التنظيمية عند الطلب غير مفعّلة — فعّل VITE_SPARK_TEXT_AUDIT_ENABLED وانشر
                spark-text-audit.
            </p>
        );
    }

    if (!reviewPayload) {
        return (
            <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-[10px] leading-relaxed text-white/45">
                افتح إضبارة تحتوي سجلاً أو ملاحظات كافية لطلب مراجعة تنظيمية.
            </p>
        );
    }

    return (
        <div className="mt-3 space-y-2" data-testid="spark-shell-active-review">
            <button
                type="button"
                onClick={() => void requestReview()}
                disabled={loading}
                className="min-h-[44px] w-full touch-manipulation rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 px-3 py-2 text-[11px] font-bold text-[#E6C673] disabled:opacity-60"
            >
                {loading ? 'جاري المراجعة…' : 'طلب مراجعة تنظيمية'}
            </button>

            {error ? (
                <p className="text-[10px] leading-relaxed text-amber-300/85" role="alert">
                    {error}
                </p>
            ) : null}

            {result ? <ReviewResultCard result={result} /> : null}
        </div>
    );
}
