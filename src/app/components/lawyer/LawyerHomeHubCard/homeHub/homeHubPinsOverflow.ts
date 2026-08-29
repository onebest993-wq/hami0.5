import { HOME_HUB_PINS_VISIBLE_MAX } from '@/app/services/alerts/homeHubPinsVirtual';

export function splitHomeHubPins<T>(pins: T[]): {
    preview: T[];
    overflowCount: number;
    hasOverflow: boolean;
} {
    if (pins.length <= HOME_HUB_PINS_VISIBLE_MAX) {
        return { preview: pins, overflowCount: 0, hasOverflow: false };
    }
    return {
        preview: pins.slice(0, HOME_HUB_PINS_VISIBLE_MAX),
        overflowCount: pins.length - HOME_HUB_PINS_VISIBLE_MAX,
        hasOverflow: true,
    };
}
