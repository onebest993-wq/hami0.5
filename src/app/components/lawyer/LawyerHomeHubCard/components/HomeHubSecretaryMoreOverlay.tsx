import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';
import type { SparkNudge } from '@/app/spark/types';
import { useHomeHubOverlaySheet } from '../hooks/useHomeHubOverlaySheet';
import { HomeHubSecretaryInsightCard } from './HomeHubSecretaryInsightCard';
import { HomeHubOverlaySheetHandle } from './HomeHubOverlaySheetHandle';
import '../homeHubCardFx.css';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubSecretaryMoreOverlayProps = {
    open: boolean;
    nudges: SparkNudge[];
    onClose: () => void;
    onOpenTarget: (targetFileId: string, kind: string) => void;
};

export function HomeHubSecretaryMoreOverlay({
    open,
    nudges,
    onClose,
    onOpenTarget,
}: HomeHubSecretaryMoreOverlayProps) {
    const { requestBack } = useHomeHubOverlaySheet(open, onClose, 'home-hub-secretary-more');

    if (!open || nudges.length === 0) return null;

    const layer = (
        <div
            className="hami-hub-radar-overlay"
            data-testid="home-hub-secretary-more-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`توصيات السكرتير — ${nudges.length} عنصر`}
            dir="rtl"
        >
            <button
                type="button"
                className="hami-hub-radar-overlay__backdrop"
                aria-label="إغلاق قائمة توصيات السكرتير"
                onClick={requestBack}
            />
            <div
                className="hami-hub-radar-overlay__sheet hami-sovereign-glass hami-sovereign-rim"
                data-testid="home-hub-secretary-more-panel"
            >
                <div className="hami-hub-radar-overlay__rim" aria-hidden />
                <HomeHubOverlaySheetHandle enabled={open} onClose={requestBack} />

                <header className="hami-hub-radar-overlay__head">
                    <div className="hami-hub-radar-overlay__head-main">
                        <div className="min-w-0">
                            <p className="hami-hub-radar-overlay__title">السكرتير</p>
                            <p className="hami-hub-radar-overlay__subtitle">
                                كل التوصيات · {nudges.length} عنصر
                            </p>
                        </div>
                    </div>
                    <div className="hami-hub-radar-overlay__head-actions">
                        <span className="hami-hub-radar-overlay__count-badge">{nudges.length}</span>
                        <button
                            type="button"
                            className={`hami-hub-radar-overlay__close ${HUB_CONTENT_BUTTON_A11Y}`}
                            aria-label="إغلاق"
                            onClick={requestBack}
                        >
                            <X size={18} strokeWidth={2.2} aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="hami-hub-radar-overlay__body hami-hub-radar-overlay__body--scroll">
                    <div className="hami-hub-secretary-stack hami-hub-secretary-stack--overlay">
                        {nudges.map((nudge) => {
                            const preferenceScope = nudge.kind.startsWith('calendar.')
                                ? 'home-hub-calendar'
                                : 'home-hub';
                            const summaryKind =
                                nudge.kind === 'home.procedural_attention_summary'
                                    ? 'home.procedural_attention_summary'
                                    : nudge.kind;
                            return (
                                <HomeHubSecretaryInsightCard
                                    key={nudge.id}
                                    nudge={nudge}
                                    summaryKind={summaryKind}
                                    preferenceScope={preferenceScope}
                                    onOpenTarget={(targetFileId) =>
                                        onOpenTarget(targetFileId, nudge.kind)
                                    }
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : null;
}
