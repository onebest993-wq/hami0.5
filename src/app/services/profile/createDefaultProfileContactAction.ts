import type { ProfileAction } from '@/app/services/lawyer-cloud';

const DEFAULT_LABELS: Record<ProfileAction['type'], string> = {
    call: 'هاتف',
    email: 'بريد',
    website: 'موقع ويب',
    location: 'الموقع',
};

/** قناة تواصل افتراضية في مسودة التحرير */
export function createDefaultProfileContactAction(type: ProfileAction['type']): ProfileAction {
    return {
        id: `a-${Date.now()}`,
        type,
        label: DEFAULT_LABELS[type],
        value: '',
        ...(type === 'location' ? { locationMode: 'manual' as const } : {}),
    };
}
