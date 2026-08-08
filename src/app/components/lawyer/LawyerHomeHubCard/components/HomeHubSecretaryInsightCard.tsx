import { useCallback, useState } from 'react';
import { Clock3, X } from '@/app/components/ui/lucideIcons';
import type { SparkNudge } from '@/app/spark/types';
import {
    isSparkNudgeSuppressed,
    recordSparkDismiss,
    recordSparkSnooze,
} from '@/app/spark/memory/sparkPreferenceStore';
import {
    compactHomeHubSecretaryActionLabel,
    summarizeHomeHubSecretaryMessage,
} from '../homeHub/summarizeHomeHubSecretaryMessage';

export type HomeHubSecretaryInsightCardProps = {
    nudge: SparkNudge;
    summaryKind: SparkNudge['kind'];
    preferenceScope: string;
    onOpenTarget: (targetFileId: string) => void;
};

const HUB_SEC_ICON_BTN_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export function HomeHubSecretaryInsightCard({
    nudge,
    summaryKind,
    preferenceScope,
    onOpenTarget,
}: HomeHubSecretaryInsightCardProps) {
    const [hiddenId, setHiddenId] = useState<string | null>(null);

    const visible =
        nudge.id !== hiddenId && !isSparkNudgeSuppressed(summaryKind, preferenceScope);

    const handleFollow = useCallback(() => {
        if (!nudge.targetFileId) return;
        onOpenTarget(nudge.targetFileId);
        setHiddenId(nudge.id);
    }, [nudge.id, nudge.targetFileId, onOpenTarget]);

    const handleLater = useCallback(() => {
        recordSparkSnooze(summaryKind, preferenceScope);
        setHiddenId(nudge.id);
    }, [nudge.id, preferenceScope, summaryKind]);

    const handleDismiss = useCallback(() => {
        recordSparkDismiss(summaryKind, preferenceScope);
        setHiddenId(nudge.id);
    }, [nudge.id, preferenceScope, summaryKind]);

    if (!visible) return null;

    const primaryLabel = nudge.action?.label ?? 'فتح';
    const compactActionLabel = compactHomeHubSecretaryActionLabel(primaryLabel);
    const summaryMessage = summarizeHomeHubSecretaryMessage(nudge);

    return (
        <article
            className="hami-hub-sec-card hami-hub-sec-card--compact"
            dir="rtl"
            data-testid={`home-hub-secretary-item-${nudge.id}`}
            aria-label="توصية من السكرتير"
        >
            <p className="hami-hub-sec-card__message">{summaryMessage}</p>
            <div className="hami-hub-sec-card__rail" role="group" aria-label="إجراءات التوصية">
                {nudge.action ? (
                    <button
                        type="button"
                        className="hami-hub-sec-card__primary hami-hub-sec-card__primary--compact"
                        onClick={handleFollow}
                        aria-label={primaryLabel}
                        title={primaryLabel}
                    >
                        {compactActionLabel}
                    </button>
                ) : null}
                <button
                    type="button"
                    className={`hami-hub-sec-card__icon-btn ${HUB_SEC_ICON_BTN_A11Y}`}
                    onClick={handleLater}
                    aria-label="لاحقاً"
                    title="لاحقاً"
                >
                    <Clock3 size={14} strokeWidth={2.2} aria-hidden />
                </button>
                <button
                    type="button"
                    className={`hami-hub-sec-card__icon-btn hami-hub-sec-card__icon-btn--dismiss ${HUB_SEC_ICON_BTN_A11Y}`}
                    onClick={handleDismiss}
                    aria-label="تجاهل"
                    title="تجاهل"
                >
                    <X size={14} strokeWidth={2.4} aria-hidden />
                </button>
            </div>
        </article>
    );
}
