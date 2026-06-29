import { describe, expect, it } from 'vitest';
import {
    clampProfileContactLabel,
    clampProfileContactValue,
    sanitizeProfileActions,
} from '@/app/services/profile/profileContactInputSecurity';
import type { ProfileAction } from '@/app/services/lawyer-cloud';

function action(type: ProfileAction['type'], value: string): ProfileAction {
    return { id: '1', type, label: 'قناة', value };
}

describe('profileContactInputSecurity', () => {
    it('clamps label and value lengths', () => {
        expect(clampProfileContactLabel('x'.repeat(80)).length).toBeLessThanOrEqual(48);
        expect(clampProfileContactValue('y'.repeat(400)).length).toBeLessThanOrEqual(240);
    });

    it('strips control characters from values', () => {
        expect(clampProfileContactValue('07\n123')).toBe('07 123');
    });

    it('sanitizes actions on save', () => {
        const out = sanitizeProfileActions([
            action('whatsapp', ' 0756 '),
            { ...action('email', ''), label: '', value: '' },
        ]);
        expect(out).toHaveLength(1);
        expect(out[0]?.value).toBe('0756');
    });
});
