import { useMemo } from 'react';
import { Pin, X } from '@/app/components/ui/lucideIcons';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { buildPinFromSecretaryAlert } from '@/app/workspace/buildPinFromSecretaryAlert';
import { inferUrgencyTone } from '../../NeuralAlertsCard/alertCardUtils';
import type { SmartAlert } from '../../NeuralAlertsCard/types';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubAlertRowProps = {
    alert: SmartAlert;
    source: SecretaryAlert;
    onDismiss: (alertId: string) => void;
    onNavigate: (source: SecretaryAlert) => void;
};

export function HomeHubAlertRow({ alert, source, onDismiss, onNavigate }: HomeHubAlertRowProps) {
    const togglePin = useWorkspaceStore((s) => s.togglePin);
    const isPinned = useWorkspaceStore((s) => s.isPinned);
    const pinPayload = useMemo(() => buildPinFromSecretaryAlert(source, alert), [source, alert]);
    const pinned = pinPayload ? isPinned(pinPayload.id, pinPayload.type) : false;
    const tone = inferUrgencyTone(source);
    const toneClass =
        tone === 'critical'
            ? 'hami-hub-alert-row--critical'
            : tone === 'new'
              ? 'hami-hub-alert-row--new'
              : 'hami-hub-alert-row--normal';

    const sectionLabel = alert.sectionLabel ?? 'مساحة العمل';

    return (
        <li
            className={`hami-hub-alert-row ${toneClass} [content-visibility:auto] [contain-intrinsic-size:auto_48px]`}
            dir="rtl"
            data-testid={`home-hub-alert-row-${alert.id}`}
        >
            <button
                type="button"
                dir="rtl"
                onClick={() => onNavigate(source)}
                aria-label={`${alert.title}${alert.timeLabel ? ` — ${alert.timeLabel}` : ''}`}
                className={`hami-hub-alert-row__open ${HUB_CONTENT_BUTTON_A11Y}`}
            >
                <span className="hami-hub-alert-row__headline">
                    <span className="hami-hub-alert-row__title-text">{alert.title}</span>
                    {alert.courtSubtitle ? (
                        <>
                            <span className="hami-hub-alert-row__headline-sep" aria-hidden>·</span>
                            <span className="hami-hub-alert-row__place">{alert.courtSubtitle}</span>
                        </>
                    ) : null}
                </span>
                <span className="hami-hub-alert-row__details">
                    {alert.timeLabel ? (
                        <span className="hami-hub-alert-row__chip">{alert.timeLabel}</span>
                    ) : null}
                    {alert.timeLabel && sectionLabel ? (
                        <span className="hami-hub-alert-row__meta-sep" aria-hidden>·</span>
                    ) : null}
                    <span className="hami-hub-alert-row__source">
                        {sectionLabel}
                    </span>
                </span>
            </button>
            <div className="hami-hub-alert-row__actions">
                {pinPayload ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePin(pinPayload);
                        }}
                        className={`hami-hub-alert-row__action ${pinned ? 'hami-hub-alert-row__action--pinned' : ''} ${HUB_CONTENT_BUTTON_A11Y}`}
                        title={pinned ? 'إلغاء التثبيت' : 'تثبيت في البطاقة العامة'}
                        aria-label={pinned ? 'إلغاء التثبيت' : 'تثبيت في البطاقة العامة'}
                    >
                        <Pin size={12} className={pinned ? 'fill-current' : undefined} aria-hidden />
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(alert.id);
                    }}
                    className={`hami-hub-alert-row__action ${HUB_CONTENT_BUTTON_A11Y}`}
                    title="تجاهل"
                    aria-label="تجاهل التنبيه"
                >
                    <X size={12} strokeWidth={2.1} aria-hidden />
                </button>
            </div>
        </li>
    );
}
