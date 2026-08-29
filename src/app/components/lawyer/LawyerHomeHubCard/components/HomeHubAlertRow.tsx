import { useMemo } from 'react';
import { Pin } from '@/app/components/ui/icons/Pin';
import { X } from '@/app/components/ui/icons/X';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { buildPinFromSecretaryAlert } from '@/app/workspace/buildPinFromSecretaryAlert';
import { inferUrgencyTone } from '../../NeuralAlertsCard/alertCardUtils';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import { HUB_CONTENT_BUTTON_A11Y } from '../homeHub/homeHubA11y';

type HomeHubAlertRowProps = {
    alert: SmartAlert;
    source: SecretaryAlert;
    onDismiss: (alertId: string) => void;
    onNavigate: (source: SecretaryAlert) => void;
    onTogglePin: (item: WorkspacePinnedItem) => void;
    isPinned: (id: string, type: WorkspacePinnedItem['type']) => boolean;
};

export function HomeHubAlertRow({
    alert,
    source,
    onDismiss,
    onNavigate,
    onTogglePin,
    isPinned,
}: HomeHubAlertRowProps) {
    const pinPayload = useMemo(() => buildPinFromSecretaryAlert(source, alert), [source, alert]);
    const pinned = pinPayload ? isPinned(pinPayload.id, pinPayload.type) : false;
    const tone = inferUrgencyTone(source);
    const toneClass =
        tone === 'critical' ? 'hami-hub-alert-row--critical' : 'hami-hub-alert-row--normal';

    const sectionLabel = alert.sectionLabel ?? 'مساحة العمل';
    const openPress = useScrollSafePress({
        onPress: () => onNavigate(source),
    });
    const pinPress = useScrollSafePress({
        onPress: () => {
            if (pinPayload) onTogglePin(pinPayload);
        },
    });
    const dismissPress = useScrollSafePress({
        onPress: () => onDismiss(alert.id),
    });

    return (
        <li
            className={`hami-hub-alert-row ${toneClass} [content-visibility:auto] [contain-intrinsic-size:auto_52px]`}
            dir="rtl"
            data-testid={`home-hub-alert-row-${alert.id}`}
        >
            <button
                type="button"
                dir="rtl"
                aria-label={`${alert.title}${alert.timeLabel ? ` — ${alert.timeLabel}` : ''}`}
                className={`hami-hub-alert-row__open ${HUB_CONTENT_BUTTON_A11Y}`}
                {...openPress}
            >
                <span className="hami-hub-alert-row__headline">
                    <span className="hami-hub-alert-row__title-text">{alert.title}</span>
                    {alert.courtSubtitle ? (
                        <>
                            <span className="hami-hub-alert-row__headline-sep" aria-hidden>
                                ·
                            </span>
                            <span className="hami-hub-alert-row__place">{alert.courtSubtitle}</span>
                        </>
                    ) : null}
                </span>
                <span className="hami-hub-alert-row__details">
                    {alert.timeLabel ? (
                        <span className="hami-hub-alert-row__chip">{alert.timeLabel}</span>
                    ) : null}
                    {alert.timeLabel && sectionLabel ? (
                        <span className="hami-hub-alert-row__meta-sep" aria-hidden>
                            ·
                        </span>
                    ) : null}
                    <span className="hami-hub-alert-row__source">{sectionLabel}</span>
                </span>
            </button>
            <div className="hami-hub-alert-row__actions">
                {pinPayload ? (
                    <button
                        type="button"
                        className={`hami-hub-alert-row__action ${pinned ? 'hami-hub-alert-row__action--pinned' : ''} ${HUB_CONTENT_BUTTON_A11Y}`}
                        title={pinned ? 'إلغاء التثبيت' : 'تثبيت في البطاقة العامة'}
                        aria-label={
                            pinned
                                ? `إلغاء تثبيت ${alert.title}`
                                : `تثبيت ${alert.title} في البطاقة العامة`
                        }
                        aria-pressed={pinned}
                        {...pinPress}
                    >
                        <Pin size={12} className={pinned ? 'fill-current' : undefined} aria-hidden />
                    </button>
                ) : null}
                <button
                    type="button"
                    className={`hami-hub-alert-row__action ${HUB_CONTENT_BUTTON_A11Y}`}
                    title="تجاهل"
                    aria-label={`تجاهل ${alert.title}`}
                    {...dismissPress}
                >
                    <X size={12} strokeWidth={2.1} aria-hidden />
                </button>
            </div>
        </li>
    );
}
