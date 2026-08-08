import { ChevronDown, ChevronLeft } from '@/app/components/ui/lucideIcons';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubTabMoreTriggerProps = {
    count: number;
    onClick: () => void;
    ariaLabel: string;
    testId: string;
    /** inline = سهم جانبي (تبويبات التنبيهات) · dock = سهم للأسفل في شريط سفلي */
    layout?: 'inline' | 'dock';
};

export function HomeHubTabMoreTrigger({
    count,
    onClick,
    ariaLabel,
    testId,
    layout = 'inline',
}: HomeHubTabMoreTriggerProps) {
    const press = useScrollSafePress({ onPress: onClick });

    if (count <= 0) return null;

    const isDock = layout === 'dock';
    const Icon = isDock ? ChevronDown : ChevronLeft;

    return (
        <button
            type="button"
            className={`hami-hub-tab-more-trigger${isDock ? ' hami-hub-tab-more-trigger--dock' : ''} ${HUB_CONTENT_BUTTON_A11Y}`}
            data-testid={testId}
            aria-haspopup="dialog"
            aria-label={ariaLabel}
            {...press}
        >
            <span className="hami-hub-tab-more-trigger__label">البقية ({count})</span>
            <Icon size={isDock ? 14 : 13} strokeWidth={2.2} className="hami-hub-tab-more-trigger__icon" aria-hidden />
        </button>
    );
}
