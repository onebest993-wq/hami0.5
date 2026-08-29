import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import { HUB_CONTENT_BUTTON_A11Y } from '../homeHub/homeHubA11y';

type HomeHubTabMoreTriggerProps = {
    count: number;
    onClick: () => void;
    ariaLabel: string;
    testId: string;
    /** inline = سهم جانبي (تبويبات التنبيهات) · dock = سهم للأسفل في شريط سفلي */
    layout?: 'inline' | 'dock';
    onPrefetch?: () => void;
    expanded?: boolean;
    controlsId?: string;
};

export function HomeHubTabMoreTrigger({
    count,
    onClick,
    ariaLabel,
    testId,
    layout = 'inline',
    onPrefetch,
    expanded = false,
    controlsId,
}: HomeHubTabMoreTriggerProps) {
    const press = useScrollSafePress({ onPress: onClick, onPointerDown: onPrefetch });

    if (count <= 0) return null;

    const isDock = layout === 'dock';
    const Icon = isDock ? ChevronDown : ChevronLeft;

    return (
        <button
            type="button"
            className={`hami-hub-tab-more-trigger${isDock ? ' hami-hub-tab-more-trigger--dock' : ''} ${HUB_CONTENT_BUTTON_A11Y}`}
            data-testid={testId}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            aria-controls={controlsId}
            aria-label={ariaLabel}
            onPointerEnter={onPrefetch}
            onFocus={onPrefetch}
            {...press}
        >
            <span className="hami-hub-tab-more-trigger__label">البقية ({count})</span>
            <Icon size={isDock ? 14 : 13} strokeWidth={2.2} className="hami-hub-tab-more-trigger__icon" aria-hidden />
        </button>
    );
}
